# ClassNova MVP Scope (v1)

## Goal

Build the first usable version of ClassNova, a coaching center + school management app that supports daily operations:
- admissions and profile management
- teacher and batch management
- fees tracking
- timetable/scheduling
- basic exams and results

## Users and Roles

- `Admin`: full access to setup, users, academic data, fees, reports.
- `Teacher`: manage attendance, marks, class schedules for assigned batches.
- `Student`: view own profile, timetable, fees status, exam results.
- `Parent` (optional in v1): read-only access to child performance and fee status.

## In-Scope Features (Must Have)

1. Authentication and role-based authorization
   - login/logout
   - role-based route and API protection

2. Student Management
   - add/edit student profile
   - assign student to batch/class
   - basic profile fields (name, contact, guardian, address, status)

3. Teacher Management
   - add/edit teacher profile
   - assign teacher to subjects/batches

4. Batch/Class Management
   - create batch/class
   - assign subjects and teachers
   - enroll/remove students

5. Fees and Payments
   - define fee plan for batch/class
   - record payment entries
   - show pending/paid status

6. Timetable/Schedule
   - create weekly class schedule
   - view per batch and per teacher

7. Exams and Results (Basic)
   - create exam record
   - enter marks by student
   - publish results (viewable to student)

8. Dashboard (Basic)
   - quick stats: total students, pending fees, upcoming exams/classes

## Out of Scope (For Later Phases)

- online classes/live meeting integration
- advanced analytics and BI reports
- payroll automation and complex salary rules
- mobile app
- bulk communication campaigns (SMS/WhatsApp automation)
- multi-branch enterprise hierarchy

## Role Permission Matrix (v1)

| Module | Admin | Teacher | Student |
|---|---|---|---|
| Users/Roles | Full | No | No |
| Student Profiles | Full | Read (assigned) | Self only |
| Teacher Profiles | Full | Self edit | No |
| Batch/Class | Full | Read/limited update (assigned) | Read own |
| Fees | Full | Read | Read own |
| Timetable | Full | Read own/assigned | Read own |
| Exams/Results | Full | Enter marks (assigned) | Read own |

## Core User Flows (v1)

1. Admin creates academic structure  
   `Create batch -> assign teacher/subject -> enroll students`

2. Student admission  
   `Create student profile -> assign batch -> activate account`

3. Fee collection  
   `Define fee plan -> record payment -> update due balance -> display status`

4. Exam lifecycle  
   `Create exam -> teacher enters marks -> admin publishes result -> student views result`

5. Daily class operations  
   `Teacher checks timetable -> takes class -> updates attendance/marks (if needed)`

## Success Criteria for MVP

- A center can onboard students and teachers.
- Admin can manage classes, fees, and exams end-to-end.
- Teacher can operate assigned academic work.
- Student can log in and view timetable, fees, and results.

## Immediate Next Steps

1. Finalize v1 data model (`docs/db-design-v1.md`)
2. Define API contracts for auth, students, teachers, fees, exams
3. Implement auth + role guards first in backend and frontend
