using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClassesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ClassesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll(
            [FromQuery] Guid? academicYearId = null,
            [FromQuery] string? search = null)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Classes
                .Where(c => c.TenantId == tenantId);

            if (academicYearId.HasValue)
                query = query.Where(c => c.AcademicYearId == academicYearId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(c => c.Name.ToLower().Contains(term));
            }

            var data = query
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.AcademicYearId,
                    AcademicYearName = c.AcademicYear.Name,
                    c.SortOrder,
                    c.Status
                })
                .ToList();

            return Ok(new { success = true, data, error = (string?)null });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var classRecord = _context.Classes
                .Where(c => c.TenantId == tenantId && c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.AcademicYearId,
                    AcademicYearName = c.AcademicYear.Name,
                    c.SortOrder,
                    c.Status,
                    c.BranchId
                })
                .FirstOrDefault();

            if (classRecord == null)
                return NotFound(new { success = false, data = (object?)null, error = "Class not found." });

            return Ok(new { success = true, data = classRecord, error = (string?)null });
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateClassRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var academicYearExists = _context.AcademicYears
                .Any(a => a.TenantId == tenantId && a.Id == request.AcademicYearId);

            if (!academicYearExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Academic year not found." });

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches
                    .Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);

                if (!branchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Branch not found." });
            }

            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now     = DateTime.UtcNow;
            var classId = Guid.NewGuid();
            var newClass = new Class
            {
                Id             = classId,
                TenantId       = tenantId,
                AcademicYearId = request.AcademicYearId,
                BranchId       = request.BranchId,
                Name           = request.Name,
                SortOrder      = request.SortOrder,
                Status         = "ACTIVE",
                SystemId       = SystemIdService.Generate(tenantCode, SystemIdService.Class, classId),
                CreatedAt      = now,
                UpdatedAt      = now
            };

            _context.Classes.Add(newClass);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { newClass.Id, newClass.Name, newClass.Status, newClass.SystemId },
                error   = (string?)null
            });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateClassRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId    = User.GetTenantId();
            var classRecord = _context.Classes
                .FirstOrDefault(c => c.TenantId == tenantId && c.Id == id);

            if (classRecord == null)
                return NotFound(new { success = false, data = (object?)null, error = "Class not found." });

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches
                    .Any(b => b.TenantId == tenantId && b.Id == request.BranchId.Value);

                if (!branchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Branch not found." });
            }

            if (request.Name      != null)        classRecord.Name      = request.Name;
            if (request.SortOrder.HasValue)       classRecord.SortOrder = request.SortOrder;
            if (request.BranchId.HasValue)        classRecord.BranchId  = request.BranchId;

            classRecord.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { classRecord.Id, classRecord.Name, classRecord.Status },
                error   = (string?)null
            });
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var allowedStatuses = new[] { "ACTIVE", "INACTIVE" };
            if (!allowedStatuses.Contains(request.Status.ToUpper()))
                return BadRequest(new { success = false, data = (object?)null, error = "Status must be ACTIVE or INACTIVE." });

            var tenantId    = User.GetTenantId();
            var classRecord = _context.Classes
                .FirstOrDefault(c => c.TenantId == tenantId && c.Id == id);

            if (classRecord == null)
                return NotFound(new { success = false, data = (object?)null, error = "Class not found." });

            classRecord.Status    = request.Status.ToUpper();
            classRecord.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { success = true, data = new { classRecord.Id, classRecord.Status }, error = (string?)null });
        }
    }
}
