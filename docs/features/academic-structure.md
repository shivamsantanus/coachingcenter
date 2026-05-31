# Academic Structure — Feature Document

**Created:** 2026-05-30
**Status:** In Progress
**Phase:** 3 — Academic Structure
**Feature doc covers:** 3.1 Academic Year, 3.2 Class, 3.3 Batch, 3.4 Subject, 3.5 Batch-Subject-Teacher assignment, 3.6 Student enrollment

---

## Requirements

### Academic Year (3.1)
- ORG_ADMIN can create, update, and soft-deactivate academic years within their tenant
- A tenant may have many academic years; at most one may be `IsActive = true` at a time
- Activating an academic year must atomically deactivate all others for the same tenant
- `Name` is a human label (e.g. "2026-2027"); `StartDate` must be strictly before `EndDate`
- All reads return only academic years belonging to the authenticated user's tenant

### Class (3.2)
- ORG_ADMIN can create, update, and toggle status (`ACTIVE` / `INACTIVE`) for classes
- Each class belongs to one tenant and one academic year; branch association is optional
- `SortOrder` (nullable int) controls display order in lists
- All reads are scoped to the tenant; `AcademicYearId` must belong to the same tenant

### Batch / Section (3.3)
- ORG_ADMIN can create, update, and toggle status (`ACTIVE` / `INACTIVE`) for batches
- Each batch belongs to one tenant and one academic year; class and branch associations are optional
- `StartDate` and `EndDate` are optional but when both are provided `StartDate` must be before `EndDate`
- All reads scoped to tenant; `AcademicYearId` and `ClassId` (when supplied) must belong to the same tenant

### Subject (3.4)
- ORG_ADMIN can create, update, and delete subjects within their tenant
- `Name` is required; `Code` is optional but when provided must be unique per tenant (nullable filtered index)
- A subject cannot be deleted if it has any existing `BatchSubjectTeacher` rows — return 409 Conflict
- All reads are scoped to the tenant

### Batch-Subject-Teacher Assignment (3.5)
- ORG_ADMIN can assign a teacher to a subject within a batch
- ORG_ADMIN can remove an assignment by ID
- The combination `(tenantId, batchId, subjectId, teacherId)` must be unique — duplicate returns 409 Conflict
- All three FK targets (`Batch`, `Subject`, `Teacher`) must belong to the same tenant
- Listing assignments for a batch returns subject name, teacher name, and assignment ID

### Student Enrollment (3.6)
- ORG_ADMIN can enroll a student into a class and/or batch
- At least one of `classId` or `batchId` must be supplied; both may be supplied simultaneously
- When provided, `classId` and `batchId` must belong to the same tenant as the student
- ORG_ADMIN can toggle enrollment status (`ACTIVE` / `INACTIVE`) via PATCH
- Listing enrollments for a student returns class name, batch name, enrolled date, and status
- Duplicate enrollment (same student + same class/batch combination while already active) returns 409 Conflict

---

## Implementation Plan

### Step 1 — DTOs (backend/ClassNovaApi/Models/)
Define request and response DTOs for each entity before writing any controller.

- `AcademicYearDtos.cs` — `CreateAcademicYearRequest`, `UpdateAcademicYearRequest`, `AcademicYearDto`
- `ClassDtos.cs` — `CreateClassRequest`, `UpdateClassRequest`, `ClassDto`
- `BatchDtos.cs` — `CreateBatchRequest`, `UpdateBatchRequest`, `BatchDto`
- `SubjectDtos.cs` — `CreateSubjectRequest`, `UpdateSubjectRequest`, `SubjectDto`
- `BatchSubjectTeacherDtos.cs` — `AssignBatchSubjectTeacherRequest`, `BatchSubjectTeacherDto`
- `StudentEnrollmentDtos.cs` — `CreateEnrollmentRequest`, `UpdateEnrollmentStatusRequest`, `EnrollmentDto`

### Step 2 — Backend controllers (in dependency order)

Each controller: thin, no business logic, delegates to a matching service class.

1. `AcademicYearsController` — depends on nothing academic
2. `ClassesController` — depends on `AcademicYear`
3. `BatchesController` — depends on `AcademicYear`, optionally `Class`
4. `SubjectsController` — no academic dependencies; tenant-scoped only
5. `BatchSubjectTeachersController` — depends on `Batch`, `Subject`, `Teacher`
6. `StudentEnrollmentsController` — depends on `Student`, optionally `Class`, `Batch`

Each controller mirrors the endpoints in the API Contract section below.

### Step 3 — Frontend TypeScript models (frontend/src/app/models/)
Create `academic.models.ts` containing interfaces for every DTO shape used by the API.

### Step 4 — Angular services (frontend/src/app/services/)
Create `academic.service.ts` with one method per API endpoint. All methods return `Observable<ApiResponse<T>>`. URL base from `environment.apiBaseUrl`.

### Step 5 — AcademicComponent with tabs UI
Route: `/academic` (ORG_ADMIN only, inside shell).
Single host component with a `p-tabView` or `p-tabs`:
- Tab 1: Academic Years — table + add/edit dialog
- Tab 2: Classes — table filtered by selected academic year + add/edit dialog
- Tab 3: Batches — table filtered by selected academic year + class + add/edit dialog
- Tab 4: Subjects — table + add/edit dialog
- Tab 5: Batch-Subject-Teacher — select batch, see assignments, assign new
- Tab 6: Student Enrollments — search student, see enrollments, enroll new

---

## API Contract

All endpoints require `Authorization: Bearer {token}`. All responses follow the standard envelope:
```json
{ "success": true | false, "data": <payload> | null, "error": null | "<message>" }
```

---

### Academic Years — `GET /api/academic-years`

**Request**
```
GET /api/academic-years
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "guid",
      "name": "2026-2027",
      "startDate": "2026-06-01",
      "endDate": "2027-05-31",
      "isActive": true,
      "createdAt": "2026-05-30T00:00:00Z"
    }
  ],
  "error": null
}
```

---

### Academic Years — `POST /api/academic-years`

**Request body**
```json
{
  "name": "2026-2027",
  "startDate": "2026-06-01",
  "endDate": "2027-05-31"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": { "id": "guid", "name": "2026-2027", "startDate": "2026-06-01", "endDate": "2027-05-31", "isActive": false, "createdAt": "..." },
  "error": null
}
```

**Response `400`** — `EndDate` is not after `StartDate`
```json
{ "success": false, "data": null, "error": "EndDate must be after StartDate." }
```

---

### Academic Years — `PUT /api/academic-years/{id}`

**Request body**
```json
{
  "name": "2026-2027 (Revised)",
  "startDate": "2026-06-01",
  "endDate": "2027-05-31"
}
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "name": "...", "startDate": "...", "endDate": "...", "isActive": false, "createdAt": "..." }, "error": null }
```

**Response `404`** — Academic year not found in tenant
```json
{ "success": false, "data": null, "error": "Academic year not found." }
```

---

### Academic Years — `PATCH /api/academic-years/{id}/activate`

Activates the specified academic year and deactivates all others for the tenant in a single transaction.

**Request body** — none

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "isActive": true }, "error": null }
```

**Response `404`**
```json
{ "success": false, "data": null, "error": "Academic year not found." }
```

---

### Classes — `GET /api/classes`

**Request**
```
GET /api/classes?academicYearId=guid
```
`academicYearId` filter is optional; when omitted, returns all classes for the tenant.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "guid",
      "academicYearId": "guid",
      "academicYearName": "2026-2027",
      "branchId": null,
      "name": "Grade 10",
      "sortOrder": 1,
      "status": "ACTIVE",
      "createdAt": "..."
    }
  ],
  "error": null
}
```

---

### Classes — `POST /api/classes`

**Request body**
```json
{
  "academicYearId": "guid",
  "branchId": null,
  "name": "Grade 10",
  "sortOrder": 1
}
```

**Response `201`**
```json
{ "success": true, "data": { "id": "guid", "name": "Grade 10", "status": "ACTIVE", ... }, "error": null }
```

**Response `400`** — `academicYearId` does not belong to tenant
```json
{ "success": false, "data": null, "error": "Academic year not found." }
```

---

### Classes — `PUT /api/classes/{id}`

**Request body**
```json
{
  "name": "Grade 10 (Science)",
  "sortOrder": 2,
  "branchId": null
}
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "name": "Grade 10 (Science)", ... }, "error": null }
```

---

### Classes — `PATCH /api/classes/{id}/status`

**Request body**
```json
{ "status": "INACTIVE" }
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "status": "INACTIVE" }, "error": null }
```

**Response `400`** — invalid status value
```json
{ "success": false, "data": null, "error": "Status must be ACTIVE or INACTIVE." }
```

---

### Batches — `GET /api/batches`

**Request**
```
GET /api/batches?academicYearId=guid&classId=guid
```
Both filters are optional. Results are scoped to the tenant.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "guid",
      "academicYearId": "guid",
      "academicYearName": "2026-2027",
      "classId": "guid",
      "className": "Grade 10",
      "branchId": null,
      "name": "Batch A",
      "startDate": "2026-06-01",
      "endDate": "2027-03-31",
      "status": "ACTIVE",
      "createdAt": "..."
    }
  ],
  "error": null
}
```

---

### Batches — `POST /api/batches`

**Request body**
```json
{
  "academicYearId": "guid",
  "classId": "guid",
  "branchId": null,
  "name": "Batch A",
  "startDate": "2026-06-01",
  "endDate": "2027-03-31"
}
```

**Response `201`**
```json
{ "success": true, "data": { "id": "guid", "name": "Batch A", "status": "ACTIVE", ... }, "error": null }
```

**Response `400`** — date validation or FK not in tenant
```json
{ "success": false, "data": null, "error": "EndDate must be after StartDate." }
```

---

### Batches — `PUT /api/batches/{id}`

**Request body**
```json
{
  "name": "Batch A Morning",
  "classId": "guid",
  "branchId": null,
  "startDate": "2026-06-01",
  "endDate": "2027-03-31"
}
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "name": "Batch A Morning", ... }, "error": null }
```

---

### Batches — `PATCH /api/batches/{id}/status`

**Request body**
```json
{ "status": "INACTIVE" }
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "status": "INACTIVE" }, "error": null }
```

---

### Subjects — `GET /api/subjects`

**Request**
```
GET /api/subjects?search=
```
`search` is optional; filters by name or code (case-insensitive prefix match). Results scoped to tenant.

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "id": "guid", "name": "Mathematics", "code": "MATH", "createdAt": "..." }
  ],
  "error": null
}
```

---

### Subjects — `POST /api/subjects`

**Request body**
```json
{ "name": "Mathematics", "code": "MATH" }
```

**Response `201`**
```json
{ "success": true, "data": { "id": "guid", "name": "Mathematics", "code": "MATH", "createdAt": "..." }, "error": null }
```

**Response `409`** — code already exists for this tenant
```json
{ "success": false, "data": null, "error": "A subject with this code already exists." }
```

---

### Subjects — `PUT /api/subjects/{id}`

**Request body**
```json
{ "name": "Advanced Mathematics", "code": "ADV-MATH" }
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "name": "Advanced Mathematics", "code": "ADV-MATH", ... }, "error": null }
```

---

### Subjects — `DELETE /api/subjects/{id}`

**Response `200`**
```json
{ "success": true, "data": { "message": "Subject deleted." }, "error": null }
```

**Response `409`** — subject has batch assignments
```json
{ "success": false, "data": null, "error": "Subject is assigned to one or more batches and cannot be deleted." }
```

**Response `404`**
```json
{ "success": false, "data": null, "error": "Subject not found." }
```

---

### Batch-Subject-Teacher — `GET /api/batch-subject-teachers`

**Request**
```
GET /api/batch-subject-teachers?batchId=guid
```
`batchId` is required.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "guid",
      "batchId": "guid",
      "batchName": "Batch A",
      "subjectId": "guid",
      "subjectName": "Mathematics",
      "teacherId": "guid",
      "teacherName": "Jane Smith"
    }
  ],
  "error": null
}
```

---

### Batch-Subject-Teacher — `POST /api/batch-subject-teachers`

**Request body**
```json
{
  "batchId": "guid",
  "subjectId": "guid",
  "teacherId": "guid"
}
```

**Response `201`**
```json
{ "success": true, "data": { "id": "guid", "batchId": "guid", "subjectId": "guid", "teacherId": "guid", "subjectName": "Mathematics", "teacherName": "Jane Smith" }, "error": null }
```

**Response `409`** — duplicate assignment
```json
{ "success": false, "data": null, "error": "This teacher is already assigned to this subject in this batch." }
```

**Response `400`** — FK not found in tenant
```json
{ "success": false, "data": null, "error": "Batch, subject, or teacher not found in this tenant." }
```

---

### Batch-Subject-Teacher — `DELETE /api/batch-subject-teachers/{id}`

**Response `200`**
```json
{ "success": true, "data": { "message": "Assignment removed." }, "error": null }
```

**Response `404`**
```json
{ "success": false, "data": null, "error": "Assignment not found." }
```

---

### Student Enrollments — `GET /api/student-enrollments`

**Request**
```
GET /api/student-enrollments?studentId=guid
```
`studentId` is required.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "id": "guid",
      "studentId": "guid",
      "studentName": "Ravi Kumar",
      "classId": "guid",
      "className": "Grade 10",
      "batchId": "guid",
      "batchName": "Batch A",
      "enrolledOn": "2026-06-01",
      "isActive": true
    }
  ],
  "error": null
}
```

---

### Student Enrollments — `POST /api/student-enrollments`

**Request body**
```json
{
  "studentId": "guid",
  "classId": "guid",
  "batchId": "guid",
  "enrolledOn": "2026-06-01"
}
```
At least one of `classId` or `batchId` must be non-null.

**Response `201`**
```json
{ "success": true, "data": { "id": "guid", "studentId": "guid", "classId": "guid", "batchId": "guid", "enrolledOn": "2026-06-01", "isActive": true }, "error": null }
```

**Response `400`** — neither classId nor batchId provided
```json
{ "success": false, "data": null, "error": "At least one of classId or batchId must be provided." }
```

**Response `409`** — student already actively enrolled in the same class/batch
```json
{ "success": false, "data": null, "error": "Student is already actively enrolled in this class/batch." }
```

**Response `400`** — FK not found in tenant
```json
{ "success": false, "data": null, "error": "Student, class, or batch not found in this tenant." }
```

---

### Student Enrollments — `PATCH /api/student-enrollments/{id}/status`

**Request body**
```json
{ "isActive": false }
```

**Response `200`**
```json
{ "success": true, "data": { "id": "guid", "isActive": false }, "error": null }
```

**Response `404`**
```json
{ "success": false, "data": null, "error": "Enrollment not found." }
```

---

## Edge Cases

### Academic Years
- `StartDate` must be strictly before `EndDate` — validate before saving; return `400` if violated
- Only one academic year may be `IsActive = true` per tenant at any time; the activate endpoint must deactivate all others atomically inside a single DB transaction
- Attempting to activate an already-active academic year is a no-op (return `200` with current state)
- Updating an academic year does not change its `IsActive` flag — that is controlled only by the activate endpoint
- Academic year `Id` submitted in class/batch creation must belong to the same tenant; cross-tenant FK references return `400 Not Found`

### Classes
- `AcademicYearId` must resolve to an academic year owned by the same tenant — never trust the client GUID without a tenant-scoped lookup
- `BranchId`, when provided, must belong to the same tenant
- `Status` accepts only `"ACTIVE"` or `"INACTIVE"` (UPPER_SNAKE_CASE); any other value returns `400`
- `SortOrder` is nullable; when null the record sorts last or by creation time

### Batches
- `StartDate` and `EndDate` are both nullable; when both are supplied, `StartDate` must be before `EndDate`
- `AcademicYearId` must exist and belong to the same tenant
- `ClassId`, when provided, must exist and belong to the same tenant and same academic year (or at minimum the same tenant — enforce at the service level)
- `BranchId`, when provided, must belong to the same tenant

### Subjects
- `Code` is nullable; when supplied it must be unique per tenant — implemented as a nullable filtered unique index in the DB (`WHERE code IS NOT NULL`)
- On `PUT`, if the code changes, check the new code does not collide with another subject in the same tenant (excluding the subject being updated)
- Delete is blocked if any `BatchSubjectTeacher` row references the subject — perform the check before issuing the `DELETE` and return `409 Conflict`

### Batch-Subject-Teacher
- The unique constraint is on `(tenant_id, batch_id, subject_id, teacher_id)` — a duplicate POST returns `409 Conflict` with a descriptive message
- All three FK targets (`Batch`, `Subject`, `Teacher`) must belong to the same tenant; a cross-tenant GUID returns `400 Bad Request`
- A single batch can have the same subject assigned to multiple teachers (different teachers allowed)
- A single teacher can teach the same subject across multiple batches

### Student Enrollments
- At least one of `classId` or `batchId` must be non-null — return `400` if both are null
- A student must not already be actively enrolled in the identical `(classId, batchId)` combination; check before inserting and return `409` on duplicate
- `ClassId` and `batchId`, when provided, must belong to the same tenant as the student
- `EnrolledOn` defaults to today (`DateOnly.FromDateTime(DateTime.UtcNow)`) if not supplied by the caller
- Toggling `isActive = false` is a soft deactivation; re-enrolling the student afterwards is a new enrollment record

---

## Test Cases

### Academic Years

**Happy path**
- Create an academic year with valid name, startDate, endDate → `201`; appears in GET list
- Update an academic year name and dates → `200`; changes reflected in GET
- Activate an inactive academic year → `200`; previously active year becomes inactive
- Activate the currently active academic year → `200`; no state change

**Error cases**
- Create with `endDate` equal to or before `startDate` → `400`
- Create with `startDate` or `endDate` missing → `400` (validation)
- PUT with non-existent ID → `404`
- PATCH activate with non-existent ID → `404`
- GET returns only academic years belonging to the authenticated tenant (no cross-tenant leakage)

---

### Classes

**Happy path**
- Create a class for a valid academic year → `201`; appears in GET list
- Filter GET by `academicYearId` → returns only classes for that year
- Update class name and sort order → `200`
- Toggle status to `INACTIVE` → `200`; toggle back to `ACTIVE` → `200`

**Error cases**
- Create with `academicYearId` from another tenant → `400`
- PATCH status with value `"DELETED"` → `400`
- PUT with non-existent class ID → `404`
- Cross-tenant GET: another tenant's classes must not appear

---

### Batches

**Happy path**
- Create a batch with valid `academicYearId` and no `classId` → `201`
- Create a batch with valid `academicYearId` and `classId` → `201`
- Create a batch with no `startDate` / `endDate` (both nullable) → `201`
- Filter GET by `academicYearId` and `classId` → filtered results
- Toggle status to `INACTIVE` → `200`

**Error cases**
- Create with `startDate` >= `endDate` → `400`
- Create with `classId` from another tenant → `400`
- Create with `academicYearId` from another tenant → `400`
- PUT with non-existent batch ID → `404`

---

### Subjects

**Happy path**
- Create a subject with name only (no code) → `201`
- Create a subject with name and unique code → `201`
- Create two subjects with `code = null` → both succeed (nullable allows multiple nulls)
- Update subject name → `200`
- Delete a subject with no batch assignments → `200`

**Error cases**
- Create subject with a code that already exists in the same tenant → `409`
- Update subject code to one that another subject in the tenant already uses → `409`
- Delete a subject that is referenced by a `BatchSubjectTeacher` row → `409`
- DELETE with non-existent ID → `404`

---

### Batch-Subject-Teacher

**Happy path**
- Assign teacher T1 to subject S1 in batch B1 → `201`
- Assign teacher T2 to subject S1 in batch B1 (same subject, different teacher) → `201`
- GET assignments for batch B1 → both assignments returned
- DELETE an assignment → `200`; no longer appears in GET

**Error cases**
- Assign teacher T1 to subject S1 in batch B1 a second time → `409`
- Assign using a `batchId` from another tenant → `400`
- Assign using a `subjectId` from another tenant → `400`
- Assign using a `teacherId` from another tenant → `400`
- DELETE with non-existent assignment ID → `404`

---

### Student Enrollments

**Happy path**
- Enroll student in a class only (`batchId = null`) → `201`
- Enroll student in a batch only (`classId = null`) → `201`
- Enroll student in both class and batch → `201`
- GET enrollments for a student → correct list returned
- PATCH `isActive = false` → enrollment deactivated
- Re-enroll student in the same class/batch after deactivation → new record created with `isActive = true`

**Error cases**
- Enroll with both `classId` and `batchId` null → `400`
- Enroll student who is already actively enrolled in the same class/batch combination → `409`
- Enroll using `classId` from another tenant → `400`
- Enroll using `batchId` from another tenant → `400`
- PATCH status on non-existent enrollment ID → `404`
