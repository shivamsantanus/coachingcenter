# Feature: Teacher Dashboard & Profile

## Goal
Give teachers a meaningful home screen when they log in — their batches, today's attendance status, and quick actions. Also a profile page where they can view their own information.

## Teacher Dashboard (`/dashboard` for TEACHER role)

### Sections
1. **Welcome bar** — name, employee code, today's date
2. **Today's Batches** — cards for each assigned batch showing:
   - Batch name + class name
   - Start / end time
   - Student count
   - Attendance status today: `MARKED` (green) | `NOT MARKED` (amber)
   - "Mark Now" button → navigates to `/attendance` pre-loaded for that batch + today
3. **Quick Stats strip** — Total batches | Total students | Subjects taught
4. **My Subjects** — list of subjects they teach (across all batches)

### API
```
GET /api/teachers/my-dashboard
Authorization: Bearer <token>  (TEACHER only)

Response:
{
  "teacherName": "Ravi Kumar",
  "employeeCode": "T001",
  "systemId": "BF000-CNT-...",
  "photoUrl": "/uploads/teachers/.../T001.jpg",
  "todaysBatches": [
    {
      "batchId": "guid",
      "batchName": "Morning Batch",
      "className": "Class 8",
      "academicYearName": "2025-2026",
      "startTime": "06:00:00",
      "endTime": "08:00:00",
      "studentCount": 25,
      "attendanceMarkedToday": true
    }
  ],
  "stats": {
    "totalBatches": 3,
    "totalStudents": 75,
    "totalSubjects": 4
  },
  "subjects": [
    { "subjectId": "guid", "subjectName": "Mathematics", "batchName": "Morning Batch" }
  ]
}
```

## Teacher Profile (`/teacher-profile`)

### Sections
1. **Photo + basic info** — name, employee code, system ID, qualification
2. **My Batches** — table of assigned batches with class, AY, time
3. **My Subjects** — subjects taught per batch

### API
```
GET /api/teachers/my-profile
Authorization: Bearer <token>  (TEACHER only)

Response: teacher detail + assigned batches + subjects
```

## Routing
- `/dashboard` → `DashboardComponent` detects role → renders `TeacherDashboardComponent` for TEACHER
- `/teacher-profile` → `TeacherProfileComponent` — nav item visible for TEACHER role

## Edge cases
- Teacher has no batch assignments → show empty state with guidance to contact admin
- No attendance marked yet today → "NOT MARKED" badge, "Mark Now" CTA
- Teacher has no photo → show initials avatar
