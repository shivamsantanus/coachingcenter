# ClassNova

## Overview

ClassNova is a web application for managing coaching centers at scale. It is designed to help administrators, teachers, and students handle classes, schedules, payments, exams, results, and communication from one system.

## Current Stack

- Frontend: Angular with PrimeNG, Angular Material, and Firebase Auth integration
- Backend: ASP.NET Core Web API with JWT authentication
- Database: PostgreSQL with Entity Framework Core

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
