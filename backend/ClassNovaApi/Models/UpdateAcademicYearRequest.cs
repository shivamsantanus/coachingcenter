using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateAcademicYearRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }
        public DateOnly? StartDate { get; set; }
        public DateOnly? EndDate { get; set; }
    }
}
