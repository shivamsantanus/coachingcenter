namespace ClassNovaApi.Models
{
    public class Exam
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid AcademicYearId { get; set; }
        public Guid BatchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ExamType { get; set; } = string.Empty; // UNIT_TEST, MID_TERM, FINAL
        public DateOnly? ExamDate { get; set; }
        public string Status { get; set; } = string.Empty; // DRAFT, OPEN, PUBLISHED
        public string? SystemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public AcademicYear AcademicYear { get; set; } = null!;
        public Batch Batch { get; set; } = null!;
        public ICollection<ExamSubject> ExamSubjects { get; set; } = [];
    }
}
