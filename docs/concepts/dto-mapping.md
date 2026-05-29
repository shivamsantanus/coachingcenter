# DTO Mapping

## What it is

A DTO (Data Transfer Object) is a plain class/interface used exclusively to carry data across a boundary — typically between the API layer and the client. It contains only the fields the client needs to see or send, with no EF Core navigation properties, no change-tracking metadata, and no internal fields.

Mapping is the act of converting an EF entity (the DB model) into a DTO (the API model) before returning it, or converting an incoming DTO into an entity before saving it.

## Why we use it in ClassNova

Returning raw EF entities would:
- Expose internal fields (`PasswordHash`, `TenantId`, internal audit flags) to the client.
- Cause infinite JSON serialisation loops when EF navigation properties reference each other.
- Couple the API contract to the DB schema — a column rename would break all clients.

DTOs decouple these layers. The DB schema can change without touching the API contract, and vice versa.

## How we use it — with examples

**Response DTO** (`Models/StudentDto.cs`):

```csharp
public class StudentDto
{
    public Guid   Id            { get; set; }
    public string FullName      { get; set; } = "";
    public string AdmissionNo   { get; set; } = "";
    public string Status        { get; set; } = "";
    public string? PhotoUrl     { get; set; }
    // No TenantId, no PasswordHash, no EF navigation properties
}
```

**Mapping entity → DTO in the controller:**

```csharp
var dto = new StudentDto
{
    Id          = student.Id,
    FullName    = student.FullName,
    AdmissionNo = student.AdmissionNo,
    Status      = student.Status,
    PhotoUrl    = student.PhotoUrl
};
return Ok(new { success = true, data = dto, error = (string?)null });
```

**Using `.Select()` to map in the query itself (more efficient — fewer columns fetched):**

```csharp
var students = await _db.Students
    .Where(s => s.TenantId == tenantId)
    .Select(s => new StudentDto
    {
        Id       = s.Id,
        FullName = s.FullName,
        ...
    })
    .ToListAsync();
```

**Request DTO** (what the client sends):

```csharp
public class CreateStudentRequest
{
    [Required] [MaxLength(100)] public string FullName    { get; set; } = "";
    [Required] [MaxLength(20)]  public string AdmissionNo { get; set; } = "";
    // Only fields the client is allowed to set
}
```

**Frontend TypeScript interface** (`models/student.model.ts`):

```typescript
// Mirrors the backend StudentDto exactly
export interface StudentDto {
  id:          string;
  fullName:    string;
  admissionNo: string;
  status:      string;
  photoUrl?:   string;
}
```

## Key rules / gotchas

- **Never return a raw EF entity** from a controller — always map to a DTO first (Rule 10).
- **DTOs live in `Models/`** alongside the relevant controller.
- **TypeScript interfaces for every DTO** must be defined in `frontend/src/app/models/` — no `any`.
- **`.Select()` mapping is preferred over load-then-map** because EF Core only fetches the projected columns from the DB.
- **Request DTOs must have validation attributes** (`[Required]`, `[MaxLength]`, `[Range]`) — they are the first line of input validation.

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `backend/ClassNovaApi/Models/` | All DTOs and request models |
| `frontend/src/app/models/` | TypeScript interfaces matching each DTO |
| `backend/ClassNovaApi/Controllers/StudentsController.cs` | Canonical mapping examples |
