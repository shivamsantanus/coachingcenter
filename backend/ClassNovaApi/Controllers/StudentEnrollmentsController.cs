using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    public record ToggleEnrollmentActiveRequest([Required] bool IsActive);

    public class BulkDeleteEnrollmentRequest
    {
        [Required]
        [MinLength(1)]
        public List<Guid> Ids { get; set; } = new();
    }

    public class BulkEnrollRequest
    {
        [Required]
        public Guid BatchId { get; set; }

        [Required]
        [MinLength(1)]
        public List<Guid> StudentIds { get; set; } = new();

        public DateOnly? EnrolledOn { get; set; }
    }

    [ApiController]
    [Route("api/student-enrollments")]
    [Authorize]
    public class StudentEnrollmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public StudentEnrollmentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetEnrollments(
            [FromQuery] Guid? batchId,
            [FromQuery] Guid? studentId)
        {
            if (!batchId.HasValue && !studentId.HasValue)
                return BadRequest(new { success = false, data = (object?)null, error = "At least one of batchId or studentId must be provided." });

            var tenantId = User.GetTenantId();

            var query = _context.StudentEnrollments
                .Where(enrollment => enrollment.TenantId == tenantId);

            if (batchId.HasValue)
                query = query.Where(enrollment => enrollment.BatchId == batchId.Value);

            if (studentId.HasValue)
                query = query.Where(enrollment => enrollment.StudentId == studentId.Value);

            var enrollmentList = query
                .OrderBy(enrollment => enrollment.EnrolledOn)
                .Select(enrollment => new
                {
                    enrollment.Id,
                    enrollment.StudentId,
                    studentName = enrollment.Student.FullName,
                    admissionNo = enrollment.Student.AdmissionNo,
                    enrollment.ClassId,
                    className   = enrollment.Class != null ? enrollment.Class.Name : null,
                    enrollment.BatchId,
                    batchName   = enrollment.Batch != null ? enrollment.Batch.Name : null,
                    enrollment.EnrolledOn,
                    enrollment.IsActive
                })
                .ToList();

            return Ok(new { success = true, data = enrollmentList, error = (string?)null });
        }

        [HttpPost]
        public IActionResult CreateEnrollment([FromBody] CreateStudentEnrollmentRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var studentExists = _context.Students
                .Any(student => student.TenantId == tenantId && student.Id == request.StudentId);

            if (!studentExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Student not found in this tenant." });

            if (request.ClassId.HasValue)
            {
                var classExists = _context.Classes
                    .Any(cls => cls.TenantId == tenantId && cls.Id == request.ClassId.Value);

                if (!classExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Class not found in this tenant." });
            }

            if (request.BatchId.HasValue)
            {
                var batchExists = _context.Batches
                    .Any(batch => batch.TenantId == tenantId && batch.Id == request.BatchId.Value);

                if (!batchExists)
                    return BadRequest(new { success = false, data = (object?)null, error = "Batch not found in this tenant." });
            }

            var enrolledOn = request.EnrolledOn ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var enrollment = new StudentEnrollment
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                StudentId = request.StudentId,
                ClassId   = request.ClassId,
                BatchId   = request.BatchId,
                EnrolledOn = enrolledOn,
                IsActive  = true
            };

            _context.StudentEnrollments.Add(enrollment);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new
                {
                    enrollment.Id,
                    enrollment.StudentId,
                    enrollment.BatchId,
                    enrollment.ClassId,
                    enrollment.EnrolledOn,
                    enrollment.IsActive
                },
                error = (string?)null
            });
        }

        [HttpPost("bulk")]
        public IActionResult BulkEnroll([FromBody] BulkEnrollRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var batchExists = _context.Batches
                .Any(b => b.TenantId == tenantId && b.Id == request.BatchId);

            if (!batchExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch not found in this tenant." });

            var enrolledBatchStudentIds = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId != null && e.IsActive)
                .Select(e => e.StudentId)
                .ToHashSet();

            var validStudentIds = _context.Students
                .Where(s => s.TenantId == tenantId && s.Status == "ACTIVE" && request.StudentIds.Contains(s.Id))
                .Select(s => s.Id)
                .ToList();

            var enrolledOn = request.EnrolledOn ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var enrolledCount = 0;
            var skippedCount  = 0;

            foreach (var studentId in validStudentIds)
            {
                if (enrolledBatchStudentIds.Contains(studentId))
                {
                    skippedCount++;
                    continue;
                }

                _context.StudentEnrollments.Add(new StudentEnrollment
                {
                    Id         = Guid.NewGuid(),
                    TenantId   = tenantId,
                    StudentId  = studentId,
                    BatchId    = request.BatchId,
                    ClassId    = null,
                    EnrolledOn = enrolledOn,
                    IsActive   = true
                });
                enrolledCount++;
            }

            if (enrolledCount > 0)
                _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { enrolled = enrolledCount, skipped = skippedCount },
                error   = (string?)null
            });
        }

        [HttpPost("bulk-delete")]
        public IActionResult BulkDelete([FromBody] BulkDeleteEnrollmentRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId    = User.GetTenantId();
            var enrollments = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && request.Ids.Contains(e.Id))
                .ToList();

            if (enrollments.Count == 0)
                return NotFound(new { success = false, data = (object?)null, error = "No matching enrollments found." });

            _context.StudentEnrollments.RemoveRange(enrollments);
            _context.SaveChanges();

            return Ok(new { success = true, data = new { deleted = enrollments.Count }, error = (string?)null });
        }

        [HttpDelete("{id:guid}")]
        public IActionResult DeleteEnrollment(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId   = User.GetTenantId();
            var enrollment = _context.StudentEnrollments
                .FirstOrDefault(e => e.TenantId == tenantId && e.Id == id);

            if (enrollment == null)
                return NotFound(new { success = false, data = (object?)null, error = "Enrollment not found." });

            _context.StudentEnrollments.Remove(enrollment);
            _context.SaveChanges();

            return Ok(new { success = true, data = new { message = "Enrollment deleted." }, error = (string?)null });
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateEnrollmentStatus(Guid id, [FromBody] ToggleEnrollmentActiveRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId   = User.GetTenantId();
            var enrollment = _context.StudentEnrollments
                .FirstOrDefault(e => e.TenantId == tenantId && e.Id == id);

            if (enrollment == null)
                return NotFound(new { success = false, data = (object?)null, error = "Enrollment not found." });

            enrollment.IsActive = request.IsActive;
            _context.SaveChanges();

            return Ok(new { success = true, data = new { enrollment.Id, enrollment.IsActive }, error = (string?)null });
        }
    }
}
