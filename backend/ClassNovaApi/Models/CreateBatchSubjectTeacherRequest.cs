using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateBatchSubjectTeacherRequest
    {
        [Required]
        public Guid BatchId { get; set; }

        [Required]
        public Guid SubjectId { get; set; }

        [Required]
        public Guid TeacherId { get; set; }
    }
}
