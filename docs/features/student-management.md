# Feature 2.3 — Student Management UI

**Status:** In Progress
**Phase:** 2 — Core People Management
**Last updated:** 2026-05-21

---

## Requirements

- List all students in the tenant with pagination, search, and status filter
- Add new student via a dialog form (ORG_ADMIN only)
- Edit existing student via the same dialog form (ORG_ADMIN only)
- Toggle student status ACTIVE / INACTIVE (ORG_ADMIN only)
- Upload student photo from the list or form (ORG_ADMIN only)
- Route: `/students` — protected by `authGuard`; accessible to ORG_ADMIN and TEACHER

---

## API Contract

All endpoints are prefixed with `/api/students`. The `Authorization: Bearer {token}` header is attached automatically by `auth.interceptor.ts`.

### List students
```
GET /api/students?page=1&pageSize=20&search=&status=
Response: { total, page, pageSize, data: StudentSummary[] }
```

### Get single student
```
GET /api/students/{id}
Response: StudentDetail
```

### Create student
```
POST /api/students
Body: CreateStudentRequest
Response: { id, fullName, admissionNo, status }
```

### Update student
```
PUT /api/students/{id}
Body: UpdateStudentRequest
Response: { message }
```

### Toggle status
```
PATCH /api/students/{id}/status
Body: { status: "ACTIVE" | "INACTIVE" }
Response: { message, status }
```

### Upload photo
```
POST /api/students/{id}/photo
Body: FormData (file)
Response: { photoUrl }
```

---

## TypeScript Interfaces (frontend/src/app/models/student.models.ts)

```typescript
StudentSummary      // list row: id, fullName, admissionNo, guardianName, guardianPhone, dob, status, photoUrl, branchId, createdAt
StudentDetail       // full form data (adds address, userId, updatedAt)
CreateStudentRequest
UpdateStudentRequest
StudentListResponse // { total, page, pageSize, data: StudentSummary[] }
```

---

## Component Structure

```
frontend/src/app/components/students/
├── student-list/
│   ├── student-list.component.ts
│   ├── student-list.component.html
│   └── student-list.component.scss
└── student-form/
    ├── student-form.component.ts
    ├── student-form.component.html
    └── student-form.component.scss
```

### StudentListComponent
- Signals: `students`, `isLoading`, `totalRecords`, `currentPage`, `pageSize`, `searchTerm`, `statusFilter`
- PrimeNG `p-table` (lazy) with `p-paginator`
- Search input with 400 ms debounce
- Status filter: All / Active / Inactive
- "Add Student" button (ORG_ADMIN only) → opens `StudentFormComponent` dialog in "create" mode
- Per-row "Edit" icon → opens dialog in "edit" mode (pre-fills form, loads full detail)
- Per-row status toggle chip (ORG_ADMIN only)
- Photo avatar — shows initials if no photo

### StudentFormComponent
- Input: `mode: 'create' | 'edit'`, `studentId?: string`
- Output: `saved` EventEmitter — list reloads on emit
- Reactive form: FullName*, AdmissionNo*, GuardianName*, GuardianPhone*, Address, DateOfBirth
- Photo upload section (visible after student is saved in create mode, or always in edit mode)
- Submits to `POST /api/students` or `PUT /api/students/{id}`
- Photo uploaded separately via `POST /api/students/{id}/photo`

---

## Edge Cases

- Admission number uniqueness violation → show field-level error from API
- Branch ID validation → backend returns 400; surface as toast error
- Photo > 2 MB or wrong type → reject before upload, show validation message
- Search debounce prevents excessive API calls while typing
- Page resets to 1 on new search or filter change
- Edit mode pre-fills with GET /api/students/{id}; shows loading skeleton

---

## Test Cases

- [ ] Can list students (empty state shows "No students found")
- [ ] Search filters results in real-time (debounced)
- [ ] Status filter "Active" shows only active students
- [ ] Add student with all required fields → appears in list
- [ ] Add student with duplicate admission no → error toast shown
- [ ] Edit student → changes reflected in list
- [ ] Status toggle ACTIVE → INACTIVE and back
- [ ] Photo upload (valid JPG) → avatar updates
- [ ] Photo upload > 2 MB → rejected with message
- [ ] Non-ORG_ADMIN role → Add/Edit/Toggle buttons hidden

---

## Implementation Plan

1. `docs/features/student-management.md` (this file) ✅
2. `frontend/src/app/models/student.models.ts`
3. `frontend/src/app/services/student.service.ts`
4. `StudentListComponent` — list, search, filter, pagination, status toggle
5. `StudentFormComponent` — add/edit dialog with photo upload
6. Wire `/students` route in `app.routes.ts`
7. Update `docs/project-plan.md`
