# Fee Management

## Requirements

- ORG_ADMIN can create fee plan templates (name, category, amount, frequency)
- Fee plans can optionally be scoped to a specific batch or branch
- ORG_ADMIN records payments against a student + fee plan
- Fee Collection register: monthly view per batch — Paid / Partial / Pending status with due/balance columns
- Payment History tab: search across the tenant with AY → Class → Batch cascade + optional date range
- Student Detail page: profile tab + payment history tab per student
- Export to CSV from: Fee Collection, Payment History, Student Detail payments
- Export to CSV from: Students list and Teachers list

## Step-by-step Implementation Plan

### Phase 5.1 — Core fee plans + payments (complete)
- `FeePlansController` — CRUD for fee plans
- `PaymentsController` — record + list + delete payments
- Dashboard stats updated with `feesCollectedThisMonth`
- `fee.models.ts`, `fee.service.ts`, `FeesComponent` shell (2 tabs)
- `FeePlansTabComponent` — list, create, edit, toggle active
- `PaymentsTabComponent` — initial version

### Phase 5.5 — Fee Collection Register (complete)
- `FeeCollectionTabComponent` replaces simple payment list
- Month navigator: `< Month Year >` with prev/next buttons; blocked at current month
- Cascade filters: AY → Class → Batch; button-triggered load (not auto-search)
- `GET /api/payments/batch-collection?batchId=&month=&year=` — returns enrolled students with per-student `totalPaid` and `dueAmount` from linked fee plan
- Status: `paid` (totalPaid >= dueAmount), `partial` (0 < totalPaid < dueAmount), `pending` (no payment)
- If no fee plan linked: Due and Balance columns hidden; banner shown; only Paid/Pending status
- Summary strip: Enrolled / Paid / Partial / Pending / Collected (₹) / fee plan chip
- Record payment dialog inline per student row (pre-fills from linked fee plan)
- Row background tinting: `paid-row` (green), `partial-row` (amber)
- Export CSV from summary strip

### Phase 5.6 — Payment History tab (complete)
- Redesigned as search-first (not auto-loading)
- AY required; Class + Batch optional; date range optional
- `hasSearched` signal controls empty state vs. "no results"
- Filter arrows and separator hidden on mobile
- Summary strip: Transactions / Total Collected / Export CSV
- Export uses `CsvColumn<PaymentRecord>[]` via shared `ExportService`

### Phase 5.7 — Student Detail page (complete)
- Route: `/students/:id` — `StudentDetailComponent`
- Profile tab: avatar/initials, status tag, detail chips; `dl.info-list` grid per section
- Payments tab: fee plan filter + date range + Search button; summary strip; delete per row
- Export CSV from payments tab (exports current search results)
- Back link → students list
- Responsive: profile grid auto-fills columns; info-list collapses to single column at 480px

### Phase 5.8 — Export Service + CSV exports (complete)
- Shared `ExportService` with typed API:
  - `exportCsv<T>(filename, CsvColumn<T>[], data[])` — typed column definitions
  - `downloadCsv(filename, headers[], rows[][])` — low-level (used for conditional columns)
- `CsvColumn<T>` interface: `{ header: string; value: (row: T) => string | number | null | undefined }`
- CSV exports added to: Students list, Teachers list, Fee Collection, Payment History, Student Detail payments
- Students/Teachers list export fetches `pageSize: 5000` with current filters (not just visible page)

### Phase 5.9 — Responsive design (complete)
- All Phase 5 pages get `@media (max-width: 640px)` breakpoints
- Filters collapse to full-width single-column stack
- Load/Search buttons stretch to full width on mobile
- Summary strip: dividers hidden, spacer collapses, Export button full-width
- Fee collection dialog: `maxWidth: calc(100vw - 2rem)` prevents overflow on small phones
- Student detail info-list: single-column stacked (label above, value below) at 480px

## API Contract

### Fee Plans

`GET /api/feeplans`
```json
{ "success": true, "data": [FeePlanDto], "error": null }
```

`POST /api/feeplans`
```json
Request: { "name": "...", "category": "TUITION|ADMISSION|EXAM|TRANSPORT", "frequency": "MONTHLY|QUARTERLY|ONE_TIME", "amount": 2000, "dueDay": 5, "branchId": null, "batchId": null }
Response: { "success": true, "data": FeePlanDto, "error": null }
```

`PUT /api/feeplans/{id}`
Same shape as POST.

`PATCH /api/feeplans/{id}/status`
```json
{ "status": "ACTIVE" | "INACTIVE" }
```

### Payments

`GET /api/payments?studentId=&feePlanId=&fromDate=&toDate=&academicYearId=&classId=&batchId=&page=&pageSize=`
Returns paginated payment list with `{ payments: PaymentRecord[], total: number }`.

`GET /api/payments/batch-collection?batchId=&month=&year=`
Returns `{ batchName, linkedFeePlan, students: BatchCollectionStudentRow[] }`.
- `month` and `year` are optional (both or neither); 1-indexed month
- `dueAmount` is null when no fee plan linked to batch

`POST /api/payments`
```json
{ "studentId": "...", "feePlanId": "...", "amountPaid": 2000, "paymentDate": "2026-06-15", "paymentMethod": "CASH|UPI|CARD|BANK", "referenceNo": null, "notes": null }
```

`DELETE /api/payments/{id}`
Removes a payment record.

## Models

### BatchCollectionStudentRow
```typescript
{ studentId, studentName, admissionNo, totalPaid: number, lastPaymentDate: string | null, dueAmount: number | null }
```

### BatchCollectionResult
```typescript
{ batchName, linkedFeePlan: { id, name, amount, frequency } | null, students: BatchCollectionStudentRow[] }
```

### PaymentStatus (frontend only)
```typescript
type PaymentStatus = 'paid' | 'partial' | 'pending'
```
Derived from `totalPaid` vs `dueAmount` in `FeeCollectionTabComponent.studentStatus()`.

## Edge Cases

- Fee plan amount: must be > 0
- DueDay: required for MONTHLY/QUARTERLY (1–28), not applicable for ONE_TIME
- Payment date cannot be in the future
- Amount paid must be > 0
- Deleting a fee plan with payments: blocked (409)
- Scoping: batch/branch must belong to the same tenant
- month/year params: both must be present or both absent; month must be 1–12
- No fee plan on batch: Due and Balance columns hidden; Partial status impossible (only Paid/Pending)

## Test Cases

1. Create fee plan → appears in list with correct category badge
2. Record payment for a student → appears in collection register and payment history
3. Fee collection — month navigation wraps year correctly (Dec→Nov rolls year back)
4. Fee collection — partial payment row shows amber tint and Partial tag
5. Fee collection — no fee plan linked → yellow banner, no Due/Balance columns
6. Payment History — search without AY selected → Search button disabled
7. Payment History — date range filter narrows results correctly
8. Delete a fee plan with payments → rejected with 409
9. Export CSV from Students list → all records fetched (not just page 1)
10. Student detail — navigate from list → profile loads → switch to Payments tab → Search → results

## Deferred to later phase

**Fee concessions/discounts** — per-student fee adjustment (e.g. admin gives a 10% discount for a term).
Recommended design: standalone `student_fee_concessions` table (student_id, fee_plan_id, discount_type, discount_value, valid_from, valid_to, reason). UI: concession chip in fee collection row + management section in student detail profile tab.

## Status

✅ Complete — 2026-06-18
