using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class PlatformLoginRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
