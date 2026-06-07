using ClassNovaApi.Data;
using ClassNovaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassNovaApi.Services
{
    public class TeacherAttendanceService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TeacherAttendanceService> _logger;

        public TeacherAttendanceService(AppDbContext context, ILogger<TeacherAttendanceService> logger)
        {
            _context = context;
            _logger  = logger;
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private async Task<TimeZoneInfo> GetTenantTimeZoneAsync(Guid tenantId)
        {
            var settings = await _context.TenantSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(ts => ts.TenantId == tenantId);

            var ianaId = settings?.Timezone ?? "Asia/Kolkata";
            try { return TimeZoneInfo.FindSystemTimeZoneById(ianaId); }
            catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
        }

        private static DateOnly TenantToday(TimeZoneInfo tz)
            => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz));

        private static DateTime EndOfDateUtc(DateOnly date, TimeZoneInfo tz)
        {
            // 00:00 of the following day in tenant-local time, converted to UTC
            var nextDayLocal = date.AddDays(1).ToDateTime(TimeOnly.MinValue);
            return TimeZoneInfo.ConvertTimeToUtc(nextDayLocal, tz);
        }

        private static int ComputeWorkingMinutes(DateTime checkIn, DateTime checkOut)
            => (int)(checkOut - checkIn).TotalMinutes;

        // ── Teacher: check in ────────────────────────────────────────────────

        public async Task<(bool Success, string? Error, DateTime? CheckInTime)> CheckInAsync(
            Guid tenantId, Guid teacherId)
        {
            var tz    = await GetTenantTimeZoneAsync(tenantId);
            var today = TenantToday(tz);
            var now   = DateTime.UtcNow;

            var existing = await _context.TeacherAttendances
                .FirstOrDefaultAsync(ta => ta.TenantId == tenantId
                                        && ta.TeacherId == teacherId
                                        && ta.Date == today);

            if (existing != null)
            {
                if (existing.CheckInTime.HasValue)
                    return (false, "Already checked in today.", null);

                // Record pre-created by admin with ABSENT or LEAVE — block and flag attempt
                if (existing.Status is "ABSENT" or "LEAVE")
                {
                    existing.CheckInAttemptedAt = now;
                    existing.UpdatedAt          = now;
                    await _context.SaveChangesAsync();
                    return (false,
                        $"You are already marked as {existing.Status} for today. The admin has been notified to review this.",
                        null);
                }

                // Pre-existing record without check-in (unusual) — set check-in
                existing.CheckInTime = now;
                existing.Status      = "PRESENT";
                existing.UpdatedAt   = now;
                await _context.SaveChangesAsync();
                return (true, null, now);
            }

            var record = new TeacherAttendance
            {
                Id          = Guid.NewGuid(),
                TenantId    = tenantId,
                TeacherId   = teacherId,
                Date        = today,
                CheckInTime = now,
                Status      = "PRESENT",
                IsAutoClosed = false,
                CreatedAt   = now,
                UpdatedAt   = now,
            };

            _context.TeacherAttendances.Add(record);
            await _context.SaveChangesAsync();
            return (true, null, now);
        }

        // ── Teacher: check out ───────────────────────────────────────────────

        public async Task<(bool Success, string? Error, DateTime? CheckOutTime, int? WorkingMinutes)> CheckOutAsync(
            Guid tenantId, Guid teacherId)
        {
            var tz    = await GetTenantTimeZoneAsync(tenantId);
            var today = TenantToday(tz);
            var now   = DateTime.UtcNow;

            var record = await _context.TeacherAttendances
                .FirstOrDefaultAsync(ta => ta.TenantId == tenantId
                                        && ta.TeacherId == teacherId
                                        && ta.Date == today);

            if (record == null || !record.CheckInTime.HasValue)
                return (false, "No open check-in found for today.", null, null);

            if (record.CheckOutTime.HasValue)
                return (false, "Already checked out today.", null, null);

            var minutes = ComputeWorkingMinutes(record.CheckInTime.Value, now);
            record.CheckOutTime    = now;
            record.WorkingMinutes  = minutes;
            record.IsAutoClosed    = false;
            record.UpdatedAt       = now;

            await _context.SaveChangesAsync();
            return (true, null, now, minutes);
        }

        // ── Lazy-on-login: close any unchecked record from a prior day ────────

        public async Task<DateOnly?> CloseUncheckedOnLoginAsync(Guid tenantId, Guid teacherId)
        {
            var tz    = await GetTenantTimeZoneAsync(tenantId);
            var today = TenantToday(tz);

            var openRecord = await _context.TeacherAttendances
                .FirstOrDefaultAsync(ta => ta.TenantId       == tenantId
                                        && ta.TeacherId      == teacherId
                                        && ta.Date           < today
                                        && ta.CheckInTime    != null
                                        && ta.CheckOutTime   == null);

            if (openRecord == null)
                return null;

            var autoCloseTime             = EndOfDateUtc(openRecord.Date, tz);
            openRecord.CheckOutTime       = autoCloseTime;
            openRecord.WorkingMinutes     = null; // excluded from salary until admin confirms
            openRecord.IsAutoClosed       = true;
            openRecord.UpdatedAt          = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Lazy auto-close: teacher {TeacherId} date {Date} closed at {AutoClose}",
                teacherId, openRecord.Date, autoCloseTime);

            return openRecord.Date;
        }

        // ── Teacher: today ────────────────────────────────────────────────────

        public async Task<TeacherAttendanceTodayResponse?> GetTodayAsync(
            Guid tenantId, Guid teacherId, DateOnly? unclosedDate)
        {
            var tz    = await GetTenantTimeZoneAsync(tenantId);
            var today = TenantToday(tz);

            var record = await _context.TeacherAttendances
                .AsNoTracking()
                .FirstOrDefaultAsync(ta => ta.TenantId == tenantId
                                        && ta.TeacherId == teacherId
                                        && ta.Date == today);

            return new TeacherAttendanceTodayResponse
            {
                Date                 = today,
                CheckInTime          = record?.CheckInTime,
                CheckOutTime         = record?.CheckOutTime,
                WorkingMinutes       = record?.IsAutoClosed == true ? null : record?.WorkingMinutes,
                Status               = record?.Status,
                IsAutoClosed         = record?.IsAutoClosed ?? false,
                HasUnclosedPrevious  = unclosedDate.HasValue,
                UnclosedDate         = unclosedDate,
            };
        }

        // ── Teacher: history ──────────────────────────────────────────────────

        public async Task<List<TeacherAttendanceHistoryItem>> GetHistoryAsync(
            Guid tenantId, Guid teacherId, DateOnly from, DateOnly to)
        {
            var records = await _context.TeacherAttendances
                .AsNoTracking()
                .Where(ta => ta.TenantId == tenantId
                          && ta.TeacherId == teacherId
                          && ta.Date >= from
                          && ta.Date <= to)
                .OrderBy(ta => ta.Date)
                .ToListAsync();

            return records.Select(ta => new TeacherAttendanceHistoryItem
            {
                Date           = ta.Date,
                CheckInTime    = ta.CheckInTime,
                CheckOutTime   = ta.CheckOutTime,
                WorkingMinutes = ta.IsAutoClosed ? null : ta.WorkingMinutes,
                Status         = ta.Status,
                IsAutoClosed   = ta.IsAutoClosed,
            }).ToList();
        }

        // ── Teacher: monthly report ───────────────────────────────────────────

        public async Task<TeacherAttendanceReportResponse> GetMyReportAsync(
            Guid tenantId, Guid teacherId, int month, int year)
        {
            var teacher = await _context.Teachers
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.Id == teacherId);

            if (teacher == null)
                return new TeacherAttendanceReportResponse { Month = month, Year = year };

            var from = new DateOnly(year, month, 1);
            var to   = from.AddMonths(1).AddDays(-1);

            var records = await _context.TeacherAttendances
                .AsNoTracking()
                .Where(ta => ta.TenantId == tenantId
                          && ta.TeacherId == teacherId
                          && ta.Date >= from
                          && ta.Date <= to)
                .OrderBy(ta => ta.Date)
                .ToListAsync();

            return BuildReport(teacher.FullName, teacher.EmployeeCode, month, year, records);
        }

        // ── Admin: daily view ─────────────────────────────────────────────────

        public async Task<List<AdminDailyTeacherAttendanceItem>> AdminGetDailyAsync(
            Guid tenantId, DateOnly date)
        {
            var teachers = await _context.Teachers
                .AsNoTracking()
                .Where(t => t.TenantId == tenantId && t.Status == "ACTIVE")
                .OrderBy(t => t.FullName)
                .ToListAsync();

            var records = await _context.TeacherAttendances
                .AsNoTracking()
                .Where(ta => ta.TenantId == tenantId && ta.Date == date)
                .ToListAsync();

            var recordMap = records.ToDictionary(ta => ta.TeacherId);

            return teachers.Select(teacher =>
            {
                recordMap.TryGetValue(teacher.Id, out var record);
                return new AdminDailyTeacherAttendanceItem
                {
                    TeacherId            = teacher.Id,
                    TeacherName          = teacher.FullName,
                    EmployeeCode         = teacher.EmployeeCode,
                    Date                 = date,
                    CheckInTime          = record?.CheckInTime,
                    CheckOutTime         = record?.CheckOutTime,
                    WorkingMinutes       = record?.IsAutoClosed == true ? null : record?.WorkingMinutes,
                    Status               = record?.Status,
                    IsAutoClosed         = record?.IsAutoClosed ?? false,
                    Note                 = record?.Note,
                    HasCheckInAttempt    = record?.CheckInAttemptedAt.HasValue ?? false,
                    CheckInAttemptedAt   = record?.CheckInAttemptedAt,
                    OriginalCheckInTime  = record?.OriginalCheckInTime,
                    OriginalCheckOutTime = record?.OriginalCheckOutTime,
                };
            }).ToList();
        }

        // ── Admin: mark / override ────────────────────────────────────────────

        public async Task<(bool Success, string? Error)> AdminMarkAsync(
            Guid tenantId, Guid adminUserId, AdminMarkAttendanceRequest request)
        {
            var teacherExists = await _context.Teachers
                .AnyAsync(t => t.TenantId == tenantId && t.Id == request.TeacherId && t.Status == "ACTIVE");

            if (!teacherExists)
                return (false, "Teacher not found or inactive.");

            var now    = DateTime.UtcNow;
            var record = await _context.TeacherAttendances
                .FirstOrDefaultAsync(ta => ta.TenantId  == tenantId
                                        && ta.TeacherId == request.TeacherId
                                        && ta.Date      == request.Date);

            if (record == null)
            {
                record = new TeacherAttendance
                {
                    Id        = Guid.NewGuid(),
                    TenantId  = tenantId,
                    TeacherId = request.TeacherId,
                    Date      = request.Date,
                    CreatedAt = now,
                };
                _context.TeacherAttendances.Add(record);
            }
            else
            {
                // Preserve originals on first admin time override
                if (request.CheckInTime.HasValue && record.CheckInTime.HasValue
                    && !record.OriginalCheckInTime.HasValue)
                    record.OriginalCheckInTime = record.CheckInTime;

                if (request.CheckOutTime.HasValue && record.CheckOutTime.HasValue
                    && !record.OriginalCheckOutTime.HasValue)
                    record.OriginalCheckOutTime = record.CheckOutTime;
            }

            record.Status       = request.Status;
            record.Note         = request.Note;
            record.ModifiedById = adminUserId;
            record.ModifiedAt   = now;
            record.UpdatedAt    = now;

            if (request.CheckInTime.HasValue)
                record.CheckInTime = request.CheckInTime;

            if (request.CheckOutTime.HasValue)
            {
                if (record.CheckInTime.HasValue && request.CheckOutTime <= record.CheckInTime)
                    return (false, "Check-out time must be after check-in time.");

                record.CheckOutTime = request.CheckOutTime;
                // Admin explicitly set checkout → confirmed, recalculate hours
                record.IsAutoClosed   = false;
                record.WorkingMinutes = record.CheckInTime.HasValue
                    ? ComputeWorkingMinutes(record.CheckInTime.Value, request.CheckOutTime.Value)
                    : null;
            }

            await _context.SaveChangesAsync();
            return (true, null);
        }

        // ── Admin: monthly report ─────────────────────────────────────────────

        public async Task<AdminMonthlyReportResponse> AdminGetMonthlyReportAsync(
            Guid tenantId, int month, int year, Guid? teacherId)
        {
            var teacherQuery = _context.Teachers
                .AsNoTracking()
                .Where(t => t.TenantId == tenantId && t.Status == "ACTIVE");

            if (teacherId.HasValue)
                teacherQuery = teacherQuery.Where(t => t.Id == teacherId.Value);

            var teachers = await teacherQuery.OrderBy(t => t.FullName).ToListAsync();

            var from = new DateOnly(year, month, 1);
            var to   = from.AddMonths(1).AddDays(-1);

            var allRecords = await _context.TeacherAttendances
                .AsNoTracking()
                .Where(ta => ta.TenantId == tenantId
                          && ta.Date >= from
                          && ta.Date <= to
                          && (!teacherId.HasValue || ta.TeacherId == teacherId.Value))
                .ToListAsync();

            var recordsByTeacher = allRecords
                .GroupBy(ta => ta.TeacherId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var teacherReports = teachers.Select(teacher =>
            {
                recordsByTeacher.TryGetValue(teacher.Id, out var records);
                return BuildReport(teacher.FullName, teacher.EmployeeCode, month, year, records ?? new());
            }).ToList();

            return new AdminMonthlyReportResponse
            {
                Month    = month,
                Year     = year,
                Teachers = teacherReports,
            };
        }

        // ── Teacher entity lookup ─────────────────────────────────────────────

        public async Task<Teacher?> FindTeacherByUserIdAsync(Guid tenantId, Guid userId)
            => await _context.Teachers
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId && t.UserId == userId);

        // ── Auto-close job helper (called by the background job) ─────────────

        public async Task AutoCloseOpenRecordsAsync()
        {
            var tenants = await _context.TenantSettings
                .AsNoTracking()
                .Select(ts => new { ts.TenantId, ts.Timezone })
                .ToListAsync();

            foreach (var tenant in tenants)
            {
                TimeZoneInfo tz;
                try { tz = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone ?? "Asia/Kolkata"); }
                catch { tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }

                var today = TenantToday(tz);

                var openRecords = await _context.TeacherAttendances
                    .Where(ta => ta.TenantId     == tenant.TenantId
                              && ta.Date         < today
                              && ta.CheckInTime  != null
                              && ta.CheckOutTime == null)
                    .ToListAsync();

                foreach (var record in openRecords)
                {
                    record.CheckOutTime   = EndOfDateUtc(record.Date, tz);
                    record.WorkingMinutes = null; // excluded from salary — admin must confirm
                    record.IsAutoClosed   = true;
                    record.UpdatedAt      = DateTime.UtcNow;
                }

                if (openRecords.Count > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation(
                        "Auto-close job: closed {Count} open records for tenant {TenantId}",
                        openRecords.Count, tenant.TenantId);
                }
            }
        }

        // ── Private builder ───────────────────────────────────────────────────

        private static TeacherAttendanceReportResponse BuildReport(
            string teacherName, string employeeCode,
            int month, int year,
            List<TeacherAttendance> records)
        {
            var items = records.Select(ta => new TeacherAttendanceHistoryItem
            {
                Date           = ta.Date,
                CheckInTime    = ta.CheckInTime,
                CheckOutTime   = ta.CheckOutTime,
                WorkingMinutes = ta.IsAutoClosed ? null : ta.WorkingMinutes,
                Status         = ta.Status,
                IsAutoClosed   = ta.IsAutoClosed,
            }).ToList();

            return new TeacherAttendanceReportResponse
            {
                TeacherName              = teacherName,
                EmployeeCode             = employeeCode,
                Month                    = month,
                Year                     = year,
                TotalDays                = records.Count,
                Present                  = records.Count(r => r.Status == "PRESENT"),
                Absent                   = records.Count(r => r.Status == "ABSENT"),
                HalfDay                  = records.Count(r => r.Status == "HALF_DAY"),
                Leave                    = records.Count(r => r.Status == "LEAVE"),
                ConfirmedWorkingMinutes  = records
                    .Where(r => !r.IsAutoClosed && r.WorkingMinutes.HasValue)
                    .Sum(r => r.WorkingMinutes!.Value),
                Records                  = items,
            };
        }
    }
}
