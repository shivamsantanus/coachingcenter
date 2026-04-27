namespace ClassNovaApi.Models
{
    public class ClassSchedule
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid? BranchId { get; set; }
        public Guid BatchId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid TeacherId { get; set; }
        public short DayOfWeek { get; set; } // 1 = Monday ... 7 = Sunday
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public string? RoomNo { get; set; }

        public Tenant Tenant { get; set; } = null!;
        public Branch? Branch { get; set; }
        public Batch Batch { get; set; } = null!;
        public Subject Subject { get; set; } = null!;
        public Teacher Teacher { get; set; } = null!;
    }
}
