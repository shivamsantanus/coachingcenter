# ClassNova DB Design v1 (PostgreSQL)

## Design Principles

- Build for multi-tenant SaaS from the beginning.
- Keep schema normalized for core entities.
- Scope business data to a tenant by default.
- Use UUID primary keys for scalable distributed usage.
- Track `created_at` and `updated_at` in major tables.
- Support configuration instead of hardcoded business rules.
- Make room for branches, feature flags, and usage tiers.

## Tenant Strategy

ClassNova should use a tenant-centric data model.

Each school or coaching centre is a `tenant`.
Most operational tables must include `tenant_id`.

This gives us:
- strong tenant isolation
- easier scaling across many organizations
- cleaner reporting boundaries
- future support for plan limits, feature flags, and white-label behavior

## Core Entities

1. `tenants`
2. `tenant_settings`
3. `tenant_features`
4. `branches`
5. `users`
6. `roles`
7. `tenant_user_roles`
8. `students`
9. `teachers`
10. `academic_years`
11. `classes`
12. `batches`
13. `subjects`
14. `batch_subject_teachers`
15. `student_enrollments`
16. `fee_plans`
17. `payments`
18. `exams`
19. `exam_subjects`
20. `marks`
21. `class_schedules`
22. `audit_logs`

## Table Drafts

### tenants
- `id` (uuid, pk)
- `name` (varchar)
- `slug` (varchar, unique)
- `organization_type` (varchar) // SCHOOL, COACHING_CENTRE, ACADEMY
- `status` (varchar) // ACTIVE, SUSPENDED, TRIAL
- `primary_contact_name` (varchar)
- `primary_contact_email` (varchar)
- `primary_contact_phone` (varchar)
- `plan_code` (varchar, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### tenant_settings
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id, unique)
- `brand_name` (varchar)
- `logo_url` (text, nullable)
- `primary_color` (varchar, nullable)
- `timezone` (varchar)
- `currency_code` (varchar)
- `academic_label_class` (varchar, nullable)
- `academic_label_batch` (varchar, nullable)
- `academic_label_section` (varchar, nullable)
- `default_attendance_mode` (varchar, nullable)
- `default_grading_mode` (varchar, nullable)
- `created_at`, `updated_at`

### tenant_features
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `feature_key` (varchar) // FEES, EXAMS, ATTENDANCE, PARENTS_PORTAL
- `is_enabled` (boolean, default true)
- unique (`tenant_id`, `feature_key`)

### branches
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `name` (varchar)
- `code` (varchar, nullable)
- `address` (text, nullable)
- `phone` (varchar, nullable)
- `status` (varchar)
- `created_at`, `updated_at`

### users
- `id` (uuid, pk)
- `full_name` (varchar)
- `email` (varchar, nullable)
- `phone` (varchar, nullable)
- `password_hash` (text)
- `is_active` (boolean, default true)
- `last_login_at` (timestamp, nullable)
- `created_at`, `updated_at`

Note:
Users should be globally unique identities. Their permissions and organization access should be mapped separately.

### roles
- `id` (uuid, pk)
- `code` (varchar, unique) // PLATFORM_ADMIN, ORG_ADMIN, TEACHER, STUDENT
- `name` (varchar)

### tenant_user_roles
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `user_id` (uuid, fk -> users.id)
- `role_id` (uuid, fk -> roles.id)
- `status` (varchar) // ACTIVE, INVITED, DISABLED
- unique (`tenant_id`, `user_id`, `role_id`, `branch_id`)

### students
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `user_id` (uuid, fk -> users.id, nullable)
- `admission_no` (varchar)
- `guardian_name` (varchar)
- `guardian_phone` (varchar)
- `address` (text)
- `date_of_birth` (date, nullable)
- `status` (varchar) // ACTIVE, INACTIVE
- `created_at`, `updated_at`
- unique (`tenant_id`, `admission_no`)

### teachers
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `user_id` (uuid, fk -> users.id, nullable)
- `employee_code` (varchar)
- `qualification` (varchar, nullable)
- `salary_type` (varchar, nullable) // MONTHLY, PER_CLASS
- `status` (varchar)
- `created_at`, `updated_at`
- unique (`tenant_id`, `employee_code`)

### academic_years
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `name` (varchar) // 2026-2027
- `start_date` (date)
- `end_date` (date)
- `is_active` (boolean, default false)
- `created_at`, `updated_at`

### classes
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `academic_year_id` (uuid, fk -> academic_years.id)
- `name` (varchar)
- `sort_order` (integer, nullable)
- `status` (varchar)
- `created_at`, `updated_at`

### batches
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `academic_year_id` (uuid, fk -> academic_years.id)
- `class_id` (uuid, fk -> classes.id, nullable)
- `name` (varchar)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `status` (varchar)
- `created_at`, `updated_at`

### subjects
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `name` (varchar)
- `code` (varchar, nullable)
- `created_at`, `updated_at`
- unique (`tenant_id`, `code`)

### batch_subject_teachers
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `batch_id` (uuid, fk -> batches.id)
- `subject_id` (uuid, fk -> subjects.id)
- `teacher_id` (uuid, fk -> teachers.id)
- unique (`tenant_id`, `batch_id`, `subject_id`, `teacher_id`)

### student_enrollments
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `student_id` (uuid, fk -> students.id)
- `class_id` (uuid, fk -> classes.id, nullable)
- `batch_id` (uuid, fk -> batches.id, nullable)
- `enrolled_on` (date)
- `is_active` (boolean, default true)

### fee_plans
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `batch_id` (uuid, fk -> batches.id, nullable)
- `name` (varchar)
- `category` (varchar) // TUITION, ADMISSION, EXAM, TRANSPORT
- `amount` (numeric(10,2))
- `frequency` (varchar) // MONTHLY, QUARTERLY, ONE_TIME
- `due_day` (smallint, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

### payments
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
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
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `academic_year_id` (uuid, fk -> academic_years.id)
- `batch_id` (uuid, fk -> batches.id)
- `name` (varchar)
- `exam_type` (varchar) // UNIT_TEST, MID_TERM, FINAL
- `exam_date` (date, nullable)
- `status` (varchar) // DRAFT, OPEN, PUBLISHED
- `created_at`, `updated_at`

### exam_subjects
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `exam_id` (uuid, fk -> exams.id)
- `subject_id` (uuid, fk -> subjects.id)
- `max_marks` (integer)
- unique (`tenant_id`, `exam_id`, `subject_id`)

### marks
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `exam_subject_id` (uuid, fk -> exam_subjects.id)
- `student_id` (uuid, fk -> students.id)
- `marks_obtained` (numeric(5,2))
- `remarks` (varchar, nullable)
- unique (`tenant_id`, `exam_subject_id`, `student_id`)

### class_schedules
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id)
- `branch_id` (uuid, fk -> branches.id, nullable)
- `batch_id` (uuid, fk -> batches.id)
- `subject_id` (uuid, fk -> subjects.id)
- `teacher_id` (uuid, fk -> teachers.id)
- `day_of_week` (smallint) // 1-7
- `start_time` (time)
- `end_time` (time)
- `room_no` (varchar, nullable)

### audit_logs
- `id` (uuid, pk)
- `tenant_id` (uuid, fk -> tenants.id, nullable)
- `user_id` (uuid, fk -> users.id, nullable)
- `entity_name` (varchar)
- `entity_id` (uuid, nullable)
- `action` (varchar) // CREATE, UPDATE, DELETE, LOGIN
- `metadata_json` (jsonb, nullable)
- `created_at` (timestamp)

## Relationship Summary

- One `tenant` has one `tenant_settings` record and many branches, users, students, teachers, fee plans, exams, and schedules.
- One global `user` can belong to multiple tenants through `tenant_user_roles`.
- One `tenant` can define its own academic structure, subject catalog, fee structure, and exam behavior.
- Most operational records must be queryable by `tenant_id`.

## Recommended Indexes

- `tenants(slug)`
- `tenant_user_roles(tenant_id, user_id)`
- `students(tenant_id, admission_no)`
- `teachers(tenant_id, employee_code)`
- `student_enrollments(tenant_id, student_id, is_active)`
- `payments(tenant_id, student_id, payment_date)`
- `exams(tenant_id, batch_id, status)`
- `marks(tenant_id, student_id)`
- `audit_logs(tenant_id, created_at)`

## API Implementation Order (based on DB)

1. Tenants + Tenant Settings + Tenant Features
2. Auth + Users + Tenant User Roles
3. Students + Teachers
4. Academic Years + Classes + Batches + Subjects
5. Fee Plans + Payments
6. Exams + Marks
7. Schedules + Audit Logs

## Open Decisions

- Should a user be allowed across multiple tenants from day one?
- How much branch support is required in v1 versus v1.5?
- Do we need plan-based usage limits in the first release?
- Should grading rules be table-driven in v1 or added in v1.5?
