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
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            var tenantId = User.GetTenantId();

            var studentCount = _context.Students
                .Count(s => s.TenantId == tenantId && s.Status == "ACTIVE");

            var teacherCount = _context.Teachers
                .Count(t => t.TenantId == tenantId && t.Status == "ACTIVE");

            var batchCount = _context.Batches
                .Count(b => b.TenantId == tenantId && b.Status == "ACTIVE");

            var now         = DateTime.UtcNow;
            var monthStart  = DateOnly.FromDateTime(new DateTime(now.Year, now.Month, 1));
            var monthEnd    = DateOnly.FromDateTime(now);

            var feesThisMonth = _context.Payments
                .Where(p => p.TenantId == tenantId && p.PaymentDate >= monthStart && p.PaymentDate <= monthEnd)
                .Sum(p => (decimal?)p.TotalAmount) ?? 0m;

            var stats = new DashboardStatsDto
            {
                TotalActiveStudents     = studentCount,
                TotalActiveTeachers     = teacherCount,
                TotalActiveBatches      = batchCount,
                FeesCollectedThisMonth  = feesThisMonth,
            };

            return Ok(new ApiResponse<DashboardStatsDto>(stats));
        }
    }
}
