# Payment Receipt (5.11)

## Requirements

- Every payment row in **Payment History tab**, **Student Detail → Payments tab** shows a "Print" button
- Clicking Print opens a new browser tab with a formatted receipt page
- The receipt page auto-triggers `window.print()` on load so the user goes straight to the print dialog
- Receipt shows: org name, receipt number (systemId), student name, admission no, fee plan name + category, amount, date, payment method, reference no, notes
- No external PDF library — browser native print only
- Receipt page is fully self-contained (inline CSS, no network calls)

## API Contract

No new API endpoint needed — all data is already present in `PaymentRecord`.

## Step-by-step Implementation Plan

1. **`ReceiptService`** (`services/receipt.service.ts`)
   - `printReceipt(payment: PaymentRecord, orgName: string): void`
   - Opens a new tab via `window.open()`
   - Writes a full standalone HTML page with inline CSS
   - The page calls `window.print()` on `window.onload`

2. **Inject `ReceiptService`** into:
   - `PaymentsTabComponent` — add Print button next to Delete
   - `StudentDetailComponent` — add Print button next to Delete in payments tab

3. **Org name** — read from `AuthService.getAuthContext()` which already has `tenantName` or `fullName`; check what's available.

## Receipt HTML Layout

```
┌─────────────────────────────────────────┐
│  [ORG NAME]                   RECEIPT   │
│                        RCT-XXX-...      │
├─────────────────────────────────────────┤
│  Student        Arjun Sharma            │
│  Admission No   BF-CNS-...             │
├─────────────────────────────────────────┤
│  Fee Plan       Monthly Tuition (TUITION)│
│  Amount         ₹ 600.00               │
│  Date           15 Jun 2026            │
│  Method         UPI                    │
│  Reference      upi-ref-1234           │
│  Notes          —                      │
├─────────────────────────────────────────┤
│  This is a computer-generated receipt.  │
│  No signature required.                 │
└─────────────────────────────────────────┘
```

## Edge Cases

- `referenceNo` null → show "—"
- `notes` null → show "—"
- Long org name → wraps, doesn't overflow
- `systemId` empty string → show "N/A"

## Test Cases

1. Click Print on a payment with all fields → receipt opens, print dialog fires
2. Click Print on a payment with null referenceNo → "—" shown
3. Print on mobile → browser print dialog appears (same flow)
