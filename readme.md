# ClassNova

## Overview

ClassNova is a configurable SaaS product for schools and coaching centres. It is being designed as a multi-tenant platform so different organizations can run their operations inside isolated workspaces with their own branding, settings, academic structure, and workflows.

## Current Stack

- Frontend: Angular with PrimeNG, Angular Material, and Firebase Auth integration
- Backend: ASP.NET Core Web API with JWT authentication
- Database: PostgreSQL with Entity Framework Core

## Product Direction

- Multi-tenant architecture for many organizations
- Configurable modules and workflows instead of hardcoded logic
- Tenant-specific branding, settings, and academic setup
- Scalable design for branches, users, records, and future plan tiers

## What Exists Today

- Login-first frontend flow
- Angular auth service wired to the backend
- Google sign-in integration hooks in the frontend
- ASP.NET auth endpoints for register, login, and `me`
- JWT token generation and protected API support
- Entity Framework Core setup with PostgreSQL connection configuration
- Initial `User` model, `AppDbContext`, and first migration
- Product planning docs for MVP scope and database design

## Workspace Structure

```text
classnova/
|-- backend/
|   `-- ClassNovaApi/
|-- frontend/
|-- docs/
`-- ClassNova.sln
```
