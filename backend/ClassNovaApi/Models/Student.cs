namespace ClassNovaApi.Models
{
    public class Student
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid? UserId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public DateOnly? DateOfBirth { get; set; }
        public string Status { get; set; } = string.Empty; // ACTIVE, INACTIVE
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public User? User { get; set; }
    }
}
