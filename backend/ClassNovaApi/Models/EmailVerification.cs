namespace ClassNovaApi.Models
{
    public class EmailVerification
    {
        public Guid Id            { get; set; }
        public Guid UserId        { get; set; }

        // SHA-256(OtpSalt + plainOtp) — never store the OTP itself
        public string OtpHash     { get; set; } = string.Empty;

        // Random 16-byte base64 salt, generated fresh per OTP issue
        public string OtpSalt     { get; set; } = string.Empty;

        public DateTime ExpiresAt  { get; set; }
        public int AttemptCount   { get; set; }
        public int SendCount      { get; set; }
        public DateTime LastSentAt { get; set; }
        public DateTime CreatedAt  { get; set; }

        public User User { get; set; } = null!;
    }
}
