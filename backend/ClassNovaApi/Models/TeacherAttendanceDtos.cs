using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    // ── Teacher-facing responses ──────────────────────────────────────────────

    public class TeacherAttendanceTodayResponse
    {
        public DateOnly Date { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? WorkingMinutes { get; set; }
        public string? Status { get; set; }
        public bool IsAutoClosed { get; set; }
        // True when lazy-login found and closed a prior unchecked record
        public bool HasUnclosedPrevious { get; set; }
        public DateOnly? UnclosedDate { get; set; }
    }

    public class TeacherAttendanceHistoryItem
    {
        public DateOnly Date { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? WorkingMinutes { get; set; }
        public string? Status { get; set; }
        public bool IsAutoClosed { get; set; }
    }

    public class TeacherAttendanceReportResponse
    {
        public string TeacherName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalDays { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int HalfDay { get; set; }
        public int Leave { get; set; }
        // Only confirmed (non-auto-closed) days are counted
        public int ConfirmedWorkingMinutes { get; set; }
        public List<TeacherAttendanceHistoryItem> Records { get; set; } = new();
    }

    // ── Admin-facing responses ────────────────────────────────────────────────

    public class AdminDailyTeacherAttendanceItem
    {
        public Guid TeacherId { get; set; }
        public string TeacherName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public DateOnly Date { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? WorkingMinutes { get; set; }
        public string? Status { get; set; }
        public bool IsAutoClosed { get; set; }
        public string? Note { get; set; }
        public bool HasCheckInAttempt { get; set; }
        public DateTime? CheckInAttemptedAt { get; set; }
        // Preserved originals — shown when admin overrode the times
        public DateTime? OriginalCheckInTime { get; set; }
        public DateTime? OriginalCheckOutTime { get; set; }
    }

    public class AdminMarkAttendanceRequest
    {
        [Required]
        public Guid TeacherId { get; set; }

        [Required]
        public DateOnly Date { get; set; }

        [Required]
        [RegularExpression("^(PRESENT|ABSENT|HALF_DAY|LEAVE)$",
            ErrorMessage = "Status must be PRESENT, ABSENT, HALF_DAY, or LEAVE.")]
        public string Status { get; set; } = string.Empty;

        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }

    public class AdminMonthlyReportResponse
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public List<TeacherAttendanceReportResponse> Teachers { get; set; } = new();
    }
}
