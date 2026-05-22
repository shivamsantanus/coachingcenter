using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateTenantStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
