using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateSubjectRequest
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }
    }
}
