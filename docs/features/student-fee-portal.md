# Student Fee Portal (Phase 5.12)

## Requirements

Give students a read-only view of their own fee obligations and payment history — accessible from their dashboard — so they never need to contact an admin to check how much they have paid or what plans apply to them.

**Scope (STUDENT role only):**
- A **Fees** tab added to the student dashboard
- **Fee plan summary cards** — one per linked plan showing plan name, category, frequency, configured amount, total paid by this student, and payment count
- **Full payment history** — table listing every payment in descending date order; columns: date, fee plan, amount, method, reference, receipt ID
- **Print receipt** button on each payment row (same `ReceiptService.printReceipt()` used by admin views)
- No delete, no create — strictly read-only for students

---

## API Contract

### `GET /api/students/my-fees`

**Authorization:** STUDENT role JWT only. Returns data scoped to the calling student's own record.

**Response:**
```json
{
  "success": true,
  "data": {
    "feePlans": [
      {
        "feePlanId": "guid",
        "feePlanName": "Monthly Tuition",
        "category": "TUITION",
        "frequency": "MONTHLY",
        "amount": 2000.00,
        "batchName": "Batch A",
        "totalPaid": 6000.00,
        "paymentCount": 3,
        "lastPaymentDate": "2026-06-01"
      }
    ],
    "payments": [
      {
        "id": "guid",
        "systemId": "BF-RCT-...",
        "studentId": "guid",
        "studentName": "Ravi Sharma",
        "admissionNo": "ADM-001",
        "feePlanId": "guid",
        "feePlanName": "Monthly Tuition",
        "feePlanCategory": "TUITION",
        "amountPaid": 2000.00,
        "paymentDate": "2026-06-01",
        "paymentMethod": "UPI",
        "referenceNo": null,
        "notes": null,
        "createdAt": "2026-06-01T10:30:00Z"
      }
    ],
    "totalPaidOverall": 6000.00
  },
  "error": null
}
```

**Fee plan selection logic:**
- Plans where `BatchId` is in the student's active enrolled batches
- PLUS plans for which the student has any payment (historical — covers plans from past/inactive batches)

**Ordering:** Payments newest first; fee plans by category then name.

---

## Implementation Plan

### Backend

1. Add `GetMyFees()` action to `StudentsController.cs` after `GetMyEnrollments()`.
2. Fetch student by `UserId` claim → resolve `studentId`.
3. Query `StudentEnrollments` for active enrolled `batchId`s.
4. Query `Payments` (with `FeePlan` navigation) for all payments by this student.
5. Derive `paidPlanIds` from payments.
6. Query `FeePlans` where `BatchId IN enrolledBatchIds OR Id IN paidPlanIds`.
7. Group payments by `FeePlanId` → compute `TotalPaid`, `PaymentCount`, `LastPaymentDate` per plan.
8. Return response envelope with `FeePlans`, `Payments`, `TotalPaidOverall`.

### Frontend

1. Add `StudentFeePlanSummary` and `StudentFeesData` to `student-dashboard.models.ts`.
2. Add `getMyFees()` to `StudentService`.
3. Restructure `StudentDashboardComponent` with `p-tabs`:
   - Keep welcome bar + stats strip outside tabs (always visible).
   - `Overview` tab: existing batch grid.
   - `Fees` tab: fee plan cards + payment table + print button per row.
4. Lazy-load fees: trigger `getMyFees()` only when the Fees tab is first activated.
5. Add new styles to `student-dashboard.component.scss`.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Student has no active enrollments | Fee Plans section shows empty state |
| Student has no payments | Payment table shows "No payments yet" |
| Student has payments for a plan no longer linked to an active batch | Plan still appears (included via `paidPlanIds`) |
| Fee plan has 0 payments from this student | Card shows "₹0 paid" and count 0 |
| API call fails | Error toast; fees section shows error state |

---

## Test Cases

1. **Happy path** — student with 2 batches and 3 payments: sees 2+ fee plan cards and 3 payment rows, receipt prints.
2. **No payments** — freshly enrolled student: plan cards visible (if plans linked to batch), payment table empty state.
3. **No enrollments** — student with no active enrollments but historical payments: fee plans for paid plans appear, empty batch section on Overview.
4. **Receipt print** — click Print on any row; new tab opens with styled HTML receipt, auto-print dialog fires.
5. **Lazy load** — switch to Fees tab; loading spinner appears, data loads; switching back to Overview doesn't re-fetch.
