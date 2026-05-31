using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateSubjectRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; }
    }
}
