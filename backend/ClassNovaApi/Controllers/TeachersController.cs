using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TeachersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public TeachersController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public IActionResult GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Teachers.Where(t => t.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(t =>
                    t.FullName.ToLower().Contains(term) ||
                    t.EmployeeCode.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(t => t.Status == status.ToUpper());

            var total = query.Count();

            var data = query
                .OrderBy(t => t.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.Id,
                    t.FullName,
                    t.EmployeeCode,
                    t.Qualification,
                    t.SalaryType,
                    t.Status,
                    t.PhotoUrl,
                    t.BranchId,
                    t.CreatedAt
                })
                .ToList();

            return Ok(new { total, page, pageSize, data });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var teacher = _context.Teachers
                .Where(t => t.TenantId == tenantId && t.Id == id)
                .Select(t => new
                {
                    t.Id,
                    t.FullName,
                    t.EmployeeCode,
                    t.Qualification,
                    t.SalaryType,
                    t.Status,
                    t.PhotoUrl,
                    t.BranchId,
                    t.UserId,
                    t.CreatedAt,
                    t.UpdatedAt
                })
                .FirstOrDefault();

            if (teacher == null)
                return NotFound(new { error = "Teacher not found." });

            return Ok(teacher);
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateTeacherRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            if (_context.Teachers.Any(t => t.TenantId == tenantId && t.EmployeeCode == request.EmployeeCode))
                return BadRequest(new { error = "Employee code already exists." });

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);
                if (!branchExists)
                    return BadRequest(new { error = "Branch not found." });
            }

            var now = DateTime.UtcNow;
            var teacher = new Teacher
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BranchId = request.BranchId,
                FullName = request.FullName,
                EmployeeCode = request.EmployeeCode,
                Qualification = request.Qualification,
                SalaryType = request.SalaryType,
                Status = "ACTIVE",
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Teachers.Add(teacher);
            _context.SaveChanges();

            return Ok(new { teacher.Id, teacher.FullName, teacher.EmployeeCode, teacher.Status });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateTeacherRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var teacher = _context.Teachers.FirstOrDefault(t => t.TenantId == tenantId && t.Id == id);

            if (teacher == null)
                return NotFound(new { error = "Teacher not found." });

            if (request.EmployeeCode != null && request.EmployeeCode != teacher.EmployeeCode)
            {
                if (_context.Teachers.Any(t => t.TenantId == tenantId && t.EmployeeCode == request.EmployeeCode))
                    return BadRequest(new { error = "Employee code already exists." });
                teacher.EmployeeCode = request.EmployeeCode;
            }

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);
                if (!branchExists)
                    return BadRequest(new { error = "Branch not found." });
            }

            if (request.FullName != null)      teacher.FullName      = request.FullName;
            if (request.Qualification != null) teacher.Qualification = request.Qualification;
            if (request.SalaryType != null)    teacher.SalaryType    = request.SalaryType;
            if (request.BranchId.HasValue)     teacher.BranchId      = request.BranchId;

            teacher.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { message = "Teacher updated successfully." });
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
            var teacher = _context.Teachers.FirstOrDefault(t => t.TenantId == tenantId && t.Id == id);

            if (teacher == null)
                return NotFound(new { error = "Teacher not found." });

            teacher.Status = request.Status;
            teacher.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { message = "Status updated.", status = teacher.Status });
        }

        [HttpPost("{id:guid}/photo")]
        public async Task<IActionResult> UploadPhoto(Guid id, IFormFile file)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var teacher = _context.Teachers.FirstOrDefault(t => t.TenantId == tenantId && t.Id == id);

            if (teacher == null)
                return NotFound(new { error = "Teacher not found." });

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType))
                return BadRequest(new { error = "Only JPG, PNG, or WebP images are allowed." });

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(new { error = "Image must be smaller than 2 MB." });

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var folder = Path.Combine(_env.WebRootPath, "uploads", "teachers", tenantId.ToString());
            Directory.CreateDirectory(folder);

            // Delete old photo if present
            if (!string.IsNullOrEmpty(teacher.PhotoUrl))
            {
                var oldPath = Path.Combine(_env.WebRootPath, teacher.PhotoUrl.TrimStart('/'));
                if (System.IO.File.Exists(oldPath))
                    System.IO.File.Delete(oldPath);
            }

            var fileName = $"{id}{ext}";
            var filePath = Path.Combine(folder, fileName);

            using (var stream = System.IO.File.Create(filePath))
                await file.CopyToAsync(stream);

            teacher.PhotoUrl = $"/uploads/teachers/{tenantId}/{fileName}";
            teacher.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { photoUrl = teacher.PhotoUrl });
        }
    }
}
