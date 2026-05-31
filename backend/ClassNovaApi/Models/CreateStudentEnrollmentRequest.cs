using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateStudentEnrollmentRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        public Guid? ClassId { get; set; }

        public Guid? BatchId { get; set; }

        /// <summary>Defaults to today (UTC) if not supplied.</summary>
        public DateOnly? EnrolledOn { get; set; }
    }
}
