using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/academic-years")]
    [Authorize]
    public class AcademicYearsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AcademicYearsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var tenantId = User.GetTenantId();

            var academicYears = _context.AcademicYears
                .Where(ay => ay.TenantId == tenantId)
                .OrderBy(ay => ay.StartDate)
                .Select(ay => new
                {
                    ay.Id,
                    ay.Name,
                    ay.StartDate,
                    ay.EndDate,
                    ay.IsActive
                })
                .ToList();

            return Ok(new { success = true, data = academicYears, error = (string?)null });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var academicYear = _context.AcademicYears
                .Where(ay => ay.TenantId == tenantId && ay.Id == id)
                .Select(ay => new
                {
                    ay.Id,
                    ay.Name,
                    ay.StartDate,
                    ay.EndDate,
                    ay.IsActive,
                    ay.UpdatedAt
                })
                .FirstOrDefault();

            if (academicYear == null)
                return NotFound(new { success = false, data = (object?)null, error = "Academic year not found." });

            return Ok(new { success = true, data = academicYear, error = (string?)null });
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateAcademicYearRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            if (request.StartDate >= request.EndDate)
                return BadRequest(new { success = false, data = (object?)null, error = "End date must be after start date." });

            var tenantId   = User.GetTenantId();
            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now            = DateTime.UtcNow;
            var academicYearId = Guid.NewGuid();
            var academicYear   = new AcademicYear
            {
                Id        = academicYearId,
                TenantId  = tenantId,
                Name      = request.Name,
                StartDate = request.StartDate,
                EndDate   = request.EndDate,
                IsActive  = false,
                SystemId  = SystemIdService.Generate(tenantCode, SystemIdService.AcademicYear, academicYearId),
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.AcademicYears.Add(academicYear);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { academicYear.Id, academicYear.Name, academicYear.StartDate, academicYear.EndDate, academicYear.IsActive, academicYear.SystemId },
                error   = (string?)null
            });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateAcademicYearRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var academicYear = _context.AcademicYears
                .FirstOrDefault(ay => ay.TenantId == tenantId && ay.Id == id);

            if (academicYear == null)
                return NotFound(new { success = false, data = (object?)null, error = "Academic year not found." });

            var effectiveStart = request.StartDate ?? academicYear.StartDate;
            var effectiveEnd   = request.EndDate   ?? academicYear.EndDate;

            if (effectiveStart >= effectiveEnd)
                return BadRequest(new { success = false, data = (object?)null, error = "End date must be after start date." });

            if (request.Name      != null)          academicYear.Name      = request.Name;
            if (request.StartDate.HasValue)         academicYear.StartDate = request.StartDate.Value;
            if (request.EndDate.HasValue)           academicYear.EndDate   = request.EndDate.Value;

            academicYear.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { academicYear.Id, academicYear.Name, academicYear.StartDate, academicYear.EndDate, academicYear.IsActive },
                error   = (string?)null
            });
        }

        [HttpPatch("{id:guid}/activate")]
        public IActionResult Activate(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId   = User.GetTenantId();
            var targetYear = _context.AcademicYears
                .FirstOrDefault(ay => ay.TenantId == tenantId && ay.Id == id);

            if (targetYear == null)
                return NotFound(new { success = false, data = (object?)null, error = "Academic year not found." });

            using var transaction = _context.Database.BeginTransaction();

            var now = DateTime.UtcNow;
            foreach (var year in _context.AcademicYears.Where(ay => ay.TenantId == tenantId).ToList())
            {
                year.IsActive  = year.Id == id;
                year.UpdatedAt = now;
            }

            _context.SaveChanges();
            transaction.Commit();

            return Ok(new { success = true, data = new { id, isActive = true }, error = (string?)null });
        }
    }
}
