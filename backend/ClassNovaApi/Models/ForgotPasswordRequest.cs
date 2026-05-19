using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class ForgotPasswordRequest
    {
        [Required]
        public string TenantSlug { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}
