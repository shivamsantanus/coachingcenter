namespace ClassNovaApi.Models
{
    public class UpdateTeacherRequest
    {
        public string? FullName { get; set; }
        public string? EmployeeCode { get; set; }
        public string? Qualification { get; set; }
        public string? SalaryType { get; set; }
        public Guid? BranchId { get; set; }
    }
}
