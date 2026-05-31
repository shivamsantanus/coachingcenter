using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateBatchRequest
    {
        [Required]
        public Guid AcademicYearId { get; set; }

        public Guid? ClassId { get; set; }

        public Guid? BranchId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public DateOnly? StartDate { get; set; }

        public DateOnly? EndDate { get; set; }

        public TimeOnly? StartTime { get; set; }

        public TimeOnly? EndTime { get; set; }
    }
}
