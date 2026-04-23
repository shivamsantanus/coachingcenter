# DB Design v1 (PostgreSQL)

## Design Principles

- Keep schema normalized for core entities.
- Use soft-delete/status flags where operationally useful.
- Track `created_at` and `updated_at` in major tables.
- Use UUID primary keys for scalable distributed usage.

## Core Entities

1. `users`
2. `roles`
3. `user_roles`
4. `students`
5. `teachers`
6. `batches`
7. `subjects`
8. `batch_subject_teachers`
9. `student_batches`
10. `fee_plans`
11. `payments`
12. `exams`
13. `exam_subjects`
14. `marks`
15. `class_schedules`
16. `attendance` (phase 1.5 or v1 if needed immediately)

## Table Drafts

### users
- `id` (uuid, pk)
- `full_name` (varchar)
- `email` (varchar, unique, nullable for phone-login flows)
- `phone` (varchar, unique)
- `password_hash` (text)
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### roles
- `id` (uuid, pk)
- `name` (varchar, unique)  // ADMIN, TEACHER, STUDENT

### user_roles
- `user_id` (uuid, fk -> users.id)
- `role_id` (uuid, fk -> roles.id)
- unique (`user_id`, `role_id`)

### students
- `id` (uuid, pk)
- `user_id` (uuid, fk -> users.id, unique)
- `admission_no` (varchar, unique)
- `guardian_name` (varchar)
- `guardian_phone` (varchar)
- `address` (text)
- `date_of_birth` (date, nullable)
- `status` (varchar) // ACTIVE, INACTIVE
- `created_at`, `updated_at`

### teachers
- `id` (uuid, pk)
- `user_id` (uuid, fk -> users.id, unique)
- `employee_code` (varchar, unique)
- `qualification` (varchar, nullable)
- `salary_type` (varchar, nullable) // MONTHLY, PER_CLASS
- `status` (varchar)
- `created_at`, `updated_at`

### batches
- `id` (uuid, pk)
- `name` (varchar) // e.g., Class 10 Evening Batch A
- `academic_year` (varchar)
- `start_date` (date)
- `end_date` (date, nullable)
- `status` (varchar) // ACTIVE, CLOSED
- `created_at`, `updated_at`

### subjects
- `id` (uuid, pk)
- `name` (varchar)
- `code` (varchar, unique, nullable)
- `created_at`, `updated_at`

### batch_subject_teachers
- `id` (uuid, pk)
- `batch_id` (uuid, fk -> batches.id)
- `subject_id` (uuid, fk -> subjects.id)
- `teacher_id` (uuid, fk -> teachers.id)
- unique (`batch_id`, `subject_id`, `teacher_id`)

### student_batches
- `id` (uuid, pk)
- `student_id` (uuid, fk -> students.id)
- `batch_id` (uuid, fk -> batches.id)
- `enrolled_on` (date)
- `is_active` (boolean, default true)
- unique (`student_id`, `batch_id`, `is_active`)

### fee_plans
- `id` (uuid, pk)
- `batch_id` (uuid, fk -> batches.id)
- `name` (varchar) // Monthly Fee, Quarterly Fee, etc.
- `amount` (numeric(10,2))
- `frequency` (varchar) // MONTHLY, ONE_TIME
- `due_day` (smallint, nullable)
- `created_at`, `updated_at`

### payments
- `id` (uuid, pk)
- `student_id` (uuid, fk -> students.id)
- `fee_plan_id` (uuid, fk -> fee_plans.id)
- `amount_paid` (numeric(10,2))
- `payment_date` (date)
- `payment_method` (varchar) // CASH, UPI, CARD, BANK
- `reference_no` (varchar, nullable)
- `notes` (text, nullable)
- `created_at`, `updated_at`

### exams
- `id` (uuid, pk)
- `batch_id` (uuid, fk -> batches.id)
- `name` (varchar) // Unit Test 1, Mid Term
- `exam_date` (date, nullable)
- `status` (varchar) // DRAFT, OPEN, PUBLISHED
- `created_at`, `updated_at`

### exam_subjects
- `id` (uuid, pk)
- `exam_id` (uuid, fk -> exams.id)
- `subject_id` (uuid, fk -> subjects.id)
- `max_marks` (integer)
- unique (`exam_id`, `subject_id`)

### marks
- `id` (uuid, pk)
- `exam_subject_id` (uuid, fk -> exam_subjects.id)
- `student_id` (uuid, fk -> students.id)
- `marks_obtained` (numeric(5,2))
- `remarks` (varchar, nullable)
- unique (`exam_subject_id`, `student_id`)

### class_schedules
- `id` (uuid, pk)
- `batch_id` (uuid, fk -> batches.id)
- `subject_id` (uuid, fk -> subjects.id)
- `teacher_id` (uuid, fk -> teachers.id)
- `day_of_week` (smallint) // 1-7
- `start_time` (time)
- `end_time` (time)
- `room_no` (varchar, nullable)

## Relationship Summary

- One `user` can be linked to one `student` or one `teacher` profile.
- One `batch` has many students, subjects, schedules, exams, and fee plans.
- One `exam` has many `exam_subjects`; each `exam_subject` has many `marks`.
- Payments are student-specific and tied to a fee plan.

## Recommended Indexes

- `users(email)`, `users(phone)`
- `students(admission_no)`
- `teachers(employee_code)`
- `student_batches(student_id, is_active)`
- `payments(student_id, payment_date)`
- `exams(batch_id, status)`
- `marks(student_id)`

## API Implementation Order (based on DB)

1. Auth + Users + Roles
2. Students + Teachers
3. Batches + Subjects + Mapping
4. Fee Plans + Payments
5. Exams + Marks
6. Schedules (+ Attendance)

## Open Decisions

- Should a student be allowed in multiple active batches at the same time?
- Is fee plan per batch enough, or do we need student-specific discounts in v1?
- Do we support parent accounts in v1 or v1.5?
