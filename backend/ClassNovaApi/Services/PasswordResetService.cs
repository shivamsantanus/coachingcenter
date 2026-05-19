using System.Security.Cryptography;
using System.Text;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassNovaApi.Services
{
    public class PasswordResetService
    {
        private const int OtpExpiryMinutes   = 15;
        private const int MaxAttempts        = 5;
        private const int MaxSendsPerHour    = 3;
        private const int ResendCooldownSecs = 60;

        private readonly AppDbContext  _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<PasswordResetService> _logger;

        public PasswordResetService(
            AppDbContext context,
            IEmailService emailService,
            ILogger<PasswordResetService> logger)
        {
            _context      = context;
            _emailService = emailService;
            _logger       = logger;
        }

        // Called from ForgotPassword — returns false with message when account not found
        public async Task<(bool success, string error)> IssueResetOtpAsync(string email, string tenantSlug)
        {
            const string notFound = "No account found with those details.";

            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == tenantSlug.ToLower());

            if (tenant == null || tenant.Status != "ACTIVE")
                return (false, notFound);

            var user = await _context.Users
                .FirstOrDefaultAsync(u =>
                    u.Email == email &&
                    u.IsEmailVerified &&
                    u.IsActive);

            if (user == null)
                return (false, notFound);

            // Confirm the user actually belongs to this tenant
            var hasRole = await _context.TenantUserRoles
                .AnyAsync(tur =>
                    tur.UserId   == user.Id   &&
                    tur.TenantId == tenant.Id &&
                    tur.Status   == "ACTIVE");

            if (!hasRole)
                return (false, notFound);

            // Replace any previous reset request for this user+tenant
            var existing = await _context.PasswordResetOtps
                .FirstOrDefaultAsync(pr =>
                    pr.Email    == email &&
                    pr.TenantId == tenant.Id);

            if (existing != null)
                _context.PasswordResetOtps.Remove(existing);

            var now = DateTime.UtcNow;
            var resetOtp = new PasswordResetOtp
            {
                Id         = Guid.NewGuid(),
                Email      = email,
                UserId     = user.Id,
                TenantId   = tenant.Id,
                ExpiresAt  = now.AddMinutes(OtpExpiryMinutes),
                SendCount  = 1,
                LastSentAt = now,
                CreatedAt  = now
            };

            var otp  = GenerateOtp();
            var salt = GenerateSalt();
            resetOtp.OtpHash = HashOtp(otp, salt);
            resetOtp.OtpSalt = salt;

            _context.PasswordResetOtps.Add(resetOtp);
            await _context.SaveChangesAsync();

            await _emailService.SendPasswordResetOtpAsync(email, user.FullName, otp);

            _logger.LogInformation("Password reset OTP issued. Email: {Email}, Tenant: {Slug}",
                email, tenantSlug);

            return (true, string.Empty);
        }

        // Called from ResetPassword — verifies OTP then updates the user's password hash
        public async Task<(bool success, string error)> VerifyAndResetAsync(
            string email, string tenantSlug, string submittedOtp, string newPassword)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == tenantSlug.ToLower());

            if (tenant == null)
                return (false, "Invalid or expired OTP.");

            var resetOtp = await _context.PasswordResetOtps
                .FirstOrDefaultAsync(pr =>
                    pr.Email    == email &&
                    pr.TenantId == tenant.Id);

            if (resetOtp == null)
                return (false, "Invalid or expired OTP.");

            if (DateTime.UtcNow > resetOtp.ExpiresAt)
            {
                _context.PasswordResetOtps.Remove(resetOtp);
                await _context.SaveChangesAsync();
                return (false, "Invalid or expired OTP.");
            }

            if (resetOtp.AttemptCount >= MaxAttempts)
            {
                _context.PasswordResetOtps.Remove(resetOtp);
                await _context.SaveChangesAsync();
                return (false, "Too many failed attempts. Please request a new code.");
            }

            if (HashOtp(submittedOtp, resetOtp.OtpSalt) != resetOtp.OtpHash)
            {
                resetOtp.AttemptCount++;
                await _context.SaveChangesAsync();

                var remaining = MaxAttempts - resetOtp.AttemptCount;
                return (false, $"Invalid OTP. {remaining} attempt{(remaining == 1 ? "" : "s")} remaining.");
            }

            // OTP valid — update password and remove the reset record atomically
            var user = await _context.Users.FindAsync(resetOtp.UserId);
            if (user == null)
            {
                _context.PasswordResetOtps.Remove(resetOtp);
                await _context.SaveChangesAsync();
                return (false, "Invalid or expired OTP.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.UpdatedAt    = DateTime.UtcNow;
            _context.PasswordResetOtps.Remove(resetOtp);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password reset completed. Email: {Email}, Tenant: {Slug}",
                email, tenantSlug);

            return (true, string.Empty);
        }

        // Called from ResendResetOtp — rate-limited resend
        public async Task<(bool success, string error)> ResendResetOtpAsync(
            string email, string tenantSlug)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == tenantSlug.ToLower());

            // Anti-enumeration: return success if no record found
            if (tenant == null)
                return (true, string.Empty);

            var resetOtp = await _context.PasswordResetOtps
                .FirstOrDefaultAsync(pr =>
                    pr.Email    == email &&
                    pr.TenantId == tenant.Id);

            if (resetOtp == null)
                return (true, string.Empty);

            var now = DateTime.UtcNow;

            if ((now - resetOtp.LastSentAt).TotalSeconds < ResendCooldownSecs)
                return (false, "Please wait before requesting another OTP.");

            if (resetOtp.SendCount >= MaxSendsPerHour &&
                (now - resetOtp.CreatedAt).TotalHours < 1)
                return (false, "Too many OTP requests. Please try again later.");

            var user = await _context.Users.FindAsync(resetOtp.UserId);
            if (user == null)
                return (true, string.Empty);

            var otp  = GenerateOtp();
            var salt = GenerateSalt();

            resetOtp.OtpHash      = HashOtp(otp, salt);
            resetOtp.OtpSalt      = salt;
            resetOtp.ExpiresAt    = now.AddMinutes(OtpExpiryMinutes);
            resetOtp.AttemptCount = 0;
            resetOtp.SendCount++;
            resetOtp.LastSentAt   = now;

            await _context.SaveChangesAsync();
            await _emailService.SendPasswordResetOtpAsync(email, user.FullName, otp);

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
