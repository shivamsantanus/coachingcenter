namespace ClassNovaApi.Models
{
    public class Mark
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid ExamSubjectId { get; set; }
        public Guid StudentId { get; set; }
        public decimal MarksObtained { get; set; }
        public string? Remarks { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public ExamSubject ExamSubject { get; set; } = null!;
        public Student Student { get; set; } = null!;
    }
}
