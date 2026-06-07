# Feature: Teacher Attendance

## Requirements

- Teachers can check in and check out once per day via their dashboard
- A teacher cannot check out before checking in — server blocks with 400
- One attendance record per teacher per day (`tenant_id`, `teacher_id`, `date` unique)
- Working minutes are computed on checkout: `check_out_time − check_in_time`
- Check-in auto-sets `status = PRESENT`; admin can override to `HALF_DAY`, `ABSENT`, or `LEAVE`
- **Forgotten checkout — two-layer auto-close (per-tenant timezone aware):**
  1. **Background job** runs periodically (hourly); for each open check-in whose date has already ended **in that tenant's timezone**, closes it at the end of that date (00:00 of the following day, tenant-local, stored as UTC); sets `is_auto_closed = true`
  2. **Lazy on login** — when a teacher logs in, the server checks for any unclosed check-in from a previous day, closes it the same way, and shows a read-only info banner: *"You didn't check out on [date] — it has been automatically marked."*
- ORG_ADMIN has a daily attendance page: view all active teachers for any date, mark/override status and check-in/check-out times; bulk mark-all present
- Admin overrides are audited: original `check_in_time` and `check_out_time` are preserved alongside `modified_by_id` and `modified_at`
- Auto-closed records are flagged (`is_auto_closed = true`) so admin can identify them at a glance
- Teachers can view their own attendance history on a dedicated `/my-attendance` page
- Printable monthly report: ORG_ADMIN (all teachers or per teacher) + teacher (own report)

### Salary / working-hours integrity rules

> These prevent teachers seeing inflated hours that later get reduced by an admin.

- **Auto-closed days are NOT salary-eligible.** While `is_auto_closed = true`, that day's `working_minutes` is excluded from all working-hours totals and any future salary calculation. The day's hours display as `—` / "Pending admin review", never as a number.
- A day's `working_minutes` becomes confirmed (salary-eligible) **only** when:
  - the teacher checked out normally (`is_auto_closed = false`, never auto-closed), **or**
  - an admin has explicitly adjusted the check-out time — which flips `is_auto_closed` back to `false`.
- **No real-time / projected hours for an open day.** While a teacher is checked in but not yet checked out, the current day contributes **0** to totals and the dashboard shows a live elapsed timer at most (informational, never counted). Totals only ever sum completed, confirmed days.

### Check-in upsert rule

- Check-in must **first look for an existing record** for that teacher + date — never blind-insert (the unique index would throw).
- **No existing record** → insert new, `status = PRESENT`, set `check_in_time`.
- **Existing record with `status = PRESENT`** (or an open record) → already checked in → 400 "Already checked in today".
- **Existing record admin pre-marked `ABSENT` or `LEAVE`** → check-in is **blocked**, but the attempt is recorded:
  - Set `check_in_attempted_at = now` on the record (does NOT change `status`, `check_in_time`, or `working_minutes`).
  - Return a clear message to the teacher: *"You're already marked as ABSENT/LEAVE for today. The admin has been notified to review this."*
  - The admin daily view surfaces a flag (`hasCheckInAttempt = true` + `checkInAttemptedAt`) so the admin can spot it and correct the status if the teacher actually attended.
  - This is the app's "inform the admin" channel — no push notification system exists yet; the flag on the daily page is the signal.

### Timezone rule

- All "today", "date", and "end of day" calculations use the tenant's timezone from `tenant_settings.timezone`, never the server's UTC clock.
- The check-in/check-out timestamps are stored in UTC (`timestamptz`); the *date bucketing* and auto-close cutoff are computed in tenant-local time.

---

## Status Values

| Status | Set By | Meaning |
|---|---|---|
| `PRESENT` | Auto on check-in | Teacher checked in for the day |
| `HALF_DAY` | ORG_ADMIN only | Admin manually marks partial day |
| `ABSENT` | ORG_ADMIN only | Teacher did not attend; no check-in |
| `LEAVE` | ORG_ADMIN only | Approved leave for the day |

---

## DB Schema

### Table: `teacher_attendances`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `tenant_id` | `uuid` | FK → tenants (Restrict) |
| `teacher_id` | `uuid` | FK → teachers (Restrict) |
| `date` | `date` | Attendance date |
| `check_in_time` | `timestamptz?` | Null if teacher never checked in |
| `check_out_time` | `timestamptz?` | Null until checked out or auto-closed |
| `working_minutes` | `int?` | Computed on checkout; null until then |
| `status` | `text?` | PRESENT / ABSENT / HALF_DAY / LEAVE; null until set |
| `is_auto_closed` | `bool` | True if the job/lazy-login closed the record. **While true, the day is excluded from working-hours totals and salary.** Admin adjusting the checkout flips it back to false (confirmed) |
| `check_in_attempted_at` | `timestamptz?` | Set when a teacher tries to check in on a day admin already marked ABSENT/LEAVE; flags the record for admin review; does not alter status |
| `note` | `text?` | Optional, admin-set |
| `original_check_in` | `timestamptz?` | Preserved when admin overrides check_in_time |
| `original_check_out` | `timestamptz?` | Preserved when admin overrides check_out_time |
| `modified_by_id` | `uuid?` | FK → users; set on any admin override |
| `modified_at` | `timestamptz?` | Timestamp of last admin override |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Unique index:** `(tenant_id, teacher_id, date)` — one record per teacher per day.

> No `system_id` — this is a log/event table. Per CLAUDE.md rules, only real-world entity tables carry `system_id`.

---

## API Contract

### Check in (TEACHER)
```
POST /api/teacher-attendance/check-in
Authorization: Bearer <token>  (TEACHER only)

Response 200:
{ "success": true, "data": { "checkInTime": "2026-06-07T09:15:00Z" }, "error": null }

Errors:
- 400 Already checked in today
```

### Check out (TEACHER)
```
POST /api/teacher-attendance/check-out
Authorization: Bearer <token>  (TEACHER only)

Response 200:
{ "success": true, "data": { "checkOutTime": "2026-06-07T17:30:00Z", "workingMinutes": 495 }, "error": null }

Errors:
- 400 No open check-in found for today
```

### Get today's record (TEACHER)
```
GET /api/teacher-attendance/my-today
Authorization: Bearer <token>  (TEACHER only)

Response 200:
{
  "success": true,
  "data": {
    "date": "2026-06-07",
    "checkInTime": "2026-06-07T09:15:00Z",
    "checkOutTime": null,
    "workingMinutes": null,
    "status": "PRESENT",
    "isAutoClosed": false,
    "hasUnclosedPrevious": true,
    "unclosedDate": "2026-06-06"
  },
  "error": null
}
```
> `hasUnclosedPrevious` drives the info banner on the teacher dashboard. The lazy-close has already run by the time this is returned (runs on login), so `unclosedDate` is informational only.

### Teacher attendance history
```
GET /api/teacher-attendance/my-history?from=2026-06-01&to=2026-06-30
Authorization: Bearer <token>  (TEACHER only)

Response 200:
{
  "success": true,
  "data": [
    {
      "date": "2026-06-07",
      "checkInTime": "2026-06-07T09:15:00Z",
      "checkOutTime": "2026-06-07T17:30:00Z",
      "workingMinutes": 495,
      "status": "PRESENT",
      "isAutoClosed": false
    }
  ],
  "error": null
}
```

### Teacher own monthly report (printable)
```
GET /api/teacher-attendance/my-report?month=6&year=2026
Authorization: Bearer <token>  (TEACHER only)

Response 200:
{
  "success": true,
  "data": {
    "teacherName": "Priya Patel",
    "month": 6,
    "year": 2026,
    "totalWorkingDays": 26,
    "present": 22,
    "absent": 1,
    "halfDay": 1,
    "leave": 2,
    "totalWorkingMinutes": 10890,
    "records": [ ... same shape as my-history ... ]
  },
  "error": null
}
```

### Admin — daily view
```
GET /api/teacher-attendance/admin/daily?date=2026-06-07
Authorization: Bearer <token>  (ORG_ADMIN only)

Response 200:
{
  "success": true,
  "data": [
    {
      "teacherId": "guid",
      "teacherName": "Priya Patel",
      "employeeCode": "CNT-...",
      "date": "2026-06-07",
      "checkInTime": "2026-06-07T09:15:00Z",
      "checkOutTime": null,
      "workingMinutes": null,
      "status": "PRESENT",
      "isAutoClosed": false,
      "note": null,
      "hasCheckInAttempt": false,
      "checkInAttemptedAt": null
    }
  ],
  "error": null
}
```
> All active teachers are returned. Those with no record for the date have null for all time/status fields.
> `hasCheckInAttempt = true` flags a teacher who tried to check in after being marked ABSENT/LEAVE — admin should review and correct if needed.

### Admin — mark / override
```
POST /api/teacher-attendance/admin/mark
Authorization: Bearer <token>  (ORG_ADMIN only)

Body:
{
  "teacherId": "guid",
  "date": "2026-06-07",
  "status": "HALF_DAY",
  "checkInTime": "2026-06-07T09:00:00Z",   // optional
  "checkOutTime": "2026-06-07T13:00:00Z",  // optional
  "note": "Left early — personal reason"   // optional
}

Response 200:
{ "success": true, "data": { "saved": true }, "error": null }
```
> If an existing record has `check_in_time` or `check_out_time` and admin supplies new values, the originals are copied to `original_check_in` / `original_check_out` before overwrite. `modified_by_id` and `modified_at` are always set on any admin save.

### Admin — monthly report (printable)
```
GET /api/teacher-attendance/admin/monthly-report?month=6&year=2026
GET /api/teacher-attendance/admin/monthly-report?month=6&year=2026&teacherId=<guid>
Authorization: Bearer <token>  (ORG_ADMIN only)

Response: same shape as my-report but for all teachers (or one if teacherId supplied)
```

---

## Implementation Plan

### Backend

1. `TeacherAttendance.cs` — EF Core entity (columns per schema above)
2. `AppDbContext.cs` — add `DbSet<TeacherAttendance>`, unique index, FK restrict
3. EF migration `AddTeacherAttendance`
4. DTOs: `TeacherAttendanceCheckInResponse`, `TeacherAttendanceCheckOutResponse`, `TeacherAttendanceTodayResponse`, `TeacherAttendanceHistoryItem`, `TeacherAttendanceReportResponse`, `AdminDailyTeacherAttendanceItem`, `AdminMarkAttendanceRequest`
5. `TeacherAttendanceService.cs`
   - `CheckInAsync(tenantId, teacherId)` — upsert: find existing record for today (tenant-local) first; blocks if already checked in today; otherwise insert/update with `status = PRESENT`
   - `CheckOutAsync(tenantId, teacherId)` — closes today's record; computes `working_minutes`; blocks if no open check-in
   - `CloseUncheckedOnLoginAsync(tenantId, teacherId)` — closes any open check-in from a prior day at end-of-that-date (tenant-local); sets `is_auto_closed = true`; returns unclosed date if found
   - `GetTodayAsync(tenantId, teacherId)` — returns today's record or null
   - `GetHistoryAsync(tenantId, teacherId, from, to)` — date-range query
   - `GetMyReportAsync(tenantId, teacherId, month, year)` — monthly aggregate
   - `AdminGetDailyAsync(tenantId, date)` — all active teachers LEFT JOIN attendance
   - `AdminMarkAsync(tenantId, adminUserId, request)` — upsert with audit preservation; **recomputes `working_minutes` whenever check-in/out times change**; clears `is_auto_closed` (confirms the day) when admin sets a checkout time
   - `AdminGetMonthlyReportAsync(tenantId, month, year, teacherId?)` — monthly aggregate
6. `TeacherAttendanceController.cs`
   - `POST /check-in`, `POST /check-out` — TEACHER
   - `GET /my-today` — TEACHER; calls `CloseUncheckedOnLoginAsync` first
   - `GET /my-history` — TEACHER
   - `GET /my-report` — TEACHER
   - `GET /admin/daily` — ORG_ADMIN
   - `POST /admin/mark` — ORG_ADMIN
   - `GET /admin/monthly-report` — ORG_ADMIN
7. `TeacherAttendanceAutoCloseJob.cs` — `BackgroundService`; runs hourly; for each tenant, closes open check-ins whose date has ended in that tenant's timezone (`tenant_settings.timezone`); sets `is_auto_closed = true`. Hourly cadence (not a single midnight fire) handles every timezone and teachers absent for multiple days.

### Frontend

8. `teacher-attendance.models.ts` — TypeScript interfaces for all request/response shapes
9. `teacher-attendance.service.ts` — Angular service; methods map 1:1 to API endpoints
10. **Teacher dashboard** — update `DashboardComponent` (TEACHER view):
    - Check In / Check Out button (driven by `my-today` response)
    - Read-only info banner if `hasUnclosedPrevious` is true
11. **`MyAttendanceComponent`** (`/my-attendance`) — TEACHER role:
    - Month/year picker
    - Summary row: Present / Absent / Half Day / Leave / Total Hours
    - Per-day list: date, status badge, check-in, check-out, working hours
    - Print button → monthly report
12. **`TeacherAttendanceAdminComponent`** (`/teacher-attendance`) — ORG_ADMIN role:
    - Date picker (default today)
    - Table: teacher name, employee code, status dropdown, check-in time input, check-out time input, working hours (read-only computed), auto-closed flag badge, **"check-in attempted" review badge** (when `hasCheckInAttempt` — shows attempt time, prompts admin to reconsider ABSENT/LEAVE), note field, Save button per row
    - Bulk "Mark All Present" button
    - Print button → monthly report (all teachers or filtered)
13. Routes — add `/my-attendance` (TEACHER) and `/teacher-attendance` (ORG_ADMIN) to shell children
14. Navigation seeding (data-driven, two places):
    - `Program.cs` `seedNavItems` — add `my-attendance` (`IsAdminOnly = false`) and `teacher-attendance` (`IsAdminOnly = true`)
    - `NavigationController.DefaultPermissions` — add `"my-attendance"` to the `TEACHER` default key set. `teacher-attendance` needs no entry: `IsAdminOnly = true` items are ORG_ADMIN-only and excluded from the toggle matrix.

---

## Resolved Decisions

- **Teacher checks in on a day admin pre-marked `ABSENT`/`LEAVE`:** check-in is **blocked** (admin's status wins). The attempt is recorded via `check_in_attempted_at` and flagged to the admin on the daily page (`hasCheckInAttempt`). Admin reviews and corrects the status if the teacher actually attended. See "Check-in upsert rule".

---

## Edge Cases

- Teacher tries to check in twice on same day → 400 Already checked in today
- Teacher tries to check in on a day admin marked ABSENT/LEAVE → blocked with message; `check_in_attempted_at` set; admin daily view flags it
- Teacher tries to check out with no open check-in → 400 No open check-in found for today
- Background job runs; teacher has no check-in at all that day (was absent) → no record created; admin marks ABSENT manually from admin page
- Admin marks a teacher ABSENT for a day where a check-in record exists → status overrides to ABSENT; check-in/out times preserved (admin explicitly chose to override)
- Admin supplies new check-in/out times for a record that already has them → originals saved to `original_check_in` / `original_check_out`; `modified_by_id` + `modified_at` recorded
- `my-today` called when teacher has no record yet → returns null data, `hasUnclosedPrevious: false`
- Monthly report for a month with no records → returns zero counts, empty records array

---

## Test Cases

1. Teacher checks in → record created, `status = PRESENT`, `check_out_time = null`
2. Teacher checks in twice → 400 on second attempt
3. Teacher checks out without checking in → 400
4. Teacher checks in, checks out → `working_minutes` = correct diff, record closed
5. Teacher checks in, does not log in next day → midnight job closes record at 12:00 AM; `is_auto_closed = true`
6. Teacher logs in with an unclosed prior record → `CloseUncheckedOnLoginAsync` closes it; `my-today` returns `hasUnclosedPrevious: true` with the date
7. Admin marks teacher ABSENT for a day with no record → record created with `status = ABSENT`
8. Admin overrides check-in time on an existing record → originals preserved in `original_check_in`; `modified_by_id` set
9. Admin daily view for a date → all active teachers returned; those without records show null fields
10. Teacher cross-tenant attempt → tenant filter on all queries; 0 records returned or 403
11. Admin marks teacher ABSENT, teacher then attempts check-in → check-in blocked; `check_in_attempted_at` set; status stays ABSENT; admin daily view shows `hasCheckInAttempt = true`
12. Admin then corrects ABSENT → PRESENT after seeing the flag → status updates; audit fields set
