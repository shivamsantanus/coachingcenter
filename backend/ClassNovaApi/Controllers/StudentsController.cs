using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public StudentsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public IActionResult GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] bool availableForBatchEnrollment = false)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Students.Where(s => s.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(s =>
                    s.FullName.ToLower().Contains(term) ||
                    s.AdmissionNo.ToLower().Contains(term) ||
                    s.GuardianName.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status.ToUpper());

            // Only active students not currently enrolled in any batch
            if (availableForBatchEnrollment)
            {
                query = query.Where(s => s.Status == "ACTIVE");
                var enrolledStudentIds = _context.StudentEnrollments
                    .Where(e => e.TenantId == tenantId && e.BatchId != null && e.IsActive)
                    .Select(e => e.StudentId)
                    .Distinct();
                query = query.Where(s => !enrolledStudentIds.Contains(s.Id));
            }

            var total = query.Count();

            var data = query
                .OrderBy(s => s.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    s.Id,
                    s.FullName,
                    s.AdmissionNo,
                    s.GuardianName,
                    s.GuardianPhone,
                    s.DateOfBirth,
                    s.Status,
                    s.PhotoUrl,
                    s.BranchId,
                    s.CreatedAt
                })
                .ToList();

            return Ok(new { total, page, pageSize, data });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var student = _context.Students
                .Where(s => s.TenantId == tenantId && s.Id == id)
                .Select(s => new
                {
                    s.Id,
                    s.FullName,
                    s.AdmissionNo,
                    s.GuardianName,
                    s.GuardianPhone,
                    s.Address,
                    s.DateOfBirth,
                    s.Status,
                    s.PhotoUrl,
                    s.BranchId,
                    s.UserId,
                    s.CreatedAt,
                    s.UpdatedAt
                })
                .FirstOrDefault();

            if (student == null)
                return NotFound(new { error = "Student not found." });

            return Ok(student);
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateStudentRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var email    = request.Email.Trim().ToLower();

            if (_context.Students.Any(s => s.TenantId == tenantId && s.AdmissionNo == request.AdmissionNo))
                return BadRequest(new { success = false, data = (object?)null, error = "Admission number already exists." });

            if (_context.Users.Any(u => u.Email == email))
                return BadRequest(new { success = false, data = (object?)null, error = "A user with this email already exists." });

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);
                if (!branchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Branch not found." });
            }

            var tenantCode  = _context.Tenants.Where(t => t.Id == tenantId).Select(t => t.Code.Trim()).First();
            var studentRole = _context.Roles.First(r => r.Code == "STUDENT");
            var oneTimePass = GenerateOneTimePassword();
            var now         = DateTime.UtcNow;

            var userId = Guid.NewGuid();
            var user   = new User
            {
                Id              = userId,
                FullName        = request.FullName,
                Email           = email,
                PasswordHash    = BCrypt.Net.BCrypt.HashPassword(oneTimePass),
                IsActive        = true,
                IsEmailVerified = true,
                IsFirstLogin    = true,
                CreatedAt       = now,
                UpdatedAt       = now
            };

            var tenantUserRole = new TenantUserRole
            {
                Id       = Guid.NewGuid(),
                TenantId = tenantId,
                UserId   = userId,
                RoleId   = studentRole.Id,
                Status   = "ACTIVE"
            };

            var studentId = Guid.NewGuid();
            var student   = new Student
            {
                Id            = studentId,
                TenantId      = tenantId,
                UserId        = userId,
                BranchId      = request.BranchId,
                FullName      = request.FullName,
                Email         = email,
                AdmissionNo   = request.AdmissionNo,
                GuardianName  = request.GuardianName,
                GuardianPhone = request.GuardianPhone,
                Address       = request.Address,
                DateOfBirth   = request.DateOfBirth,
                Status        = "ACTIVE",
                SystemId      = SystemIdService.Generate(tenantCode, SystemIdService.Student, studentId),
                CreatedAt     = now,
                UpdatedAt     = now
            };

            _context.Users.Add(user);
            _context.TenantUserRoles.Add(tenantUserRole);
            _context.Students.Add(student);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new
                {
                    student.Id,
                    student.FullName,
                    student.AdmissionNo,
                    student.Status,
                    student.SystemId,
                    loginEmail      = email,
                    oneTimePassword = oneTimePass,
                    message         = "Share these credentials with the student. The password cannot be retrieved again."
                },
                error = (string?)null
            });
        }

        private static string GenerateOneTimePassword()
        {
            const string chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
            return RandomNumberGenerator.GetString(chars, 10);
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateStudentRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var student = _context.Students.FirstOrDefault(s => s.TenantId == tenantId && s.Id == id);

            if (student == null)
                return NotFound(new { error = "Student not found." });

            if (request.AdmissionNo != null && request.AdmissionNo != student.AdmissionNo)
            {
                if (_context.Students.Any(s => s.TenantId == tenantId && s.AdmissionNo == request.AdmissionNo))
                    return BadRequest(new { error = "Admission number already exists." });
                student.AdmissionNo = request.AdmissionNo;
            }

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);
                if (!branchExists)
                    return BadRequest(new { error = "Branch not found." });
            }

            if (request.FullName != null)      student.FullName      = request.FullName;
            if (request.GuardianName != null)  student.GuardianName  = request.GuardianName;
            if (request.GuardianPhone != null) student.GuardianPhone = request.GuardianPhone;
            if (request.Address != null)       student.Address       = request.Address;
            if (request.DateOfBirth.HasValue)  student.DateOfBirth   = request.DateOfBirth;
            if (request.BranchId.HasValue)     student.BranchId      = request.BranchId;

            student.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { message = "Student updated successfully." });
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var allowed = new[] { "ACTIVE", "INACTIVE" };
            if (!allowed.Contains(request.Status))
                return BadRequest(new { error = "Status must be ACTIVE or INACTIVE." });

            var tenantId = User.GetTenantId();
            var student = _context.Students.FirstOrDefault(s => s.TenantId == tenantId && s.Id == id);

            if (student == null)
                return NotFound(new { error = "Student not found." });

            student.Status = request.Status;
            student.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { message = "Status updated.", status = student.Status });
        }

        [HttpPost("{id:guid}/photo")]
        public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var student = _context.Students.FirstOrDefault(s => s.TenantId == tenantId && s.Id == id);

            if (student == null)
                return NotFound(new { error = "Student not found." });

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType))
                return BadRequest(new { error = "Only JPG, PNG, or WebP images are allowed." });

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(new { error = "Image must be smaller than 2 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var folder = Path.Combine(webRoot, "uploads", "students", tenantId.ToString());
            Directory.CreateDirectory(folder);

            // Delete old photo if present
            if (!string.IsNullOrEmpty(student.PhotoUrl))
            {
                var oldPath = Path.Combine(webRoot, student.PhotoUrl.TrimStart('/'));
                if (System.IO.File.Exists(oldPath))
                    System.IO.File.Delete(oldPath);
            }

            var fileName = $"{id}{ext}";
            var filePath = Path.Combine(folder, fileName);

            using (var stream = System.IO.File.Create(filePath))
                await file.CopyToAsync(stream);

            student.PhotoUrl = $"/uploads/students/{tenantId}/{fileName}";
            student.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { photoUrl = student.PhotoUrl });
        }
    }
}
