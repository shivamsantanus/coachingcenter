using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using System.Linq;

namespace ClassNovaApi.Controllers
{
    /// <summary>Development-only seed endpoint. Not available in Production.</summary>
    [ApiController]
    [Route("api/dev")]
    [Authorize]
    public class DevSeedController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<DevSeedController> _logger;

        public DevSeedController(AppDbContext context, ILogger<DevSeedController> logger)
        {
            _context = context;
            _logger  = logger;
        }

        // POST /api/dev/seed
        // ORG_ADMIN only. Creates academic year, 12 classes, 5 batches,
        // 34 subjects, 100 teachers, 200 students — all scoped to the caller's tenant.
        [HttpPost("seed")]
        public IActionResult Seed()
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            if (_context.AcademicYears.Any(ay => ay.TenantId == tenantId && ay.Name == "2025-2026"))
                return BadRequest(new { success = false, data = (object?)null, error = "Seed data already exists for this tenant. Drop and re-seed if needed." });

            var now = DateTime.UtcNow;

            // ── 1. Academic Year ──────────────────────────────────────────────
            var academicYear = new AcademicYear
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                Name      = "2025-2026",
                StartDate = new DateOnly(2025, 6, 1),
                EndDate   = new DateOnly(2026, 5, 31),
                IsActive  = true,
                CreatedAt = now,
                UpdatedAt = now
            };
            _context.AcademicYears.Add(academicYear);

            // ── 2. Classes (1 through 12) ─────────────────────────────────────
            var classes = Enumerable.Range(1, 12).Select(n => new Class
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                Name      = $"Class {n}",
                SortOrder = n,
                Status    = "ACTIVE",
                CreatedAt = now,
                UpdatedAt = now
            }).ToList();
            _context.Classes.AddRange(classes);

            // ── 3. Batches (5) ────────────────────────────────────────────────
            var batchDefs = new[]
            {
                ("Morning Batch",         new TimeOnly(6, 0),  new TimeOnly(8, 0)),
                ("Afternoon Batch",       new TimeOnly(12, 0), new TimeOnly(14, 0)),
                ("Evening Batch",         new TimeOnly(16, 0), new TimeOnly(18, 0)),
                ("Weekend Morning Batch", new TimeOnly(9, 0),  new TimeOnly(12, 0)),
                ("Online Batch",          (TimeOnly?)null,     (TimeOnly?)null)
            };

            var batches = batchDefs.Select(def => new Batch
            {
                Id             = Guid.NewGuid(),
                TenantId       = tenantId,
                AcademicYearId = academicYear.Id,
                Name           = def.Item1,
                StartDate      = new DateOnly(2025, 6, 1),
                EndDate        = new DateOnly(2026, 5, 31),
                StartTime      = def.Item2,
                EndTime        = def.Item3,
                Status         = "ACTIVE",
                CreatedAt      = now,
                UpdatedAt      = now
            }).ToList();
            _context.Batches.AddRange(batches);

            // ── 4. Subjects (34) ──────────────────────────────────────────────
            var subjectDefs = new[]
            {
                ("Mathematics",           "MATH"),
                ("Physics",               "PHY"),
                ("Chemistry",             "CHEM"),
                ("Biology",               "BIO"),
                ("Economics",             "ECO"),
                ("Accountancy",           "ACCT"),
                ("Business Studies",      "BST"),
                ("History",               "HIST"),
                ("Geography",             "GEO"),
                ("Political Science",     "POLSC"),
                ("Psychology",            "PSY"),
                ("Sociology",             "SOC"),
                ("English",               "ENG"),
                ("Hindi",                 "HINDI"),
                ("Sanskrit",              "SANSK"),
                ("French",                "FRE"),
                ("Computer Science",      "CS"),
                ("Information Technology","IT"),
                ("Physical Education",    "PE"),
                ("Environmental Science", "EVS"),
                ("Statistics",            "STAT"),
                ("Reasoning & Aptitude",  "REASN"),
                ("General Knowledge",     "GK"),
                ("Biotechnology",         "BTECH"),
                ("Fine Arts",             "ARTS"),
                ("Music",                 "MUSIC"),
                ("Home Science",          "HOMSC"),
                ("Philosophy",            "PHIL"),
                ("Legal Studies",         "LEGAL"),
                ("Entrepreneurship",      "ENTR"),
                ("Mathematics (Advanced)","MATHA"),
                ("Applied Mathematics",   "APMAT"),
                ("Urdu",                  "URDU"),
                ("German",                "GER")
            };

            var subjects = subjectDefs.Select(def => new Subject
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                Name      = def.Item1,
                Code      = def.Item2,
                CreatedAt = now,
                UpdatedAt = now
            }).ToList();
            _context.Subjects.AddRange(subjects);

            // ── 5. Name pools ─────────────────────────────────────────────────
            var maleFirstNames = new[]
            {
                "Rahul", "Amit", "Pradeep", "Vikram", "Suresh", "Rajesh", "Arjun", "Karan",
                "Nikhil", "Sanjay", "Rohit", "Manish", "Deepak", "Aakash", "Vivek", "Gaurav",
                "Sachin", "Ankit", "Piyush", "Mohit", "Varun", "Harsh", "Dhruv", "Tarun",
                "Ravi", "Ajay", "Pranav", "Shivam", "Kunal", "Abhishek"
            };

            var femaleFirstNames = new[]
            {
                "Priya", "Neha", "Kavita", "Sunita", "Pooja", "Rina", "Anjali", "Divya",
                "Meena", "Shruti", "Rekha", "Nisha", "Swati", "Pallavi", "Geeta", "Ananya",
                "Sonal", "Ritu", "Archana", "Mamta", "Shweta", "Tanvi", "Komal", "Simran",
                "Ishita", "Preeti", "Vandana", "Deepika", "Jyoti", "Sneha"
            };

            var lastNames = new[]
            {
                "Sharma", "Verma", "Patel", "Singh", "Gupta", "Yadav", "Mishra", "Pandey",
                "Joshi", "Dubey", "Tiwari", "Agarwal", "Srivastava", "Kumar", "Chauhan",
                "Rao", "Reddy", "Nair", "Menon", "Iyer", "Pillai", "Bose", "Das", "Ghosh",
                "Chatterjee", "Banerjee", "Mehta", "Shah", "Chopra", "Malhotra",
                "Kapoor", "Saxena", "Tripathi", "Shukla", "Dixit", "Bhat", "Naik", "Patil",
                "Desai", "Jain"
            };

            var allFirstNames = maleFirstNames.Concat(femaleFirstNames).ToArray();

            // ── 6. Teachers (100) ─────────────────────────────────────────────
            var teachers = Enumerable.Range(0, 100).Select(i =>
            {
                var firstName = allFirstNames[i % allFirstNames.Length];
                var lastName  = lastNames[(i * 3) % lastNames.Length];
                return new Teacher
                {
                    Id           = Guid.NewGuid(),
                    TenantId     = tenantId,
                    FullName     = $"{firstName} {lastName}",
                    EmployeeCode = $"T{(i + 1):D3}",
                    Status       = "ACTIVE",
                    CreatedAt    = now,
                    UpdatedAt    = now
                };
            }).ToList();
            _context.Teachers.AddRange(teachers);

            // ── 7. Students (200) ─────────────────────────────────────────────
            var students = Enumerable.Range(0, 200).Select(i =>
            {
                var firstName    = allFirstNames[i % allFirstNames.Length];
                var lastName     = lastNames[(i * 7 + 3) % lastNames.Length];
                var guardianFn   = allFirstNames[(i + 15) % allFirstNames.Length];
                var guardianLn   = lastNames[(i * 5 + 1) % lastNames.Length];
                return new Student
                {
                    Id            = Guid.NewGuid(),
                    TenantId      = tenantId,
                    FullName      = $"{firstName} {lastName}",
                    AdmissionNo   = $"STU2024{(i + 1):D3}",
                    GuardianName  = $"{guardianFn} {guardianLn}",
                    GuardianPhone = $"9{(800000000 + i):D9}",
                    Address       = "India",
                    DateOfBirth   = new DateOnly(2005 + (i % 8), (i % 12) + 1, (i % 28) + 1),
                    Status        = "ACTIVE",
                    CreatedAt     = now,
                    UpdatedAt     = now
                };
            }).ToList();
            _context.Students.AddRange(students);

            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data = new
                {
                    academicYear = academicYear.Name,
                    classes      = classes.Count,
                    batches      = batches.Count,
                    subjects     = subjects.Count,
                    teachers     = teachers.Count,
                    students     = students.Count
                },
                error = (string?)null
            });
        }
        // POST /api/dev/seed-attendance
        // Seeds 3 months of realistic attendance data for the first active batch.
        // Also enrolls up to 30 active students in that batch if none are enrolled yet.
        [HttpPost("seed-attendance")]
        public IActionResult SeedAttendance()
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var markerId  = User.GetUserId();
            var now       = DateTime.UtcNow;

            var batch = _context.Batches
                .FirstOrDefault(b => b.TenantId == tenantId && b.Status == "ACTIVE");

            if (batch == null)
                return BadRequest(new { success = false, data = (object?)null, error = "No active batch found. Run /api/dev/seed first." });

            // Ensure at least 30 students are enrolled in this batch
            var enrolledIds = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == batch.Id && e.IsActive)
                .Select(e => e.StudentId)
                .ToHashSet();

            if (enrolledIds.Count < 5)
            {
                var unenrolledStudents = _context.Students
                    .Where(s => s.TenantId == tenantId && s.Status == "ACTIVE" && !enrolledIds.Contains(s.Id))
                    .OrderBy(s => s.AdmissionNo)
                    .Take(30 - enrolledIds.Count)
                    .Select(s => s.Id)
                    .ToList();

                foreach (var studentId in unenrolledStudents)
                {
                    _context.StudentEnrollments.Add(new StudentEnrollment
                    {
                        Id         = Guid.NewGuid(),
                        TenantId   = tenantId,
                        StudentId  = studentId,
                        BatchId    = batch.Id,
                        ClassId    = null,
                        EnrolledOn = new DateOnly(2026, 3, 1),
                        IsActive   = true
                    });
                    enrolledIds.Add(studentId);
                }

                _context.SaveChanges();
            }

            var studentIds = enrolledIds.ToList();

            // Generate attendance for March, April, May 2026 (weekdays only)
            var months = new[]
            {
                (2026, 3),
                (2026, 4),
                (2026, 5)
            };

            // Status distribution: 80% P, 10% A, 7% L, 3% E
            // Use a deterministic spread based on student index + day so results look realistic
            string PickStatus(int studentIdx, int dayOfYear)
            {
                var bucket = (studentIdx * 31 + dayOfYear) % 100;
                if (bucket < 80) return "PRESENT";
                if (bucket < 90) return "ABSENT";
                if (bucket < 97) return "LATE";
                return "EXCUSED";
            }

            var existingKeys = _context.Attendances
                .Where(a => a.TenantId == tenantId && a.BatchId == batch.Id)
                .Select(a => new { a.StudentId, a.Date })
                .AsEnumerable()
                .Select(a => $"{a.StudentId}|{a.Date}")
                .ToHashSet();

            var newRecords = new List<Attendance>();

            foreach (var (year, month) in months)
            {
                var firstDay  = new DateOnly(year, month, 1);
                var lastDay   = firstDay.AddMonths(1).AddDays(-1);

                for (var date = firstDay; date <= lastDay; date = date.AddDays(1))
                {
                    // Skip weekends
                    if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                        continue;

                    for (var si = 0; si < studentIds.Count; si++)
                    {
                        var key = $"{studentIds[si]}|{date}";
                        if (existingKeys.Contains(key))
                            continue;

                        newRecords.Add(new Attendance
                        {
                            Id         = Guid.NewGuid(),
                            TenantId   = tenantId,
                            BatchId    = batch.Id,
                            StudentId  = studentIds[si],
                            Date       = date,
                            Status     = PickStatus(si, date.DayOfYear),
                            MarkedById = markerId,
                            CreatedAt  = now,
                            UpdatedAt  = now
                        });

                        existingKeys.Add(key);
                    }
                }
            }

            _context.Attendances.AddRange(newRecords);
            _context.SaveChanges();

            _logger.LogInformation("Seeded {Count} attendance records for batch {BatchId}", newRecords.Count, batch.Id);

            return Ok(new
            {
                success = true,
                data = new
                {
                    batchName  = batch.Name,
                    students   = studentIds.Count,
                    records    = newRecords.Count,
                    months     = "March, April, May 2026"
                },
                error = (string?)null
            });
        }
    }
}
