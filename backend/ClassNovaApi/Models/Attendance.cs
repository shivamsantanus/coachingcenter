namespace ClassNovaApi.Models
{
    public class Attendance
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid BatchId { get; set; }
        public Guid StudentId { get; set; }
        public DateOnly Date { get; set; }
        public string Status { get; set; } = "PRESENT";
        public Guid MarkedById { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Batch Batch { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public User MarkedBy { get; set; } = null!;
    }
}
