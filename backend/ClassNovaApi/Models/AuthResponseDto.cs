namespace ClassNovaApi.Models
{
    public class AuthResponseDto
    {
        public string Token      { get; init; } = string.Empty;
        public string Role       { get; init; } = string.Empty;
        public string TenantSlug { get; init; } = string.Empty;
        public string TenantName { get; init; } = string.Empty;
        public string FullName   { get; init; } = string.Empty;
    }
}
