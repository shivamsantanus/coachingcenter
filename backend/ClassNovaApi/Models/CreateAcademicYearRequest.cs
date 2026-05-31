using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateAcademicYearRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }
    }
}
