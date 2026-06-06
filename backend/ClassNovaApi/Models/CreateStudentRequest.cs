using System.ComponentModel.DataAnnotations;


namespace ClassNovaApi.Models
{
    public class CreateStudentRequest
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string AdmissionNo { get; set; } = string.Empty;

        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        [MaxLength(200)]
        public string? SchoolName { get; set; }
        public Guid? BranchId { get; set; }
    }
}
