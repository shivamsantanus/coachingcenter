using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateBatchRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        public Guid? ClassId { get; set; }

        public DateOnly? StartDate { get; set; }

        public DateOnly? EndDate { get; set; }

        public TimeOnly? StartTime { get; set; }

        public TimeOnly? EndTime { get; set; }

        public Guid? BranchId { get; set; }
    }
}
