namespace ClassNovaApi.Models
{
    public class BatchSubjectTeacher
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid BatchId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid TeacherId { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Batch Batch { get; set; } = null!;
        public Subject Subject { get; set; } = null!;
        public Teacher Teacher { get; set; } = null!;
    }
}
