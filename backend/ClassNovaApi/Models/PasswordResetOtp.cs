namespace ClassNovaApi.Models
{
    public class PasswordResetOtp
    {
        public Guid   Id           { get; set; }
        public string Email        { get; set; } = string.Empty;
        public Guid   UserId       { get; set; }
        public Guid   TenantId     { get; set; }

        // SHA-256(OtpSalt + plainOtp)
        public string OtpHash      { get; set; } = string.Empty;
        public string OtpSalt      { get; set; } = string.Empty;

        public DateTime ExpiresAt  { get; set; }
        public int  AttemptCount   { get; set; }
        public int  SendCount      { get; set; }
        public DateTime LastSentAt { get; set; }
        public DateTime CreatedAt  { get; set; }

        public User   User         { get; set; } = null!;
        public Tenant Tenant       { get; set; } = null!;
    }
}
