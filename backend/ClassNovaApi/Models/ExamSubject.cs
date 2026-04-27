namespace ClassNovaApi.Models
{
    public class ExamSubject
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid ExamId { get; set; }
        public Guid SubjectId { get; set; }
        public int MaxMarks { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Exam Exam { get; set; } = null!;
        public Subject Subject { get; set; } = null!;
        public ICollection<Mark> Marks { get; set; } = [];
    }
}
