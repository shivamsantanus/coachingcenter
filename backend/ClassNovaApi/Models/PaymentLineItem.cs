namespace ClassNovaApi.Models
{
    public class PaymentLineItem
    {
        public Guid Id        { get; set; }
        public Guid PaymentId { get; set; }
        public Guid FeePlanId { get; set; }
        public decimal AmountPaid { get; set; }

        public Payment Payment   { get; set; } = null!;
        public FeePlan FeePlan   { get; set; } = null!;
    }
}
