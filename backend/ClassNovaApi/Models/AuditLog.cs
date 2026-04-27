namespace ClassNovaApi.Models
{
    public class AuditLog
    {
        public Guid Id { get; set; }
        public Guid? TenantId { get; set; }
        public Guid? UserId { get; set; }
        public string EntityName { get; set; } = string.Empty;
        public Guid? EntityId { get; set; }
        public string Action { get; set; } = string.Empty; // CREATE, UPDATE, DELETE, LOGIN
        public string? MetadataJson { get; set; }
        public DateTime CreatedAt { get; set; }

        public Tenant? Tenant { get; set; }
        public User? User { get; set; }
    }
}
