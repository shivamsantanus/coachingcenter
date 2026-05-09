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

        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<OtpService> _logger;

        public OtpService(AppDbContext context, IEmailService emailService, ILogger<OtpService> logger)
        {
            _context      = context;
            _emailService = emailService;
            _logger       = logger;
        }

        public async Task IssueOtpAsync(User user)
        {
            var existing = await _context.EmailVerifications
                .FirstOrDefaultAsync(ev => ev.UserId == user.Id);

            if (existing != null)
                _context.EmailVerifications.Remove(existing);

            var otp  = GenerateOtp();
            var salt = GenerateSalt();
            var now  = DateTime.UtcNow;

            var record = new EmailVerification
            {
                Id           = Guid.NewGuid(),
                UserId       = user.Id,
                OtpHash      = HashOtp(otp, salt),
                OtpSalt      = salt,
                ExpiresAt    = now.AddMinutes(OtpExpiryMinutes),
                AttemptCount = 0,
                SendCount    = 1,
                LastSentAt   = now,
                CreatedAt    = now
            };

            _context.EmailVerifications.Add(record);
            await _context.SaveChangesAsync();

            await _emailService.SendOtpAsync(user.Email!, user.FullName, otp);
        }

        public async Task<(bool success, string error, int remainingAttempts)> VerifyOtpAsync(
            Guid userId, string submittedOtp)
        {
            var record = await _context.EmailVerifications
                .FirstOrDefaultAsync(ev => ev.UserId == userId);

            if (record == null)
                return (false, "No pending verification found. Please request a new OTP.", 0);

            if (DateTime.UtcNow > record.ExpiresAt)
            {
                _context.EmailVerifications.Remove(record);
                await _context.SaveChangesAsync();
                return (false, "OTP has expired. Please request a new one.", 0);
            }

            if (record.AttemptCount >= MaxAttempts)
            {
                _context.EmailVerifications.Remove(record);
                await _context.SaveChangesAsync();
                return (false, "Too many failed attempts. Please request a new OTP.", 0);
            }

            var hash = HashOtp(submittedOtp, record.OtpSalt);
            if (hash != record.OtpHash)
            {
                record.AttemptCount++;
                await _context.SaveChangesAsync();

                var remaining = MaxAttempts - record.AttemptCount;
                return (false, $"Invalid OTP. {remaining} attempt{(remaining == 1 ? "" : "s")} remaining.", remaining);
            }

            // Valid — mark verified and clean up
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.IsEmailVerified = true;
                user.UpdatedAt = DateTime.UtcNow;
            }

            _context.EmailVerifications.Remove(record);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Email verified for user {UserId}", userId);
            return (true, string.Empty, 0);
        }

        public async Task<(bool success, string error)> ResendOtpAsync(User user)
        {
            var existing = await _context.EmailVerifications
                .FirstOrDefaultAsync(ev => ev.UserId == user.Id);

            var now = DateTime.UtcNow;

            if (existing != null)
            {
                // Enforce per-resend cooldown
                if ((now - existing.LastSentAt).TotalSeconds < ResendCooldownSecs)
                    return (false, "Please wait before requesting another OTP.");

                // Enforce hourly send limit
                if (existing.SendCount >= MaxSendsPerHour &&
                    (now - existing.CreatedAt).TotalHours < 1)
                    return (false, "Too many OTP requests. Please try again later.");

                // Reissue with fresh OTP and expiry
                var otp  = GenerateOtp();
                var salt = GenerateSalt();

                existing.OtpHash      = HashOtp(otp, salt);
                existing.OtpSalt      = salt;
                existing.ExpiresAt    = now.AddMinutes(OtpExpiryMinutes);
                existing.AttemptCount = 0;
                existing.SendCount++;
                existing.LastSentAt   = now;

                await _context.SaveChangesAsync();
                await _emailService.SendOtpAsync(user.Email!, user.FullName, otp);
            }
            else
            {
                await IssueOtpAsync(user);
            }

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
