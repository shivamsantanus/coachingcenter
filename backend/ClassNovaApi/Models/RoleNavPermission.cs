namespace ClassNovaApi.Models
{
    public class RoleNavPermission
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string RoleCode { get; set; } = string.Empty;
        public string NavItemKey { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
