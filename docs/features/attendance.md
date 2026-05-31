# Feature: Attendance

## Requirements

- Teachers (and ORG_ADMINs) can mark attendance for any batch on any date
- Attendance is marked in bulk: one request covers all students in a batch for a given date
- A re-submission for the same batch + date **overwrites** the existing records (upsert)
- Each student record has one of four statuses: `PRESENT` | `ABSENT` | `LATE` | `EXCUSED`
- An optional free-text `Note` can be attached to any record
- The system shows which teacher/admin last marked the record (`MarkedById`)
- ORG_ADMINs and TEACHERs can view attendance; STUDENTs can only view their own
- Summary endpoint returns per-student aggregate stats for a date range

---

## API Contract

### Mark attendance (bulk upsert)
```
POST /api/attendance/mark
Authorization: Bearer <token>  (ORG_ADMIN or TEACHER)

Body:
{
  "batchId": "guid",
  "date": "2026-05-31",
  "records": [
    { "studentId": "guid", "status": "PRESENT", "note": null },
    { "studentId": "guid", "status": "ABSENT",  "note": "Informed by parent" }
  ]
}

Response 200:
{ "success": true, "data": { "saved": 28, "date": "2026-05-31" }, "error": null }
```

### Get attendance for a batch on a date
```
GET /api/attendance?batchId=<guid>&date=<yyyy-MM-dd>
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "studentId": "guid",
      "studentName": "Rohit Sharma",
      "admissionNo": "A001",
      "status": "PRESENT",   // null if not yet marked
      "note": null,
      "markedByName": "Priya Patel"
    }
  ],
  "error": null
}
```

### Attendance summary
```
GET /api/attendance/summary?batchId=<guid>&fromDate=<yyyy-MM-dd>&toDate=<yyyy-MM-dd>
GET /api/attendance/summary?studentId=<guid>&fromDate=<yyyy-MM-dd>&toDate=<yyyy-MM-dd>
Authorization: Bearer <token>

Response 200:
{
  "success": true,
  "data": [
    {
      "studentId": "guid",
      "studentName": "Rohit Sharma",
      "admissionNo": "A001",
      "totalDays": 20,
      "present": 17,
      "absent": 2,
      "late": 1,
      "excused": 0,
      "presentPercentage": 85.0
    }
  ],
  "error": null
}
```

---

## DB Schema

Table: `attendances`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| batch_id | uuid | FK → batches |
| student_id | uuid | FK → students |
| date | date | Attendance date |
| status | text | PRESENT / ABSENT / LATE / EXCUSED |
| marked_by_id | uuid | FK → users (who last saved this record) |
| note | text? | Optional free-text |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Unique index:** `(tenant_id, batch_id, student_id, date)` — one record per student per batch per day.

---

## Implementation Plan

### Backend
1. `Attendance.cs` — EF Core entity
2. `AppDbContext.cs` — add `DbSet<Attendance>`, configure unique index + FK restrict
3. EF migration `AddAttendance`
4. `MarkAttendanceRequest.cs` + `AttendanceRecordRequest.cs` — DTOs
5. `AttendanceController.cs`
   - `POST /api/attendance/mark` — ORG_ADMIN or TEACHER
   - `GET  /api/attendance` — query by batchId + date (all enrolled students, with status null if not yet marked)
   - `GET  /api/attendance/summary` — aggregate stats

### Frontend
6. `attendance.models.ts` — TypeScript interfaces
7. `attendance.service.ts` — Angular service
8. `AttendanceComponent` — teacher UI at `/attendance`
   - Step 1: AY → Batch filter
   - Step 2: Date picker
   - Step 3: Student list with status selector (PRESENT / ABSENT / LATE / EXCUSED)
   - Save button → bulk mark
9. Route `/attendance` added to shellChildren
10. Shell nav link (ORG_ADMIN + TEACHER)

---

## Edge Cases

- Batch has no active enrollments → show empty state, not an error
- Submitting empty `records` array → no-op, return `{ saved: 0 }`
- Student not enrolled in batch → backend rejects that record silently (skip)
- Re-marking the same batch/date → upsert updates existing rows, inserts new ones
- Date in the future → allowed (advance scheduling)
- STUDENT role hits `/summary` for someone else's studentId → 403

---

## Test Cases

1. ORG_ADMIN marks attendance for a batch with 5 students → all 5 saved
2. Teacher re-marks same batch/date → existing records updated
3. GET /attendance with no prior marking → all students returned with `status: null`
4. GET /attendance with partial marking → mix of statuses and nulls
5. Summary for 20 days, 1 student absent 3 days → presentPercentage = 85.0
6. TEACHER tries to view another tenant's batch → 0 records returned (tenant filter)
7. STUDENT tries to GET summary for another student → 403
