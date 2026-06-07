using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/teacher-attendance")]
    [Authorize]
    public class TeacherAttendanceController : ControllerBase
    {
        private readonly TeacherAttendanceService _service;
        private readonly ILogger<TeacherAttendanceController> _logger;

        public TeacherAttendanceController(
            TeacherAttendanceService service,
            ILogger<TeacherAttendanceController> logger)
        {
            _service = service;
            _logger  = logger;
        }

        // POST /api/teacher-attendance/check-in — TEACHER only
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn()
        {
            if (User.GetRole() != "TEACHER")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var teacherId = await ResolveTeacherIdAsync(tenantId);
            if (teacherId == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher profile not found." });

            var (success, error, checkInTime) = await _service.CheckInAsync(tenantId, teacherId.Value);
            if (!success)
                return BadRequest(new { success = false, data = (object?)null, error });

            return Ok(new { success = true, data = new { checkInTime }, error = (string?)null });
        }

        // POST /api/teacher-attendance/check-out — TEACHER only
        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut()
        {
            if (User.GetRole() != "TEACHER")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var teacherId = await ResolveTeacherIdAsync(tenantId);
            if (teacherId == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher profile not found." });

            var (success, error, checkOutTime, workingMinutes) = await _service.CheckOutAsync(tenantId, teacherId.Value);
            if (!success)
                return BadRequest(new { success = false, data = (object?)null, error });

            return Ok(new { success = true, data = new { checkOutTime, workingMinutes }, error = (string?)null });
        }

        // GET /api/teacher-attendance/my-today — TEACHER only
        // Also runs the lazy-on-login auto-close check
        [HttpGet("my-today")]
        public async Task<IActionResult> GetMyToday()
        {
            if (User.GetRole() != "TEACHER")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var teacherId = await ResolveTeacherIdAsync(tenantId);
            if (teacherId == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher profile not found." });

            var unclosedDate = await _service.CloseUncheckedOnLoginAsync(tenantId, teacherId.Value);
            var todayRecord  = await _service.GetTodayAsync(tenantId, teacherId.Value, unclosedDate);

            return Ok(new { success = true, data = todayRecord, error = (string?)null });
        }

        // GET /api/teacher-attendance/my-history?from=yyyy-MM-dd&to=yyyy-MM-dd — TEACHER only
        [HttpGet("my-history")]
        public async Task<IActionResult> GetMyHistory([FromQuery] DateOnly from, [FromQuery] DateOnly to)
        {
            if (User.GetRole() != "TEACHER")
                return Forbid();

            if (to < from)
                return BadRequest(new { success = false, data = (object?)null, error = "to must be after from." });

            var tenantId  = User.GetTenantId();
            var teacherId = await ResolveTeacherIdAsync(tenantId);
            if (teacherId == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher profile not found." });

            var history = await _service.GetHistoryAsync(tenantId, teacherId.Value, from, to);
            return Ok(new { success = true, data = history, error = (string?)null });
        }

        // GET /api/teacher-attendance/my-report?month=6&year=2026 — TEACHER only
        [HttpGet("my-report")]
        public async Task<IActionResult> GetMyReport([FromQuery] int month, [FromQuery] int year)
        {
            if (User.GetRole() != "TEACHER")
                return Forbid();

            if (month < 1 || month > 12 || year < 2000)
                return BadRequest(new { success = false, data = (object?)null, error = "Invalid month or year." });

            var tenantId  = User.GetTenantId();
            var teacherId = await ResolveTeacherIdAsync(tenantId);
            if (teacherId == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Teacher profile not found." });

            var report = await _service.GetMyReportAsync(tenantId, teacherId.Value, month, year);
            return Ok(new { success = true, data = report, error = (string?)null });
        }

        // GET /api/teacher-attendance/admin/daily?date=yyyy-MM-dd — ORG_ADMIN only
        [HttpGet("admin/daily")]
        public async Task<IActionResult> AdminGetDaily([FromQuery] DateOnly date)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var records  = await _service.AdminGetDailyAsync(tenantId, date);
            return Ok(new { success = true, data = records, error = (string?)null });
        }

        // POST /api/teacher-attendance/admin/mark — ORG_ADMIN only
        [HttpPost("admin/mark")]
        public async Task<IActionResult> AdminMark([FromBody] AdminMarkAttendanceRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            if (!ModelState.IsValid)
                return BadRequest(new { success = false, data = (object?)null, error = "Invalid request." });

            var tenantId   = User.GetTenantId();
            var adminUserId = User.GetUserId();

            var (success, error) = await _service.AdminMarkAsync(tenantId, adminUserId, request);
            if (!success)
                return BadRequest(new { success = false, data = (object?)null, error });

            return Ok(new { success = true, data = new { saved = true }, error = (string?)null });
        }

        // GET /api/teacher-attendance/admin/monthly-report?month=6&year=2026[&teacherId=guid] — ORG_ADMIN only
        [HttpGet("admin/monthly-report")]
        public async Task<IActionResult> AdminGetMonthlyReport(
            [FromQuery] int month,
            [FromQuery] int year,
            [FromQuery] Guid? teacherId)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            if (month < 1 || month > 12 || year < 2000)
                return BadRequest(new { success = false, data = (object?)null, error = "Invalid month or year." });

            var tenantId = User.GetTenantId();
            var report   = await _service.AdminGetMonthlyReportAsync(tenantId, month, year, teacherId);
            return Ok(new { success = true, data = report, error = (string?)null });
        }

        // ── Helper — resolve teacher entity ID from authenticated user ─────────

        private async Task<Guid?> ResolveTeacherIdAsync(Guid tenantId)
        {
            var userId = User.GetUserId();
            var teacher = await _service.FindTeacherByUserIdAsync(tenantId, userId);
            return teacher?.Id;
        }
    }
}
