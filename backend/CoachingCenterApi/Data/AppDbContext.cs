using Microsoft.EntityFrameworkCore;
using CoachingCenterApi.Models;

namespace CoachingCenterApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

        public DbSet<User> Users { get; set; }
    }
}
