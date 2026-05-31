using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateClassRequest
    {
        [Required]
        public Guid AcademicYearId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int? SortOrder { get; set; }

        public Guid? BranchId { get; set; }
    }
}
