namespace ClassNovaApi.Models
{
    public class PendingRegistration
    {
        public Guid Id             { get; set; }
        public string FullName     { get; set; } = string.Empty;
        public string Email        { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public Guid TenantId       { get; set; }
        public Guid RoleId         { get; set; }

        // SHA-256(OtpSalt + plainOtp)
        public string OtpHash      { get; set; } = string.Empty;
        public string OtpSalt      { get; set; } = string.Empty;

        public DateTime ExpiresAt  { get; set; }
        public int AttemptCount    { get; set; }
        public int SendCount       { get; set; }
        public DateTime LastSentAt { get; set; }
        public DateTime CreatedAt  { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Role   Role   { get; set; } = null!;
    }
}
