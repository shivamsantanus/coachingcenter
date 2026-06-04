using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateTeacherRequest
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string EmployeeCode { get; set; } = string.Empty;

        public string? Qualification { get; set; }
        public string? SalaryType { get; set; }
        public Guid? BranchId { get; set; }
    }
}
