using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    public class AttendanceRecordRequest
    {
        [Required]
        public Guid StudentId { get; set; }

        [Required]
        [RegularExpression("^(PRESENT|ABSENT|LATE|EXCUSED)$")]
        public string Status { get; set; } = "PRESENT";

        [MaxLength(500)]
        public string? Note { get; set; }
    }

    public class MarkAttendanceRequest
    {
        [Required]
        public Guid BatchId { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        [Required]
        public List<AttendanceRecordRequest> Records { get; set; } = new();
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AttendanceController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AttendanceController> _logger;

        public AttendanceController(AppDbContext context, ILogger<AttendanceController> logger)
        {
            _context  = context;
            _logger   = logger;
        }

        // POST /api/attendance/mark — ORG_ADMIN or TEACHER
        [HttpPost("mark")]
        public IActionResult MarkAttendance([FromBody] MarkAttendanceRequest request)
        {
            var role = User.GetRole();
            if (role != "ORG_ADMIN" && role != "TEACHER")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var markedById = User.GetUserId();

            var batchExists = _context.Batches
                .Any(b => b.TenantId == tenantId && b.Id == request.BatchId);

            if (!batchExists)
                return BadRequest(new { success = false, data = (object?)null, error = "Batch not found." });

            if (request.Records.Count == 0)
                return Ok(new { success = true, data = new { saved = 0, date = request.Date }, error = (string?)null });

            var enrolledStudentIds = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == request.BatchId && e.IsActive)
                .Select(e => e.StudentId)
                .ToHashSet();

            var existingRecords = _context.Attendances
                .Where(a => a.TenantId == tenantId && a.BatchId == request.BatchId && a.Date == request.Date)
                .ToDictionary(a => a.StudentId);

            var now   = DateTime.UtcNow;
            var saved = 0;

            foreach (var record in request.Records)
            {
                if (!enrolledStudentIds.Contains(record.StudentId))
                    continue;

                if (existingRecords.TryGetValue(record.StudentId, out var existing))
                {
                    existing.Status     = record.Status;
                    existing.Note       = record.Note;
                    existing.MarkedById = markedById;
                    existing.UpdatedAt  = now;
                }
                else
                {
                    _context.Attendances.Add(new Attendance
                    {
                        Id          = Guid.NewGuid(),
                        TenantId    = tenantId,
                        BatchId     = request.BatchId,
                        StudentId   = record.StudentId,
                        Date        = request.Date,
                        Status      = record.Status,
                        Note        = record.Note,
                        MarkedById  = markedById,
                        CreatedAt   = now,
                        UpdatedAt   = now
                    });
                }

                saved++;
            }

            _context.SaveChanges();

            _logger.LogInformation("Attendance marked by {UserId} for batch {BatchId} on {Date}: {Count} records",
                markedById, request.BatchId, request.Date, saved);

            return Ok(new { success = true, data = new { saved, date = request.Date }, error = (string?)null });
        }

        // GET /api/attendance?batchId=&date= — returns all enrolled students with their status (null if not yet marked)
        [HttpGet]
        public IActionResult GetAttendance([FromQuery] Guid? batchId, [FromQuery] DateOnly? date)
        {
            if (!batchId.HasValue || !date.HasValue)
                return BadRequest(new { success = false, data = (object?)null, error = "batchId and date are required." });

            var tenantId = User.GetTenantId();

            if (!_context.Batches.Any(b => b.TenantId == tenantId && b.Id == batchId.Value))
                return NotFound(new { success = false, data = (object?)null, error = "Batch not found." });

            var enrollments = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == batchId.Value && e.IsActive)
                .Select(e => new { e.StudentId, e.Student.FullName, e.Student.AdmissionNo })
                .ToList();

            var markedRecords = _context.Attendances
                .Where(a => a.TenantId == tenantId && a.BatchId == batchId.Value && a.Date == date.Value)
                .Select(a => new
                {
                    a.StudentId,
                    a.Status,
                    a.Note,
                    MarkedByName = a.MarkedBy.FullName
                })
                .ToDictionary(a => a.StudentId);

            var result = enrollments.Select(enrollment =>
            {
                markedRecords.TryGetValue(enrollment.StudentId, out var marked);
                return new
                {
                    enrollment.StudentId,
                    StudentName  = enrollment.FullName,
                    enrollment.AdmissionNo,
                    Status       = marked?.Status,
                    Note         = marked?.Note,
                    MarkedByName = marked?.MarkedByName
                };
            }).OrderBy(r => r.StudentName).ToList();

            return Ok(new { success = true, data = result, error = (string?)null });
        }

        // GET /api/attendance/summary?batchId=&fromDate=&toDate= OR ?studentId=&fromDate=&toDate=
        [HttpGet("summary")]
        public IActionResult GetSummary(
            [FromQuery] Guid? batchId,
            [FromQuery] Guid? studentId,
            [FromQuery] DateOnly? fromDate,
            [FromQuery] DateOnly? toDate)
        {
            if (!batchId.HasValue && !studentId.HasValue)
                return BadRequest(new { success = false, data = (object?)null, error = "Either batchId or studentId must be provided." });

            var tenantId = User.GetTenantId();
            var role     = User.GetRole();

            if (role == "STUDENT")
            {
                var callerStudentId = _context.Students
                    .Where(s => s.TenantId == tenantId && s.UserId == User.GetUserId())
                    .Select(s => s.Id)
                    .FirstOrDefault();

                if (studentId.HasValue && studentId.Value != callerStudentId)
                    return Forbid();

                if (!studentId.HasValue)
                    studentId = callerStudentId;
            }

            var query = _context.Attendances
                .Where(a => a.TenantId == tenantId);

            if (batchId.HasValue)
                query = query.Where(a => a.BatchId == batchId.Value);

            if (studentId.HasValue)
                query = query.Where(a => a.StudentId == studentId.Value);

            if (fromDate.HasValue)
                query = query.Where(a => a.Date >= fromDate.Value);

            if (toDate.HasValue)
                query = query.Where(a => a.Date <= toDate.Value);

            var records = query
                .Select(a => new { a.StudentId, a.Student.FullName, a.Student.AdmissionNo, a.Status })
                .ToList();

            var summary = records
                .GroupBy(r => r.StudentId)
                .Select(group =>
                {
                    var totalDays = group.Count();
                    var present   = group.Count(r => r.Status == "PRESENT");
                    var absent    = group.Count(r => r.Status == "ABSENT");
                    var late      = group.Count(r => r.Status == "LATE");
                    var excused   = group.Count(r => r.Status == "EXCUSED");
                    var firstRow  = group.First();
                    return new
                    {
                        StudentId          = group.Key,
                        StudentName        = firstRow.FullName,
                        AdmissionNo        = firstRow.AdmissionNo,
                        TotalDays          = totalDays,
                        Present            = present,
                        Absent             = absent,
                        Late               = late,
                        Excused            = excused,
                        PresentPercentage  = totalDays > 0
                            ? Math.Round((double)(present + late) / totalDays * 100, 1)
                            : 0.0
                    };
                })
                .OrderBy(s => s.StudentName)
                .ToList();

            return Ok(new { success = true, data = summary, error = (string?)null });
        }

        // GET /api/attendance/monthly-report?batchId=&month=&year=
        [HttpGet("monthly-report")]
        public IActionResult GetMonthlyReport(
            [FromQuery] Guid? batchId,
            [FromQuery] int?  month,
            [FromQuery] int?  year)
        {
            if (!batchId.HasValue || !month.HasValue || !year.HasValue)
                return BadRequest(new { success = false, data = (object?)null, error = "batchId, month and year are required." });

            if (month.Value < 1 || month.Value > 12)
                return BadRequest(new { success = false, data = (object?)null, error = "month must be between 1 and 12." });

            var tenantId = User.GetTenantId();

            var batch = _context.Batches
                .Where(b => b.TenantId == tenantId && b.Id == batchId.Value)
                .Select(b => new { b.Id, b.Name })
                .FirstOrDefault();

            if (batch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Batch not found." });

            var firstDay = new DateOnly(year.Value, month.Value, 1);
            var lastDay  = firstDay.AddMonths(1).AddDays(-1);

            var enrollments = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == batchId.Value && e.IsActive)
                .Select(e => new { e.StudentId, e.Student.FullName, e.Student.AdmissionNo })
                .OrderBy(e => e.FullName)
                .ToList();

            var attendanceRows = _context.Attendances
                .Where(a => a.TenantId == tenantId
                         && a.BatchId  == batchId.Value
                         && a.Date     >= firstDay
                         && a.Date     <= lastDay)
                .Select(a => new { a.StudentId, a.Date, a.Status })
                .ToList();

            // Dates that had at least one record marked (shown as columns)
            var markedDates = attendanceRows
                .Select(a => a.Date)
                .Distinct()
                .OrderBy(d => d)
                .ToList();

            // Index attendance by student → date for O(1) lookup
            var lookup = attendanceRows
                .GroupBy(a => a.StudentId)
                .ToDictionary(
                    g => g.Key,
                    g => g.ToDictionary(a => a.Date.ToString("yyyy-MM-dd"), a => a.Status)
                );

            var students = enrollments.Select(e =>
            {
                lookup.TryGetValue(e.StudentId, out var dailyStatus);
                dailyStatus ??= new Dictionary<string, string>();

                var present  = dailyStatus.Values.Count(s => s == "PRESENT");
                var absent   = dailyStatus.Values.Count(s => s == "ABSENT");
                var late     = dailyStatus.Values.Count(s => s == "LATE");
                var excused  = dailyStatus.Values.Count(s => s == "EXCUSED");
                var totalDays = dailyStatus.Count;

                return new
                {
                    e.StudentId,
                    StudentName       = e.FullName,
                    e.AdmissionNo,
                    DailyStatus       = dailyStatus,
                    TotalDays         = totalDays,
                    Present           = present,
                    Absent            = absent,
                    Late              = late,
                    Excused           = excused,
                    PresentPercentage = totalDays > 0
                        ? Math.Round((double)(present + late) / totalDays * 100, 1)
                        : 0.0
                };
            }).ToList();

            var reportData = new
            {
                BatchId    = batch.Id,
                BatchName  = batch.Name,
                Month      = month.Value,
                Year       = year.Value,
                MarkedDates = markedDates.Select(d => d.ToString("yyyy-MM-dd")).ToList(),
                Students   = students
            };

            return Ok(new { success = true, data = reportData, error = (string?)null });
        }
    }
}
