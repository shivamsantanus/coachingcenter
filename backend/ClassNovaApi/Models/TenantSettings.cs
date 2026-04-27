namespace ClassNovaApi.Models
{
    public class TenantSettings
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string BrandName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public string Timezone { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;
        public string? AcademicLabelClass { get; set; }
        public string? AcademicLabelBatch { get; set; }
        public string? AcademicLabelSection { get; set; }
        public string? DefaultAttendanceMode { get; set; }
        public string? DefaultGradingMode { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
