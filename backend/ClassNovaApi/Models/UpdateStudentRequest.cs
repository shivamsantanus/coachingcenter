namespace ClassNovaApi.Models
{
    public class UpdateStudentRequest
    {
        public string? FullName { get; set; }
        public string? AdmissionNo { get; set; }
        public string? GuardianName { get; set; }
        public string? GuardianPhone { get; set; }
        public string? Address { get; set; }
        public DateOnly? DateOfBirth { get; set; }
        public string? SchoolName { get; set; }
        public Guid? BranchId { get; set; }
    }
}
