# BCrypt Password Hashing

## What it is

BCrypt is a password hashing algorithm designed to be intentionally slow, making brute-force attacks expensive. It generates a unique random salt per password automatically and embeds it in the output hash — so two users with the same password get different hashes. The output is a fixed 60-character string like `$2a$11$...`.

## Why we use it in ClassNova

Storing plaintext passwords or simple MD5/SHA hashes would be a critical security vulnerability. BCrypt is the standard for password storage because:
- Its built-in salt prevents rainbow table attacks.
- The cost factor (`11` by default in BCrypt.Net) means each verification takes ~100ms — negligible for legitimate users, ruinous for attackers trying millions of guesses.

## How we use it — with examples

**Hashing on registration** (`AuthController.cs`):

```csharp
// BCrypt.Net automatically generates a salt and returns the full hash
string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
user.PasswordHash = passwordHash;
```

**Verifying on login** (`AuthController.cs`):

```csharp
// Compares plaintext password against the stored hash (salt is read from the hash itself)
bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
if (!isPasswordCorrect)
    return Ok(new { success = false, error = "Invalid credentials" });
```

## Key rules / gotchas

- **Never store plaintext passwords** — only `PasswordHash` is persisted in the `users` table.
- **Never log passwords** — not even temporarily during debugging (Rule 15 / Rule 18).
- **`BCrypt.Verify` is constant-time** — do not short-circuit it with your own null/length checks before calling it, as that can introduce timing side-channels.
- **Anti-enumeration** — even when a user is not found, the error message must say "Invalid credentials", never "User not found". This prevents attackers from discovering which emails are registered.
- **Column name** in DB: `password_hash` (snake_case via EF Core naming convention).

## Where to find it in the codebase

| Location | Purpose |
|---|---|
| `backend/ClassNovaApi/Controllers/AuthController.cs` | `HashPassword` on register, `Verify` on login |
| `backend/ClassNovaApi/Models/User.cs` | `PasswordHash` property on the entity |
