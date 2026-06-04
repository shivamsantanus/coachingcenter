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
    public class BatchesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BatchesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll(
            [FromQuery] Guid? academicYearId = null,
            [FromQuery] Guid? classId = null,
            [FromQuery] string? search = null)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Batches.Where(b => b.TenantId == tenantId);

            if (academicYearId.HasValue)
                query = query.Where(b => b.AcademicYearId == academicYearId.Value);

            if (classId.HasValue)
                query = query.Where(b => b.ClassId == classId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchTerm = search.ToLower();
                query = query.Where(b => b.Name.ToLower().Contains(searchTerm));
            }

            var data = query
                .OrderBy(b => b.Name)
                .Select(b => new
                {
                    b.Id,
                    b.Name,
                    b.AcademicYearId,
                    AcademicYearName = b.AcademicYear.Name,
                    b.ClassId,
                    ClassName  = b.Class  != null ? b.Class.Name  : null,
                    b.BranchId,
                    BranchName = b.Branch != null ? b.Branch.Name : null,
                    b.StartDate,
                    b.EndDate,
                    b.StartTime,
                    b.EndTime,
                    b.Status
                })
                .ToList();

            return Ok(new { success = true, data, error = (string?)null });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var batch = _context.Batches
                .Where(b => b.TenantId == tenantId && b.Id == id)
                .Select(b => new
                {
                    b.Id,
                    b.TenantId,
                    b.AcademicYearId,
                    AcademicYearName = b.AcademicYear.Name,
                    b.ClassId,
                    ClassName  = b.Class  != null ? b.Class.Name  : null,
                    b.BranchId,
                    BranchName = b.Branch != null ? b.Branch.Name : null,
                    b.Name,
                    b.StartDate,
                    b.EndDate,
                    b.StartTime,
                    b.EndTime,
                    b.Status,
                    b.UpdatedAt
                })
                .FirstOrDefault();

            if (batch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Batch not found." });

            return Ok(new { success = true, data = batch, error = (string?)null });
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateBatchRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var academicYear = _context.AcademicYears
                .FirstOrDefault(ay => ay.TenantId == tenantId && ay.Id == request.AcademicYearId);

            if (academicYear == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Academic year not found." });

            // Batch dates must fall within the academic year range
            if (request.StartDate.HasValue && request.StartDate.Value < academicYear.StartDate)
                return BadRequest(new { success = false, data = (object?)null, error = $"Batch start date cannot be before the academic year start date ({academicYear.StartDate:dd MMM yyyy})." });

            if (request.EndDate.HasValue && request.EndDate.Value > academicYear.EndDate)
                return BadRequest(new { success = false, data = (object?)null, error = $"Batch end date cannot be after the academic year end date ({academicYear.EndDate:dd MMM yyyy})." });

            if (request.StartDate.HasValue && request.EndDate.HasValue && request.StartDate.Value >= request.EndDate.Value)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch end date must be after start date." });

            if (request.StartTime.HasValue && request.EndTime.HasValue && request.StartTime.Value >= request.EndTime.Value)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch end time must be after start time." });

            if (request.ClassId.HasValue)
            {
                var classExists = _context.Classes
                    .Any(c => c.TenantId == tenantId && c.Id == request.ClassId.Value);

                if (!classExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Class not found." });
            }

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches
                    .Any(br => br.TenantId == tenantId && br.Id == request.BranchId.Value);

                if (!branchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Branch not found." });
            }

            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now     = DateTime.UtcNow;
            var batchId = Guid.NewGuid();
            var batch   = new Batch
            {
                Id             = batchId,
                TenantId       = tenantId,
                BranchId       = request.BranchId,
                AcademicYearId = request.AcademicYearId,
                ClassId        = request.ClassId,
                Name           = request.Name,
                StartDate      = request.StartDate,
                EndDate        = request.EndDate,
                StartTime      = request.StartTime,
                EndTime        = request.EndTime,
                Status         = "ACTIVE",
                SystemId       = SystemIdService.Generate(tenantCode, SystemIdService.Batch, batchId),
                CreatedAt      = now,
                UpdatedAt      = now
            };

            _context.Batches.Add(batch);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { batch.Id, batch.Name, batch.Status, batch.SystemId },
                error   = (string?)null
            });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateBatchRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var batch = _context.Batches
                .FirstOrDefault(b => b.TenantId == tenantId && b.Id == id);

            if (batch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Batch not found." });

            // Validate dates against the academic year
            var academicYear = _context.AcademicYears
                .First(ay => ay.TenantId == tenantId && ay.Id == batch.AcademicYearId);

            var effectiveStart = request.StartDate ?? batch.StartDate;
            var effectiveEnd   = request.EndDate   ?? batch.EndDate;

            if (effectiveStart.HasValue && effectiveStart.Value < academicYear.StartDate)
                return BadRequest(new { success = false, data = (object?)null, error = $"Batch start date cannot be before the academic year start date ({academicYear.StartDate:dd MMM yyyy})." });

            if (effectiveEnd.HasValue && effectiveEnd.Value > academicYear.EndDate)
                return BadRequest(new { success = false, data = (object?)null, error = $"Batch end date cannot be after the academic year end date ({academicYear.EndDate:dd MMM yyyy})." });

            if (effectiveStart.HasValue && effectiveEnd.HasValue && effectiveStart.Value >= effectiveEnd.Value)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch end date must be after start date." });

            var effectiveStartTime = request.StartTime ?? batch.StartTime;
            var effectiveEndTime   = request.EndTime   ?? batch.EndTime;

            if (effectiveStartTime.HasValue && effectiveEndTime.HasValue && effectiveStartTime.Value >= effectiveEndTime.Value)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch end time must be after start time." });

            if (request.ClassId.HasValue)
            {
                var classExists = _context.Classes
                    .Any(c => c.TenantId == tenantId && c.Id == request.ClassId.Value);

                if (!classExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Class not found." });
            }

            if (request.BranchId.HasValue)
            {
                var branchExists = _context.Branches
                    .Any(br => br.TenantId == tenantId && br.Id == request.BranchId.Value);

                if (!branchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Branch not found." });
            }

            if (request.Name      != null)       batch.Name      = request.Name;
            if (request.ClassId.HasValue)        batch.ClassId   = request.ClassId;
            if (request.BranchId.HasValue)       batch.BranchId  = request.BranchId;
            if (request.StartDate.HasValue)      batch.StartDate = request.StartDate;
            if (request.EndDate.HasValue)        batch.EndDate   = request.EndDate;
            if (request.StartTime.HasValue)      batch.StartTime = request.StartTime;
            if (request.EndTime.HasValue)        batch.EndTime   = request.EndTime;

            batch.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { batch.Id, batch.Name, batch.Status },
                error   = (string?)null
            });
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var batch = _context.Batches
                .FirstOrDefault(b => b.TenantId == tenantId && b.Id == id);

            if (batch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Batch not found." });

            var normalizedStatus = request.Status.ToUpper();
            if (normalizedStatus != "ACTIVE" && normalizedStatus != "INACTIVE")
                return BadRequest(new { success = false, data = (object?)null, error = "Status must be ACTIVE or INACTIVE." });

            batch.Status    = normalizedStatus;
            batch.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { success = true, data = new { batch.Id, batch.Status }, error = (string?)null });
        }
    }
}
