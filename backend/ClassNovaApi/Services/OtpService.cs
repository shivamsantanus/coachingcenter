using System.Security.Cryptography;
using System.Text;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassNovaApi.Services
{
    public class OtpService
    {
        private const int OtpExpiryMinutes   = 15;
        private const int MaxAttempts        = 5;
        private const int MaxSendsPerHour    = 3;
        private const int ResendCooldownSecs = 60;

        private readonly AppDbContext  _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<OtpService> _logger;

        public OtpService(AppDbContext context, IEmailService emailService, ILogger<OtpService> logger)
        {
            _context      = context;
            _emailService = emailService;
            _logger       = logger;
        }

        // Called from Register — OTP data stored on the pending record itself
        public async Task IssueOtpAsync(PendingRegistration pending)
        {
            var otp  = GenerateOtp();
            var salt = GenerateSalt();

            pending.OtpHash   = HashOtp(otp, salt);
            pending.OtpSalt   = salt;
            pending.ExpiresAt = DateTime.UtcNow.AddMinutes(OtpExpiryMinutes);

            await _context.SaveChangesAsync();
            await _emailService.SendOtpAsync(pending.Email, pending.FullName, otp);
        }

        // Called from VerifyEmail — verifies OTP then promotes pending → real user
        public async Task<(bool success, string error)> VerifyAndPromoteAsync(
            string email, string tenantSlug, string submittedOtp)
        {
            var pending = await _context.PendingRegistrations
                .Include(pr => pr.Tenant)
                .Include(pr => pr.Role)
                .FirstOrDefaultAsync(pr =>
                    pr.Email == email &&
                    pr.Tenant.Slug == tenantSlug.ToLower());

            if (pending == null)
                return (false, "No pending registration found. Please sign up again.");

            if (DateTime.UtcNow > pending.ExpiresAt)
            {
                _context.PendingRegistrations.Remove(pending);
                await _context.SaveChangesAsync();
                return (false, "OTP has expired. Please sign up again.");
            }

            if (pending.AttemptCount >= MaxAttempts)
            {
                _context.PendingRegistrations.Remove(pending);
                await _context.SaveChangesAsync();
                return (false, "Too many failed attempts. Please sign up again.");
            }

            if (HashOtp(submittedOtp, pending.OtpSalt) != pending.OtpHash)
            {
                pending.AttemptCount++;
                await _context.SaveChangesAsync();

                var remaining = MaxAttempts - pending.AttemptCount;
                return (false, $"Invalid OTP. {remaining} attempt{(remaining == 1 ? "" : "s")} remaining.");
            }

            // OTP valid — promote to real verified user
            var now    = DateTime.UtcNow;
            var userId = Guid.NewGuid();

            var user = new User
            {
                Id              = userId,
                FullName        = pending.FullName,
                Email           = pending.Email,
                PasswordHash    = pending.PasswordHash,
                IsActive        = true,
                IsEmailVerified = true,
                CreatedAt       = now,
                UpdatedAt       = now
            };

            var tenantUserRole = new TenantUserRole
            {
                Id       = Guid.NewGuid(),
                TenantId = pending.TenantId,
                UserId   = userId,
                RoleId   = pending.RoleId,
                Status   = "ACTIVE"
            };

            _context.Users.Add(user);
            _context.TenantUserRoles.Add(tenantUserRole);
            _context.PendingRegistrations.Remove(pending);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User promoted from pending registration. Email: {Email}", email);
            return (true, string.Empty);
        }

        // Called from ResendOtp — reissues a fresh OTP on the same pending record
        public async Task<(bool success, string error)> ResendOtpAsync(string email, string tenantSlug)
        {
            var pending = await _context.PendingRegistrations
                .Include(pr => pr.Tenant)
                .FirstOrDefaultAsync(pr =>
                    pr.Email == email &&
                    pr.Tenant.Slug == tenantSlug.ToLower());

            // Return success shape regardless — never reveal whether email is registered
            if (pending == null)
                return (true, string.Empty);

            var now = DateTime.UtcNow;

            if ((now - pending.LastSentAt).TotalSeconds < ResendCooldownSecs)
                return (false, "Please wait before requesting another OTP.");

            if (pending.SendCount >= MaxSendsPerHour &&
                (now - pending.CreatedAt).TotalHours < 1)
                return (false, "Too many OTP requests. Please try again later.");

            var otp  = GenerateOtp();
            var salt = GenerateSalt();

            pending.OtpHash      = HashOtp(otp, salt);
            pending.OtpSalt      = salt;
            pending.ExpiresAt    = now.AddMinutes(OtpExpiryMinutes);
            pending.AttemptCount = 0;
            pending.SendCount++;
            pending.LastSentAt   = now;

            await _context.SaveChangesAsync();
            await _emailService.SendOtpAsync(pending.Email, pending.FullName, otp);

            return (true, string.Empty);
        }

        private static string GenerateOtp()
        {
            var bytes = new byte[4];
            RandomNumberGenerator.Fill(bytes);
            var value = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 1_000_000;
            return value.ToString("D6");
        }

        private static string GenerateSalt()
            => Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));

        private static string HashOtp(string otp, string salt)
        {
            var input = Encoding.UTF8.GetBytes(salt + otp);
            return Convert.ToHexString(SHA256.HashData(input)).ToLowerInvariant();
        }
    }
}
