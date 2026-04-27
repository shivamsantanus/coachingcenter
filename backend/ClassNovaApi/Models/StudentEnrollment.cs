namespace ClassNovaApi.Models
{
    public class StudentEnrollment
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid StudentId { get; set; }
        public Guid? ClassId { get; set; }
        public Guid? BatchId { get; set; }
        public DateOnly EnrolledOn { get; set; }
        public bool IsActive { get; set; } = true;

        public Tenant Tenant { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public Class? Class { get; set; }
        public Batch? Batch { get; set; }
    }
}
