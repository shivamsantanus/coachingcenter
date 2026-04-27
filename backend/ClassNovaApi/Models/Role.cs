namespace ClassNovaApi.Models
{
    public class Role
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty; // PLATFORM_ADMIN, ORG_ADMIN, TEACHER, STUDENT
        public string Name { get; set; } = string.Empty;
    }
}
