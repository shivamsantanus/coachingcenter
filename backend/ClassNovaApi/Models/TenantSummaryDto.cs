namespace ClassNovaApi.Models
{
    public class TenantSummaryDto
    {
        public Guid   Id                   { get; set; }
        public string Name                 { get; set; } = string.Empty;
        public string Slug                 { get; set; } = string.Empty;
        public string OrganizationType     { get; set; } = string.Empty;
        public string Status               { get; set; } = string.Empty;
        public string PrimaryContactName   { get; set; } = string.Empty;
        public string PrimaryContactEmail  { get; set; } = string.Empty;
        public string? PlanCode            { get; set; }
        public DateTime CreatedAt          { get; set; }
    }
}
