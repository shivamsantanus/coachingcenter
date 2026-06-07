namespace ClassNovaApi.Models
{
    public class TeacherAttendance
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid TeacherId { get; set; }
        public DateOnly Date { get; set; }

        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public int? WorkingMinutes { get; set; }

        // PRESENT (auto on check-in) | ABSENT | HALF_DAY | LEAVE — all admin-settable
        public string? Status { get; set; }

        // True while closed by the auto-close job or lazy-login; day excluded from salary totals
        public bool IsAutoClosed { get; set; }

        // Recorded when teacher taps check-in on a day admin already marked ABSENT/LEAVE
        public DateTime? CheckInAttemptedAt { get; set; }

        public string? Note { get; set; }

        // Preserved on first admin override of times
        public DateTime? OriginalCheckInTime { get; set; }
        public DateTime? OriginalCheckOutTime { get; set; }

        // Audit — set on every admin save
        public Guid? ModifiedById { get; set; }
        public DateTime? ModifiedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Teacher Teacher { get; set; } = null!;
        public User? ModifiedBy { get; set; }
    }
}
