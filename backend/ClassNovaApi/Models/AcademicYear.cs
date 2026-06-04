namespace ClassNovaApi.Models
{
    public class AcademicYear
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. 2026-2027
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public bool IsActive { get; set; } = false;
        public string? SystemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ICollection<Class> Classes { get; set; } = [];
        public ICollection<Batch> Batches { get; set; } = [];
    }
}
