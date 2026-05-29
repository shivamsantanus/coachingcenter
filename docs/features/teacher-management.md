# Feature 2.4 — Teacher Management UI

## Requirements

- **List view** — paginated table of teachers with search (name / employee code) and status filter
- **Add teacher** — dialog form, ORG_ADMIN only
- **Edit teacher** — same form dialog in edit mode, ORG_ADMIN only
- **Status toggle** — activate / deactivate inline from the list, ORG_ADMIN only
- **Photo upload** — avatar upload in both create and edit modes (JPG/PNG/WebP, max 2 MB)
- **Role visibility** — list accessible to ORG_ADMIN only (TEACHER role does not see this page)

## API Contract

All endpoints: `Authorization: Bearer {token}` required.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/teachers?page&pageSize&search&status` | Any role | Paginated list |
| `GET` | `/api/teachers/:id` | Any role | Single teacher detail |
| `POST` | `/api/teachers` | ORG_ADMIN | Create teacher |
| `PUT` | `/api/teachers/:id` | ORG_ADMIN | Update teacher |
| `PATCH` | `/api/teachers/:id/status` | ORG_ADMIN | Toggle ACTIVE/INACTIVE |
| `POST` | `/api/teachers/:id/photo` | ORG_ADMIN | Upload/replace photo |

### Request bodies

**POST /api/teachers**
```json
{ "fullName": "string", "employeeCode": "string", "qualification": "string?", "salaryType": "MONTHLY|PER_CLASS|null", "branchId": "guid?" }
```

**PUT /api/teachers/:id**
```json
{ "fullName": "string?", "employeeCode": "string?", "qualification": "string?", "salaryType": "string?", "branchId": "guid?" }
```

**PATCH /api/teachers/:id/status**
```json
{ "status": "ACTIVE|INACTIVE" }
```

### Response shapes

List: `{ total, page, pageSize, data: TeacherSummary[] }` — raw object (no ApiEnvelope wrapper).

`TeacherSummary`: `{ id, fullName, employeeCode, qualification, salaryType, status, photoUrl, branchId, createdAt }`

`TeacherDetail` extends summary with: `{ userId, updatedAt }`

Create: `{ id, fullName, employeeCode, status }`

Update: `{ message }`

Status patch: `{ message, status }`

Photo: `{ photoUrl }`

## Component Structure

```
app/components/teachers/
├── teacher-list/
│   ├── teacher-list.component.ts
│   ├── teacher-list.component.html
│   └── teacher-list.component.scss
└── teacher-form/
    ├── teacher-form.component.ts
    ├── teacher-form.component.html
    └── teacher-form.component.scss
```

- `TeacherListComponent` — page component, route `/teachers`
- `TeacherFormComponent` — dialog component (add + edit), embedded inside list

## Implementation Plan

1. Create `teacher.models.ts` — TypeScript interfaces
2. Create `teacher.service.ts` — HTTP service (mirrors student.service.ts)
3. Create `TeacherFormComponent` — dialog with photo upload
4. Create `TeacherListComponent` — table with search, status filter, toggle, add/edit
5. Register route `/teachers` in `app.routes.ts`
6. Fix `TeachersController.UploadPhoto` — same `WebRootPath ?? ContentRootPath/wwwroot` fix as Students
7. Update `project-plan.md`

## Edge Cases

- Employee code must be unique per tenant — backend returns 400 with `{ error: "Employee code already exists." }`
- Photo upload is ORG_ADMIN only — button is only rendered for ORG_ADMIN
- `salaryType` is optional — render as "—" when null in the list
- `qualification` is optional — render as "—" when null
- Status toggle shows loading spinner on the specific row's button while in-flight
- In create mode, photo is held locally until student record exists, then uploaded in a second call
- Programmatic dialog close (`[visible]` going false) must not double-emit events — use `onDialogHide()` guard pattern

## Test Cases

1. Happy path: add teacher with all fields + photo → appears in list
2. Add teacher without photo → appears without avatar
3. Edit teacher: change qualification → saved correctly
4. Edit teacher: upload photo → avatar updates immediately
5. Deactivate teacher → row shows Inactive badge
6. Reactivate → row shows Active badge
7. Search: type partial name → list filters
8. Duplicate employee code → error banner shown
9. Photo > 2 MB → toast warning, upload blocked
10. Cancel / X button on dialog → no list reload, no state corruption
