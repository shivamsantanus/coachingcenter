# Payment Junction Table Refactor

## Why

The original `payments` table had `fee_plan_id` and `amount_paid` as flat columns — one row per
fee plan paid. When a parent pays 2 plans in one dialog, 2 rows were created and stitched together
with an artificial `session_id` UUID.

The junction table model is strictly better:
- One payment event = one row in `payments`
- N plans paid = N rows in `payment_line_items`, all pointing back via `payment_id`
- No grouping hack needed — the structure IS the group
- Per-plan reporting queries are clean indexed JOINs

## Schema

```
payments
  id uuid PK
  tenant_id uuid
  student_id uuid
  total_amount decimal(10,2)   ← sum of all line items
  payment_date date
  payment_method text           ← CASH | UPI | CARD | BANK
  reference_no text?
  notes text?
  system_id char(28)            ← receipt number e.g. BF-RCT-...
  created_at timestamptz
  updated_at timestamptz

payment_line_items
  id uuid PK
  payment_id uuid FK → payments.id
  fee_plan_id uuid FK → fee_plans.id
  amount_paid decimal(10,2)
```

## Data migration

Each existing flat payment row becomes:
- 1 row in `payments` (with `total_amount = old amount_paid`)
- 1 row in `payment_line_items` (copying `fee_plan_id` and `amount_paid`)

## API contract

### POST /api/payments
```json
{
  "studentId": "uuid",
  "paymentDate": "2025-01-15",
  "paymentMethod": "CASH",
  "referenceNo": null,
  "notes": null,
  "plans": [
    { "feePlanId": "uuid", "amountPaid": 2000 },
    { "feePlanId": "uuid", "amountPaid": 500  }
  ]
}
```
Returns a single `PaymentDto` with `lineItems[]`.

### GET /api/payments
Returns `PaymentDto[]` — each with `lineItems[]` and `totalAmount`. Old `feePlanId/amountPaid`
fields removed from the envelope.

### DELETE /api/payments/{id}
Deletes line items first (Restrict FK), then the payment.

## Implementation plan

1. Create `PaymentLineItem.cs` entity
2. Update `Payment.cs` — remove FeePlanId, AmountPaid, SessionId; add TotalAmount + LineItems nav
3. Update `AppDbContext.cs` — add DbSet, configure entity
4. Rewrite `PaymentDtos.cs`
5. Rewrite `PaymentsController.cs`
6. Rewrite `StudentsController.GetMyFees`
7. Generate + patch + apply EF migration
8. Frontend: update models, service, all payment table views, receipt service

## Edge cases

- Payment with 0 plans: rejected at API (MinLength(1) validation)
- Delete payment with line items: line items deleted first, then payment
- Fee plan deleted that has line items: blocked by Restrict FK (correct)
- Student with mix of old single-plan and new multi-plan payments: renders correctly
