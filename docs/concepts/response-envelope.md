# ASP.NET Core Response Envelope

## What it is

A response envelope is a consistent JSON wrapper that every API endpoint returns, regardless of success or failure. Instead of returning raw data or bare HTTP error codes, every response has the same shape so the frontend never has to guess what to expect.

## Why we use it in ClassNova

Without an envelope, different endpoints might return a bare array, a bare object, an HTTP 400 with a string, or an HTTP 200 with an error message — all inconsistently. The frontend would need special handling per endpoint. The envelope solves this: one response shape, one parsing strategy everywhere.

## How we use it — with examples

**Shape (Rule 11 in CLAUDE.md):**

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "error": "Invalid credentials"
}
```

**In a controller (C#):**

```csharp
// Success
return Ok(new { success = true, data = studentDto, error = (string?)null });

// Failure (validation, not found, etc.) — still HTTP 200 with success:false
return Ok(new { success = false, data = (object?)null, error = "Student not found" });
```

**Consuming on the frontend (TypeScript):**

```typescript
this.studentService.getStudents().subscribe({
  next: response => {
    if (response.success) {
      this.students.set(response.data);
    } else {
      this.errorMessage.set(response.error);
    }
  },
  error: httpError => {
    // Network failure, 500, etc. — a true HTTP error
    this.errorMessage.set('Something went wrong. Please try again.');
  }
});
```

## Key rules / gotchas

- **Always return HTTP 200** for business-logic failures (wrong password, not found) with `success: false`. Reserve HTTP 4xx/5xx for genuine protocol errors (malformed request, server crash).
- **Never return a bare string, bare array, or raw entity** — always wrap.
- **`error` must be human-readable** — it's shown directly to the user on the frontend.
- **`data` is `null` on failure; `error` is `null` on success** — never both populated, never both null on success.

## Where to find it in the codebase

Every `*Controller.cs` file returns this envelope. See `AuthController.cs` and `StudentsController.cs` for canonical examples.
