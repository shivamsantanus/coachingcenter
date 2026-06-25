namespace ClassNovaApi.Models
{
    public class Payment
    {
        public Guid    Id            { get; set; }
        public Guid    TenantId      { get; set; }
        public Guid    StudentId     { get; set; }
        public decimal TotalAmount   { get; set; }
        public DateOnly PaymentDate  { get; set; }
        public string  PaymentMethod { get; set; } = string.Empty; // CASH, UPI, CARD, BANK
        public string? ReferenceNo   { get; set; }
        public string? Notes         { get; set; }
        public string? SystemId      { get; set; }
        public DateTime CreatedAt    { get; set; }
        public DateTime UpdatedAt    { get; set; }

        public Tenant  Tenant  { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public ICollection<PaymentLineItem> LineItems { get; set; } = new List<PaymentLineItem>();
    }
}
