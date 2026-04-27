namespace ClassNovaApi.Models
{
    public class TenantUserRole
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid UserId { get; set; }
        public Guid RoleId { get; set; }
        public string Status { get; set; } = string.Empty; // ACTIVE, INVITED, DISABLED

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public User User { get; set; } = null!;
        public Role Role { get; set; } = null!;
    }
}
