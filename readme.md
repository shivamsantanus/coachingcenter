# Coaching Center App

## Overview

The Coaching Center App is a web application designed to streamline the management of coaching centers. It allows administrators, teachers, and students to manage classes, schedules, payments, exams, results, and communication—all in one place. The app aims to reduce manual work, improve communication, and provide a clear overview of each student’s progress.

## Key Features

- **Authentication:** Secure login and user management for admins, teachers, and students.
- **Dashboard:** Centralized summary and quick links to key modules.
- **Student Management:** Track profiles, home locations, report cards, and payments.
- **Teacher Management:** Manage teacher profiles, assign schedules, and handle salaries.
- **Reminders:** Automated notifications for important events and deadlines.
- **Scheduling:** Assign and view class schedules.
- **Exams:** Create exams, add questions (question bank), and record results.
- **Payments:** Track and manage student fees and teacher salaries.
- **Report Cards & Results:** Generate, view, and export progress reports.
- **Export/PDF:** Export reports and data to PDF for record-keeping.

## Tech Stack

- **Frontend:** Angular (with PrimeNG for UI components)
- **Backend:** .NET Core Web API
- **Database:** PostgreSQL

## Folder Structure (Planned)

```
coaching-center-app/
│
├── backend/
│   ├── Controllers/
│   ├── Models/
│   ├── Data/
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── modules/
│   │   │   ├── shared/
│   │   │   └── ...
│   │   └── assets/
│   └── angular.json
├── docs/
│   ├── db-design.md
│   ├── api-spec.md
│   └── user-flows.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js & Angular CLI
- .NET SDK
- PostgreSQL

### Setup (Outline)

1. **Clone the repository**

2. **Frontend:**
   - Install dependencies: `npm install`
   - Run: `ng serve`

3. **Backend:**
   - Restore packages and run migrations.
   - Start the API server.

4. **Database:**
   - Ensure PostgreSQL is running and accessible.
   - Update connection strings as needed.

> Detailed setup instructions will be added in `/docs/` as the project progresses.

## Modules

- **Login/Auth**
- **Dashboard**
- **Students** (Profile, Home Location, Report Cards)
- **Teachers** (Profile, Salary)
- **Reminders**
- **Payments**
- **Schedule**
- **Exams** (Results, Question Bank)
- **Export/PDF**