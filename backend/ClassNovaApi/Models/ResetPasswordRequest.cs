using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class ResetPasswordRequest
    {
        [Required]
        public string TenantSlug { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Otp { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
