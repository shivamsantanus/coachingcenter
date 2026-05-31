using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/batch-subject-teachers")]
    [Authorize]
    public class BatchSubjectTeachersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BatchSubjectTeachersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetByBatch([FromQuery] Guid? batchId)
        {
            if (!batchId.HasValue)
                return BadRequest(new { success = false, data = (object?)null, error = "batchId query parameter is required." });

            var tenantId = User.GetTenantId();

            var assignments = await _context.BatchSubjectTeachers
                .Where(bst => bst.TenantId == tenantId && bst.BatchId == batchId.Value)
                .Select(bst => new
                {
                    id                  = bst.Id,
                    batchId             = bst.BatchId,
                    subjectId           = bst.SubjectId,
                    subjectName         = bst.Subject.Name,
                    subjectCode         = bst.Subject.Code,
                    teacherId           = bst.TeacherId,
                    teacherName         = bst.Teacher.FullName,
                    teacherEmployeeCode = bst.Teacher.EmployeeCode
                })
                .ToListAsync();

            return Ok(new { success = true, data = assignments, error = (string?)null });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBatchSubjectTeacherRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new { success = false, data = (object?)null, error = "Invalid request data." });

            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var batchExists = await _context.Batches
                .AnyAsync(b => b.Id == request.BatchId && b.TenantId == tenantId);

            if (!batchExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch not found in this tenant." });

            var subjectExists = await _context.Subjects
                .AnyAsync(s => s.Id == request.SubjectId && s.TenantId == tenantId);

            if (!subjectExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Subject not found in this tenant." });

            var teacherExists = await _context.Teachers
                .AnyAsync(t => t.Id == request.TeacherId && t.TenantId == tenantId);

            if (!teacherExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher not found in this tenant." });

            var assignmentExists = await _context.BatchSubjectTeachers
                .AnyAsync(bst =>
                    bst.TenantId  == tenantId &&
                    bst.BatchId   == request.BatchId &&
                    bst.SubjectId == request.SubjectId &&
                    bst.TeacherId == request.TeacherId);

            if (assignmentExists)
                return Conflict(new { success = false, data = (object?)null, error = "This assignment already exists." });

            var assignment = new BatchSubjectTeacher
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                BatchId   = request.BatchId,
                SubjectId = request.SubjectId,
                TeacherId = request.TeacherId
            };

            _context.BatchSubjectTeachers.Add(assignment);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                data    = new { id = assignment.Id, batchId = assignment.BatchId, subjectId = assignment.SubjectId, teacherId = assignment.TeacherId },
                error   = (string?)null
            });
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId   = User.GetTenantId();
            var assignment = await _context.BatchSubjectTeachers
                .FirstOrDefaultAsync(bst => bst.Id == id && bst.TenantId == tenantId);

            if (assignment is null)
                return NotFound(new { success = false, data = (object?)null, error = "Assignment not found." });

            _context.BatchSubjectTeachers.Remove(assignment);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, data = new { message = "Assignment removed." }, error = (string?)null });
        }
    }
}
