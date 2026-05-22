namespace ClassNovaApi.Models
{
    public class Tenant
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string OrganizationType { get; set; } = string.Empty; // SCHOOL, COACHING_CENTRE, ACADEMY
        public string Status { get; set; } = string.Empty; // ACTIVE, SUSPENDED, TRIAL
        public string PrimaryContactName { get; set; } = string.Empty;
        public string PrimaryContactEmail { get; set; } = string.Empty;
        public string PrimaryContactPhone { get; set; } = string.Empty;
        public string? PlanCode { get; set; }
        public string? CustomDomain { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public TenantSettings? Settings { get; set; }
        public ICollection<TenantFeature> Features { get; set; } = [];
        public ICollection<Branch> Branches { get; set; } = [];
        public ICollection<TenantUserRole> UserRoles { get; set; } = [];
    }
}
