namespace ClassNovaApi.Models
{
    public class AuthRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string TenantSlug { get; set; } = string.Empty;
        public string RoleCode { get; set; } = string.Empty; // ORG_ADMIN, TEACHER, STUDENT
    }
}
