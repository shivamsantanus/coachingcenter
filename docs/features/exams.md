# Feature: Exams & Results (Phase 6)

## Requirements

- ORG_ADMIN creates exams per batch, assigns subjects with max marks
- Marks are entered per student per subject (bulk, grid UI)
- Results are computed: total, percentage, pass/fail
- Exam lifecycle: DRAFT → OPEN (marks entry) → PUBLISHED (results visible)
- Teachers can enter marks; students can view published results (future)

---

## Exam Types

| Code | Label |
|---|---|
| `UNIT_TEST` | Unit Test |
| `MID_TERM` | Mid-Term |
| `FINAL` | Final |

## Exam Status

| Status | Meaning |
|---|---|
| `DRAFT` | Being set up; subjects can be added/removed; marks cannot be entered |
| `OPEN` | Marks entry enabled; subjects can no longer be added/removed |
| `PUBLISHED` | Marks locked; results visible |

Transitions: DRAFT → OPEN → PUBLISHED (no backward transitions)

---

## API Contract

### List exams
`GET /api/exams?batchId=&academicYearId=&status=&examType=`

Response: `ApiResponse<ExamSummaryDto[]>`

### Create exam
`POST /api/exams` — ORG_ADMIN only

Request:
```json
{
  "name": "Unit Test 1 – June 2026",
  "examType": "UNIT_TEST",
  "academicYearId": "uuid",
  "batchId": "uuid",
  "branchId": "uuid (optional)",
  "examDate": "2026-06-15 (optional)"
}
```

### Get exam detail
`GET /api/exams/{id}`

Response: `ApiResponse<ExamDetailDto>` — includes subjects list

### Update exam
`PUT /api/exams/{id}` — ORG_ADMIN only, only while DRAFT

```json
{ "name": "...", "examType": "MID_TERM", "examDate": "2026-07-01" }
```

### Delete exam
`DELETE /api/exams/{id}` — ORG_ADMIN only, only if DRAFT and no marks entered

### Advance status
`PATCH /api/exams/{id}/status`

```json
{ "status": "OPEN" }      // DRAFT → OPEN (requires ≥1 subject)
{ "status": "PUBLISHED" } // OPEN → PUBLISHED
```

### Assign subject
`POST /api/exams/{id}/subjects`

```json
{ "subjectId": "uuid", "maxMarks": 100 }
```
Only allowed while exam is DRAFT. Errors if subject already assigned.

### Remove subject
`DELETE /api/exams/{id}/subjects/{subjectId}` — only while DRAFT

### Get marks sheet
`GET /api/exams/{id}/marks`

Returns grid: all enrolled students × all exam subjects, with existing marks filled in.

Response: `ApiResponse<MarksSheetDto>`

```json
{
  "subjects": [{ "id": "...", "subjectName": "Math", "maxMarks": 100 }, ...],
  "students": [{
    "studentId": "...",
    "studentName": "Alice",
    "admissionNo": "STU001",
    "marks":   { "<examSubjectId>": 85.5 },
    "remarks": { "<examSubjectId>": null }
  }]
}
```

### Save marks (bulk)
`POST /api/exams/{id}/marks` — ORG_ADMIN or TEACHER; exam must be OPEN

```json
{
  "marks": [
    { "studentId": "uuid", "examSubjectId": "uuid", "marksObtained": 85.5, "remarks": null }
  ]
}
```

Upserts each entry. Validates marksObtained ≤ maxMarks for the subject.

### Get results
`GET /api/exams/{id}/results`

Available for OPEN and PUBLISHED exams. Returns per-student totals, percentage, pass/fail, sorted by rank.

Pass criterion: overall percentage ≥ 35%.

---

## DB Entities (already exist)

| Table | Key Columns |
|---|---|
| `exams` | `tenant_id`, `batch_id`, `academic_year_id`, `name`, `exam_type`, `status`, `exam_date`, `system_id char(28)` |
| `exam_subjects` | `tenant_id`, `exam_id`, `subject_id`, `max_marks` |
| `marks` | `tenant_id`, `exam_subject_id`, `student_id`, `marks_obtained`, `remarks` |

SystemId format for Exam: `{TC}-EXM-{UnixMs}-{UUID[0..3]}`

---

## Implementation Plan

### 6.1 — Exam Management API
1. `Models/ExamDtos.cs` — all request/response DTOs
2. `Controllers/ExamsController.cs` — CRUD + status + subjects + marks + results

### 6.2 — Marks Entry API
- `POST /api/exams/{id}/marks` (bulk upsert)
- `GET /api/exams/{id}/marks` (marks sheet)

### 6.3 — Results API
- `GET /api/exams/{id}/results`

### 6.4 — Frontend
1. `models/exam.models.ts`
2. `services/exam.service.ts`
3. `components/exams/exams.component` — page shell with exam list + create dialog
4. `components/exams/exam-detail/exam-detail.component` — 3-tab detail view
5. Update `app.routes.ts`

---

## Edge Cases

- Cannot add/remove subjects when exam is not DRAFT
- Cannot enter marks when exam is not OPEN
- Cannot delete an exam that has marks entered (even if DRAFT)
- Cannot assign the same subject twice to one exam (unique index)
- MarksObtained must be ≥ 0 and ≤ MaxMarks for that subject
- Students without a mark entry are shown as Absent in results
- If no subjects are assigned, DRAFT→OPEN transition is rejected
- Marks entry is validated: only enrolled (active) students accepted

---

## Test Cases

1. Create exam → status = DRAFT, subjectCount = 0
2. Assign subject → subjectCount = 1
3. Try DRAFT→OPEN with 0 subjects → 400 error
4. DRAFT→OPEN with 1+ subjects → status = OPEN
5. Try to add subject on OPEN exam → 400 error
6. Enter marks for 2 students → GET /marks shows both marks
7. Submit marks with marksObtained > maxMarks → 400 error
8. OPEN→PUBLISHED → marks locked
9. GET /results shows correct percentage and pass/fail
10. DELETE exam with marks entered → 409 conflict
