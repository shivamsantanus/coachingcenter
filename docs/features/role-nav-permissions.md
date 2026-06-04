# Feature: Role-Based Navigation Permissions

## What it is
ORG_ADMIN can toggle which navigation tabs are visible to TEACHER and STUDENT roles through a settings UI — no code change needed. Changes take effect immediately on the next page load.

## Key rule
Tab visibility is a **UX control only**. Backend API security is enforced independently in each controller. Showing a tab to a role does not grant API access — those checks must be updated separately by the dev team.

## Navigation items (seeded at startup)

| Key | Label | Icon | Admin Only | Locked |
|---|---|---|---|---|
| `dashboard` | Dashboard | pi-home | false | **true** — always shown to everyone |
| `students` | Students | pi-users | false | false |
| `academic` | Academic | pi-book | false | false |
| `attendance` | Attendance | pi-calendar-clock | false | false |
| `fees` | Fees | pi-wallet | false | false |
| `exams` | Exams | pi-file-edit | false | false |
| `timetable` | Timetable | pi-calendar | false | false |
| `teachers` | Teachers | pi-graduation-cap | **true** | false — never in matrix |
| `settings` | Settings | pi-cog | **true** | **true** — always shown to ORG_ADMIN |

## Default permissions (used when no DB entry exists)
| Role | Default visible tabs |
|---|---|
| `TEACHER` | dashboard, academic, attendance |
| `STUDENT` | dashboard |

## DB schema
| Table | Columns |
|---|---|
| `navigation_items` | `key` varchar PK, `label`, `icon`, `route_path`, `sort_order`, `is_admin_only`, `is_locked` |
| `role_nav_permissions` | `id` uuid PK, `tenant_id` FK, `role_code` varchar, `nav_item_key` varchar, `is_enabled` bool |

Unique index on `role_nav_permissions`: `(tenant_id, role_code, nav_item_key)`

## API
| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/navigation/my-nav` | Any | Returns tabs for current user's role — used by Shell on init |
| `GET /api/navigation/permissions` | ORG_ADMIN | Returns full matrix for the settings UI |
| `PUT /api/navigation/permissions` | ORG_ADMIN | Saves toggled permissions |

## my-nav logic
- **ORG_ADMIN**: all navigation items (admin-only + regular)
- **TEACHER / STUDENT**: locked items always + items enabled in `role_nav_permissions` for their tenant+role. If no DB entries exist yet → use hardcoded defaults above. Admin-only items are never included.

## Settings UI
- Lives at `/settings/role-permissions` (ORG_ADMIN only)
- Matrix table: rows = non-admin-only non-locked items, columns = [TEACHER, STUDENT]
- Dashboard row shown but toggle disabled (locked)
- Toggle saves immediately via `PUT /api/navigation/permissions`
