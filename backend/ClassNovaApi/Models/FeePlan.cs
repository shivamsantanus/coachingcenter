namespace ClassNovaApi.Models
{
    public class FeePlan
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? BatchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // TUITION, ADMISSION, EXAM, TRANSPORT
        public decimal Amount { get; set; }
        public string Frequency { get; set; } = string.Empty; // MONTHLY, QUARTERLY, ONE_TIME
        public short? DueDay { get; set; }
        public bool IsActive { get; set; } = true;
        public string? SystemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public Batch? Batch { get; set; }
    }
}
