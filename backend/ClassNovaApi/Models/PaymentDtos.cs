using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class PaymentLineItemDto
    {
        public Guid   FeePlanId       { get; set; }
        public string FeePlanName     { get; set; } = string.Empty;
        public string FeePlanCategory { get; set; } = string.Empty;
        public decimal AmountPaid     { get; set; }
    }

    public class PaymentDto
    {
        public Guid     Id            { get; set; }
        public string   SystemId      { get; set; } = string.Empty;
        public Guid     StudentId     { get; set; }
        public string   StudentName   { get; set; } = string.Empty;
        public string   AdmissionNo   { get; set; } = string.Empty;
        public decimal  TotalAmount   { get; set; }
        public DateOnly PaymentDate   { get; set; }
        public string   PaymentMethod { get; set; } = string.Empty;
        public string?  ReferenceNo   { get; set; }
        public string?  Notes         { get; set; }
        public DateTime CreatedAt     { get; set; }
        public List<PaymentLineItemDto> LineItems { get; set; } = new();
    }

    public class PaymentPlanItem
    {
        [Required]
        public Guid FeePlanId { get; set; }

        [Range(0.01, 9999999.99)]
        public decimal AmountPaid { get; set; }
    }

    public class CreatePaymentRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        public DateOnly PaymentDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? ReferenceNo { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [Required]
        [MinLength(1)]
        public List<PaymentPlanItem> Plans { get; set; } = new();
    }

    public class BatchCollectionStudentRow
    {
        public Guid      StudentId       { get; set; }
        public string    StudentName     { get; set; } = string.Empty;
        public string    AdmissionNo     { get; set; } = string.Empty;
        public decimal   TotalPaid       { get; set; }
        public DateOnly? LastPaymentDate { get; set; }
        public int       PaymentCount    { get; set; }
        public decimal?  DueAmount       { get; set; }
    }

    public class BatchCollectionDto
    {
        public Guid    BatchId           { get; set; }
        public string  BatchName         { get; set; } = string.Empty;
        public List<FeePlanDto> LinkedFeePlans { get; set; } = new();
        public List<BatchCollectionStudentRow> Students { get; set; } = new();
    }
}
