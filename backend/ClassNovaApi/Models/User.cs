namespace ClassNovaApi.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public bool IsEmailVerified { get; set; }
        public bool IsFirstLogin { get; set; } = false;
        public DateTime? LastLoginAt { get; set; }
        public string? SystemId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<TenantUserRole> TenantUserRoles { get; set; } = [];
    }
}
