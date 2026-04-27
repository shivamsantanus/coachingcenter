namespace ClassNovaApi.Models
{
    public class TenantFeature
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string FeatureKey { get; set; } = string.Empty; // FEES, EXAMS, ATTENDANCE, PARENTS_PORTAL
        public bool IsEnabled { get; set; } = true;

        public Tenant Tenant { get; set; } = null!;
    }
}
