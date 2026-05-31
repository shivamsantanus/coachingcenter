using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Models;

namespace ClassNovaApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<TenantSettings> TenantSettings { get; set; }
        public DbSet<TenantFeature> TenantFeatures { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<TenantUserRole> TenantUserRoles { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<AcademicYear> AcademicYears { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<Batch> Batches { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<BatchSubjectTeacher> BatchSubjectTeachers { get; set; }
        public DbSet<StudentEnrollment> StudentEnrollments { get; set; }
        public DbSet<FeePlan> FeePlans { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Exam> Exams { get; set; }
        public DbSet<ExamSubject> ExamSubjects { get; set; }
        public DbSet<Mark> Marks { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<ClassSchedule> ClassSchedules { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<PendingRegistration> PendingRegistrations { get; set; }
        public DbSet<PasswordResetOtp>    PasswordResetOtps    { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Tenant
            modelBuilder.Entity<Tenant>()
                .HasIndex(t => t.Slug)
                .IsUnique();

            // TenantSettings — 1-to-1 with Tenant
            modelBuilder.Entity<TenantSettings>()
                .HasOne(ts => ts.Tenant)
                .WithOne(t => t.Settings)
                .HasForeignKey<TenantSettings>(ts => ts.TenantId);

            // TenantFeature — composite unique (tenant_id, feature_key)
            modelBuilder.Entity<TenantFeature>()
                .HasIndex(tf => new { tf.TenantId, tf.FeatureKey })
                .IsUnique();

            // Role — unique code
            modelBuilder.Entity<Role>()
                .HasIndex(r => r.Code)
                .IsUnique();

            // TenantUserRole — composite unique (tenant_id, user_id, role_id, branch_id)
            modelBuilder.Entity<TenantUserRole>()
                .HasIndex(tur => new { tur.TenantId, tur.UserId, tur.RoleId, tur.BranchId })
                .IsUnique();

            modelBuilder.Entity<TenantUserRole>()
                .HasIndex(tur => new { tur.TenantId, tur.UserId });

            // Student — composite unique (tenant_id, admission_no)
            modelBuilder.Entity<Student>()
                .HasIndex(s => new { s.TenantId, s.AdmissionNo })
                .IsUnique();

            // Teacher — composite unique (tenant_id, employee_code)
            modelBuilder.Entity<Teacher>()
                .HasIndex(t => new { t.TenantId, t.EmployeeCode })
                .IsUnique();

            // Subject — composite unique (tenant_id, code) — only when code is set
            modelBuilder.Entity<Subject>()
                .HasIndex(s => new { s.TenantId, s.Code })
                .IsUnique()
                .HasFilter("code IS NOT NULL");

            // BatchSubjectTeacher — composite unique
            modelBuilder.Entity<BatchSubjectTeacher>()
                .HasIndex(bst => new { bst.TenantId, bst.BatchId, bst.SubjectId, bst.TeacherId })
                .IsUnique();

            // StudentEnrollment — index for common queries
            modelBuilder.Entity<StudentEnrollment>()
                .HasIndex(se => new { se.TenantId, se.StudentId, se.IsActive });

            // FeePlan — decimal precision
            modelBuilder.Entity<FeePlan>()
                .Property(fp => fp.Amount)
                .HasPrecision(10, 2);

            // Payment — decimal precision + indexes
            modelBuilder.Entity<Payment>()
                .Property(p => p.AmountPaid)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Payment>()
                .HasIndex(p => new { p.TenantId, p.StudentId, p.PaymentDate });

            // ExamSubject — composite unique
            modelBuilder.Entity<ExamSubject>()
                .HasIndex(es => new { es.TenantId, es.ExamId, es.SubjectId })
                .IsUnique();

            // Mark — composite unique + decimal precision
            modelBuilder.Entity<Mark>()
                .HasIndex(m => new { m.TenantId, m.ExamSubjectId, m.StudentId })
                .IsUnique();

            modelBuilder.Entity<Mark>()
                .Property(m => m.MarksObtained)
                .HasPrecision(5, 2);

            modelBuilder.Entity<Mark>()
                .HasIndex(m => new { m.TenantId, m.StudentId });

            // Exam — index for common queries
            modelBuilder.Entity<Exam>()
                .HasIndex(e => new { e.TenantId, e.BatchId, e.Status });

            // AuditLog — index for common queries
            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => new { a.TenantId, a.CreatedAt });

            // AuditLog.MetadataJson stored as jsonb in PostgreSQL
            modelBuilder.Entity<AuditLog>()
                .Property(a => a.MetadataJson)
                .HasColumnType("jsonb");

            // TenantSettings.LandingPageJson stored as jsonb in PostgreSQL
            modelBuilder.Entity<TenantSettings>()
                .Property(ts => ts.LandingPageJson)
                .HasColumnType("jsonb");

            // User.IsEmailVerified — DB default true so existing rows are not locked out after migration
            modelBuilder.Entity<User>()
                .Property(u => u.IsEmailVerified)
                .HasDefaultValue(true);

            // PendingRegistration — unique index on email (one pending per email at a time)
            modelBuilder.Entity<PendingRegistration>()
                .HasIndex(pr => pr.Email)
                .IsUnique();

            modelBuilder.Entity<PendingRegistration>()
                .Property(pr => pr.OtpHash)
                .HasMaxLength(64)
                .IsRequired();

            modelBuilder.Entity<PendingRegistration>()
                .Property(pr => pr.OtpSalt)
                .HasMaxLength(32)
                .IsRequired();

            // PasswordResetOtp — one active reset per email+tenant at a time
            modelBuilder.Entity<PasswordResetOtp>()
                .HasIndex(pr => new { pr.Email, pr.TenantId })
                .IsUnique();

            modelBuilder.Entity<PasswordResetOtp>()
                .Property(pr => pr.OtpHash)
                .HasMaxLength(64)
                .IsRequired();

            modelBuilder.Entity<PasswordResetOtp>()
                .Property(pr => pr.OtpSalt)
                .HasMaxLength(32)
                .IsRequired();

            // Attendance — one record per student per batch per day
            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.TenantId, a.BatchId, a.StudentId, a.Date })
                .IsUnique();

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.TenantId, a.BatchId, a.Date });

            modelBuilder.Entity<Attendance>()
                .HasIndex(a => new { a.TenantId, a.StudentId, a.Date });

            // Restrict cascade deletes on all FKs to avoid accidental data loss
            foreach (var fk in modelBuilder.Model.GetEntityTypes()
                .SelectMany(e => e.GetForeignKeys()))
            {
                fk.DeleteBehavior = DeleteBehavior.Restrict;
            }
        }
    }
}
