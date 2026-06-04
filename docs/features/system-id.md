# Feature: System ID

## What it is
Every real-world entity in ClassNova gets a human-readable, tenant-scoped, globally-unique system identifier stored as `system_id char(28)`. It is an internal reference field only — not a primary key, not a foreign key, not used in JOINs.

## Format
```
{TenantCode}-{PREFIX}-{UnixMs}-{UUID4}
BF000-CNS-1748600123456-A3F2
└───┘ └─┘ └───────────┘ └──┘
  5    3        13        4   = 28 chars exactly
```

- **TenantCode** — 5 chars, uppercase, padded with `0`. Derived from slug initials: `bright-future` → `BF` → `BF000`
- **Prefix** — 3 chars entity type code (CNT, CNS, etc.)
- **UnixMs** — milliseconds since Unix epoch at row creation time (13 digits, valid until 2286)
- **UUID4** — first 4 hex chars of the row's own UUID PK, uppercase (collision breaker)

## Entity prefix table
| Entity | Prefix | Example |
|---|---|---|
| Teacher | `CNT` | `BF000-CNT-1748600123456-A3F2` |
| Student | `CNS` | `BF000-CNS-1748600123456-B7C1` |
| User (ORG_ADMIN) | `CNA` | `BF000-CNA-1748600123456-D4E9` |
| Branch | `BRN` | `BF000-BRN-1748600123456-F2A8` |
| Batch | `BAT` | `BF000-BAT-1748600123456-C5D3` |
| Class | `CLS` | `BF000-CLS-1748600123456-E1B6` |
| Academic Year | `ACY` | `BF000-ACY-1748600123456-A9F4` |
| Fee Plan | `FPL` | `BF000-FPL-1748600123456-B3C7` |
| Payment/Receipt | `RCT` | `BF000-RCT-1748600123456-D8E2` |
| Exam | `EXM` | `BF000-EXM-1748600123456-F6A1` |

## DB schema changes
| Table | Column | Type | Notes |
|---|---|---|---|
| `tenants` | `code` | `char(5)` | Auto-derived from slug on create |
| `teachers` | `system_id` | `char(28)` | Unique index |
| `students` | `system_id` | `char(28)` | Unique index |
| `users` | `system_id` | `char(28)` | Unique index, nullable (platform admin has no system_id) |
| `branches` | `system_id` | `char(28)` | Unique index |
| `batches` | `system_id` | `char(28)` | Unique index |
| `classes` | `system_id` | `char(28)` | Unique index |
| `academic_years` | `system_id` | `char(28)` | Unique index |
| `fee_plans` | `system_id` | `char(28)` | Unique index |
| `payments` | `system_id` | `char(28)` | Unique index |
| `exams` | `system_id` | `char(28)` | Unique index |

## Generation — SystemIdService
```csharp
SystemIdService.Generate(tenantCode, "CNS", student.Id)
// → "BF000-CNS-1748600123456-A3F2"

SystemIdService.DeriveTenantCode("bright-future")
// → "BF000"
```

## Critical rules (enforced in CLAUDE.md)
- `system_id` is NEVER a PK or FK — all relations use UUID
- `system_id` is NEVER used in WHERE/JOIN conditions
- Generated server-side only — never accepted from client input
- `char(28)` always — never varchar (fixed length = faster index)
- Login stays email + password — system_id is internal reference only

## What does NOT get system_id
Junction/log tables: `attendance`, `marks`, `student_enrollments`, `batch_subject_teachers`, `tenant_user_roles`, `audit_logs`
