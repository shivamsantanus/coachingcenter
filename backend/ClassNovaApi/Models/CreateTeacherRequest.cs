namespace ClassNovaApi.Models
{
    public class CreateTeacherRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string? Qualification { get; set; }
        public string? SalaryType { get; set; } // MONTHLY, PER_CLASS
        public Guid? BranchId { get; set; }
    }
}
