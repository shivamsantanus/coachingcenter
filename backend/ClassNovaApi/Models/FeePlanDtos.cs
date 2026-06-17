using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class CreateFeePlanRequest
    {
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public string Category { get; set; } = string.Empty;   // TUITION | ADMISSION | EXAM | TRANSPORT

        [Required]
        public string Frequency { get; set; } = string.Empty;  // MONTHLY | QUARTERLY | ONE_TIME

        [Range(0.01, 9999999.99)]
        public decimal Amount { get; set; }

        [Range(1, 28)]
        public short? DueDay { get; set; }

        public Guid? BranchId { get; set; }
        public Guid? BatchId  { get; set; }
    }

    public class UpdateFeePlanRequest
    {
        [MaxLength(200)]
        public string? Name { get; set; }

        public string? Category  { get; set; }
        public string? Frequency { get; set; }

        [Range(0.01, 9999999.99)]
        public decimal? Amount { get; set; }

        [Range(1, 28)]
        public short? DueDay { get; set; }

        public Guid? BranchId { get; set; }
        public Guid? BatchId  { get; set; }
    }

    public class FeePlanDto
    {
        public Guid    Id         { get; set; }
        public string  SystemId   { get; set; } = string.Empty;
        public string  Name       { get; set; } = string.Empty;
        public string  Category   { get; set; } = string.Empty;
        public string  Frequency  { get; set; } = string.Empty;
        public decimal Amount     { get; set; }
        public short?  DueDay     { get; set; }
        public bool    IsActive   { get; set; }
        public Guid?   BranchId   { get; set; }
        public string? BranchName { get; set; }
        public Guid?   BatchId    { get; set; }
        public string? BatchName  { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
