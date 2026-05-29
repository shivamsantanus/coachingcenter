# EF Core ORM

## What it is

Entity Framework Core (EF Core) is .NET's official object-relational mapper. You define C# classes ("entities") and EF Core generates the SQL to create the tables, insert rows, run queries, and handle relationships — all without writing raw SQL. It also manages **database migrations**: versioned snapshots of schema changes that can be applied forward (or rolled back) in order.

## Why we use it in ClassNova

- We need PostgreSQL with 22+ tables and complex foreign-key relationships.
- EF Core handles all schema management via migrations — no manual ALTER TABLE scripts.
- LINQ queries are type-safe and refactor-friendly: renaming a property in C# updates every query that references it.
- The `UseSnakeCaseNamingConvention()` extension automatically maps `TenantId` → `tenant_id` in PostgreSQL without any manual column attributes.

## How we use it — with examples

**Querying — always tenant-scoped** (`StudentsController.cs`):

```csharp
// ALWAYS filter by tenantId first — never omit this
var students = await _db.Students
    .Where(s => s.TenantId == tenantId && s.Status != "DELETED")
    .OrderBy(s => s.FullName)
    .Select(s => new StudentDto { ... })   // map to DTO, never return entity directly
    .ToListAsync();
```

**Adding a record:**

```csharp
var student = new Student { TenantId = tenantId, FullName = request.FullName, ... };
_db.Students.Add(student);
await _db.SaveChangesAsync();
```

**Updating a record:**

```csharp
var student = await _db.Students.FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);
if (student is null) return NotFound(...);
student.FullName = request.FullName;
await _db.SaveChangesAsync();   // EF Core tracks the change and issues UPDATE automatically
```

**Adding a migration:**

```bash
dotnet ef migrations add <MigrationName> --project backend/ClassNovaApi
dotnet ef database update --project backend/ClassNovaApi
```

**Snake_case naming** (`Data/AppDbContext.cs`):

```csharp
protected override void OnConfiguring(DbContextOptionsBuilder options)
    => options.UseNpgsql(connectionString)
              .UseSnakeCaseNamingConvention();   // TenantId → tenant_id automatically
```

## Key rules / gotchas

- **Never modify `AppDbContext.cs` or migration files without asking** — these are locked per CLAUDE.md.
- **Never edit migration files manually** — always use `dotnet ef migrations add`. Manual edits break the migration chain.
- **No raw SQL** — LINQ only, unless raw SQL is explicitly approved.
- **No `.Result` or `.Wait()`** — always `await` async EF methods (`ToListAsync`, `SaveChangesAsync`, etc.).
- **All FK cascades are set to `Restrict`** in `AppDbContext` — EF Core won't auto-delete related records. Delete parent records only after manually handling children.
- **`HasPrecision(10, 2)`** is required on all `decimal` columns that store money.
- **EF Core tracks entities** — if you load an entity and mutate a property, calling `SaveChangesAsync` will issue an UPDATE even without an explicit `.Update()` call. This is by design (change tracking).

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `backend/ClassNovaApi/Data/AppDbContext.cs` | DbSets, FK configuration, naming convention |
| `backend/ClassNovaApi/Migrations/` | All migration files — never edit manually |
| `backend/ClassNovaApi/Models/` | Entity classes + DTOs |
| All `*Controller.cs` files | LINQ query examples throughout |
