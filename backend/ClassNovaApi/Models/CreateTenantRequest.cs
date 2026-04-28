namespace ClassNovaApi.Models
{
    public class CreateTenantRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string OrganizationType { get; set; } = string.Empty; // SCHOOL, COACHING_CENTRE, ACADEMY
        public string PrimaryContactName { get; set; } = string.Empty;
        public string PrimaryContactEmail { get; set; } = string.Empty;
        public string PrimaryContactPhone { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string Timezone { get; set; } = "Asia/Kolkata";
        public string CurrencyCode { get; set; } = "INR";
    }
}
