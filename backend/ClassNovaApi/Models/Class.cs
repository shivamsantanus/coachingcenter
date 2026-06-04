namespace ClassNovaApi.Models
{
    public class Class
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid AcademicYearId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int? SortOrder { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? SystemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public AcademicYear AcademicYear { get; set; } = null!;
        public ICollection<Batch> Batches { get; set; } = [];
    }
}
