# Fee Management

## Requirements

- ORG_ADMIN can create fee plan templates (name, category, amount, frequency)
- Fee plans can optionally be scoped to a specific batch or branch
- ORG_ADMIN records payments against a student + fee plan
- Payment history is viewable per student
- Dashboard shows total fees collected this month

## Step-by-step Implementation Plan

### Backend
1. `FeePlansController` — CRUD for fee plans
2. `PaymentsController` — record + list + delete payments
3. Update `DashboardController` — add `feesCollectedThisMonth` to stats

### Frontend
1. `fee.models.ts` — TypeScript interfaces
2. `fee.service.ts` — API calls
3. `FeesComponent` — shell with two tabs
4. `FeePlansTabComponent` — list, create, edit, toggle active
5. `PaymentsTabComponent` — student search, payment history, record payment
6. Route added at `/fees`

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
Same shape as POST but all fields optional.

`PATCH /api/feeplans/{id}/status`
```json
{ "status": "ACTIVE" | "INACTIVE" }
```

### Payments

`GET /api/payments?studentId=...&feePlanId=...&fromDate=...&toDate=...`
Returns paginated payment list.

`POST /api/payments`
```json
{ "studentId": "...", "feePlanId": "...", "amountPaid": 2000, "paymentDate": "2026-06-15", "paymentMethod": "CASH|UPI|CARD|BANK", "referenceNo": null, "notes": null }
```

`DELETE /api/payments/{id}`
Removes a payment record.

## Edge Cases

- Fee plan amount: must be > 0
- DueDay: required for MONTHLY/QUARTERLY (1–28), not applicable for ONE_TIME
- Payment date cannot be in the future
- Amount paid must be > 0
- Deleting a fee plan with payments: blocked (409)
- Scoping: batch must belong to the same tenant; branch must belong to the same tenant

## Test Cases

1. Create fee plan with all fields → success
2. Create fee plan without batch/branch → global plan applies
3. Record payment for a student → appears in their history
4. Delete a fee plan that has payments → rejected with 409
5. Record payment with future date → rejected
6. Search student payments by date range → filtered correctly

## Status

🔄 In Progress — 2026-06-16
