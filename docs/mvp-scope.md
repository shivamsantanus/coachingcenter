# ClassNova MVP Scope (v1)

## Product Direction

ClassNova is a configurable SaaS product that will be sold to multiple schools and coaching centres.

The platform must support:
- multiple organizations on the same product
- tenant-specific branding, settings, and academic workflows
- configurable modules instead of hardcoded assumptions
- scale based on number of organizations, branches, users, and records

## Goal

Build the first usable multi-tenant version of ClassNova that allows each school or coaching centre to run daily operations inside its own isolated workspace.

The v1 product should support:
- organization onboarding
- user authentication with tenant context
- configurable academic setup
- student and teacher management
- fees tracking
- timetable management
- basic exams and results

## Core Product Principles

1. Multi-tenant by default
Every important business record must belong to an organization or tenant.

2. Configuration over hardcoding
Academic years, class naming, exam types, fee structures, grading systems, attendance rules, and branding should be configurable.

3. Modular growth
The product should allow new modules, branches, usage tiers, and premium features without redesigning the core.

4. Operational isolation
Each tenant should only be able to access its own users, students, payments, schedules, and reports.

## Tenant Model

Each customer organization should have:
- its own tenant account
- its own users and permissions
- its own academic structure
- its own settings and branding
- optional multiple branches or campuses

Examples:
- one coaching centre with a single branch
- one school with multiple campuses
- one coaching brand with separate academic units

## Users and Roles

Global or platform-side roles:
- `Platform Admin`: manages product-level operations, onboarding, support, and tenant administration

Tenant-side roles:
- `Organization Admin`: full control inside one tenant
- `Branch Admin` (optional in v1 if branch support is active): manages branch-level operations
- `Teacher`: manages classes, marks, schedules, and assigned work
- `Student`: views own profile, fees, timetable, and results
- `Parent` (optional in v1.5): read-only access to linked student information

## In-Scope Features (Must Have)

1. Multi-tenant organization setup
   - create organization or tenant
   - store tenant profile, branding, and status
   - support isolated data access per tenant

2. Authentication and authorization
   - login/logout
   - tenant-aware authentication
   - role-based route and API protection

3. Tenant configuration
   - organization profile and branding
   - academic year setup
   - naming preferences for class, batch, section, and subject structures
   - configurable feature toggles for enabled modules

4. Student management
   - add/edit student profile
   - assign student to class, batch, or section depending on tenant configuration
   - store core fields like contact, guardian, address, status

5. Teacher management
   - add/edit teacher profile
   - assign teacher to subjects, classes, batches, or branches

6. Academic structure management
   - create classes, batches, sections, or groups
   - support tenant-specific academic terminology where possible
   - assign subjects and teachers
   - enroll/remove students

7. Fees and payments
   - define fee plans
   - support tenant-specific fee categories and cycles
   - record payment entries
   - show pending and paid status

8. Timetable and scheduling
   - create weekly schedules
   - view by teacher, class, batch, or branch

9. Exams and results
   - create exam records
   - support configurable exam types
   - enter marks
   - publish results for students

10. Dashboard
   - tenant-scoped quick stats
   - key operational summaries like students, fees due, upcoming exams, and classes

## Out of Scope (For Later Phases)

- billing and subscription automation
- custom domain support
- advanced analytics and BI reporting
- payroll automation and complex salary rules
- bulk campaign automation for SMS or WhatsApp
- live classes and meeting integrations
- white-label mobile apps
- deep parent portal workflows

## Configurable Areas in v1

The following should be designed as configurable from the beginning:
- organization name, logo, and branding
- academic year format
- class or batch naming
- subject catalog
- exam types
- fee plan frequency and categories
- payment methods supported by a tenant
- grading or result publishing options
- enabled or disabled modules by tenant

## Role Permission Matrix (v1)

| Module | Platform Admin | Organization Admin | Teacher | Student |
|---|---|---|---|---|
| Tenants | Full | No | No | No |
| Users/Roles | Limited platform control | Full within tenant | No | No |
| Tenant Settings | Full support access | Full within tenant | No | No |
| Student Profiles | No direct daily use | Full | Read assigned | Self only |
| Teacher Profiles | No direct daily use | Full | Self edit | No |
| Academic Structure | No direct daily use | Full | Read assigned | Read own |
| Fees | No direct daily use | Full | Read | Read own |
| Timetable | No direct daily use | Full | Read own or assigned | Read own |
| Exams/Results | No direct daily use | Full | Enter marks for assigned | Read own |

## Core User Flows (v1)

1. Organization onboarding
   `Create tenant -> configure profile -> enable modules -> create admin user`

2. Academic setup
   `Create academic year -> create class or batch structure -> assign subjects and teachers`

3. Student admission
   `Create student profile -> assign to class or batch -> activate account`

4. Fee collection
   `Define fee plan -> record payment -> update due balance -> display status`

5. Exam lifecycle
   `Create exam -> teacher enters marks -> admin publishes result -> student views result`

## Success Criteria for MVP

- Multiple organizations can use the same product with isolated data.
- Each tenant can configure its own academic and operational setup.
- Organization admins can manage students, teachers, classes, fees, and exams end to end.
- Teachers can operate assigned academic work inside tenant boundaries.
- Students can log in and view their own academic and fee information.

## Immediate Next Steps

1. Redesign the data model around tenants and tenant-scoped records
2. Define tenant-aware API contracts for auth and core modules
3. Add tenant settings and feature configuration tables
4. Refactor frontend boot flow to load tenant context after login
