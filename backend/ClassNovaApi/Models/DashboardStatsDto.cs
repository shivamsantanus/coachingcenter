namespace ClassNovaApi.Models
{
    public class DashboardStatsDto
    {
        public int TotalActiveStudents { get; set; }
        public int TotalActiveTeachers { get; set; }
        public int     TotalActiveBatches       { get; set; }
        public decimal FeesCollectedThisMonth   { get; set; }
    }
}
