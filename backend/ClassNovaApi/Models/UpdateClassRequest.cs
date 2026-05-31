using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateClassRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        public int? SortOrder { get; set; }

        public Guid? BranchId { get; set; }
    }
}
