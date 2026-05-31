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
    public class SubjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SubjectsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string? search = null)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Subjects.Where(s => s.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.ToLower();
                query = query.Where(s =>
                    s.Name.ToLower().Contains(term) ||
                    (s.Code != null && s.Code.ToLower().Contains(term)));
            }

            var data = query
                .OrderBy(s => s.Name)
                .Select(s => new { s.Id, s.Name, s.Code })
                .ToList();

            return Ok(new { success = true, data, error = (string?)null });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var subject = _context.Subjects
                .Where(s => s.TenantId == tenantId && s.Id == id)
                .Select(s => new { s.Id, s.Name, s.Code })
                .FirstOrDefault();

            if (subject == null)
                return NotFound(new { success = false, data = (object?)null, error = "Subject not found." });

            return Ok(new { success = true, data = subject, error = (string?)null });
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateSubjectRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            if (_context.Subjects.Any(s => s.TenantId == tenantId && s.Name == request.Name))
                return Conflict(new { success = false, data = (object?)null, error = "A subject with this name already exists." });

            if (!string.IsNullOrWhiteSpace(request.Code) &&
                _context.Subjects.Any(s => s.TenantId == tenantId && s.Code == request.Code))
                return Conflict(new { success = false, data = (object?)null, error = "A subject with this code already exists." });

            var now = DateTime.UtcNow;
            var subject = new Subject
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                Name      = request.Name,
                Code      = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Subjects.Add(subject);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { subject.Id, subject.Name, subject.Code },
                error   = (string?)null
            });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateSubjectRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var subject  = _context.Subjects.FirstOrDefault(s => s.TenantId == tenantId && s.Id == id);

            if (subject == null)
                return NotFound(new { success = false, data = (object?)null, error = "Subject not found." });

            if (request.Name != null && request.Name != subject.Name)
            {
                if (_context.Subjects.Any(s => s.TenantId == tenantId && s.Name == request.Name))
                    return Conflict(new { success = false, data = (object?)null, error = "A subject with this name already exists." });

                subject.Name = request.Name;
            }

            if (request.Code != null && request.Code != subject.Code)
            {
                var normalizedCode = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code;

                if (normalizedCode != null &&
                    _context.Subjects.Any(s => s.TenantId == tenantId && s.Code == normalizedCode))
                    return Conflict(new { success = false, data = (object?)null, error = "A subject with this code already exists." });

                subject.Code = normalizedCode;
            }

            subject.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { subject.Id, subject.Name, subject.Code },
                error   = (string?)null
            });
        }

        [HttpDelete("{id:guid}")]
        public IActionResult Delete(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var subject  = _context.Subjects.FirstOrDefault(s => s.TenantId == tenantId && s.Id == id);

            if (subject == null)
                return NotFound(new { success = false, data = (object?)null, error = "Subject not found." });

            var isInUse = _context.BatchSubjectTeachers
                .Any(bst => bst.TenantId == tenantId && bst.SubjectId == id);

            if (isInUse)
                return Conflict(new { success = false, data = (object?)null, error = "Subject is assigned to one or more batches and cannot be deleted." });

            _context.Subjects.Remove(subject);
            _context.SaveChanges();

            return Ok(new { success = true, data = new { message = "Subject deleted." }, error = (string?)null });
        }
    }
}
