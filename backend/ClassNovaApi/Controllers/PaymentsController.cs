using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private static readonly HashSet<string> ValidMethods = new() { "CASH", "UPI", "CARD", "BANK" };

        private readonly AppDbContext _context;

        public PaymentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll(
            [FromQuery] Guid? studentId      = null,
            [FromQuery] Guid? feePlanId      = null,
            [FromQuery] Guid? batchId        = null,
            [FromQuery] Guid? classId        = null,
            [FromQuery] Guid? academicYearId = null,
            [FromQuery] DateOnly? fromDate   = null,
            [FromQuery] DateOnly? toDate     = null,
            [FromQuery] int page     = 1,
            [FromQuery] int pageSize = 200)
        {
            var tenantId = User.GetTenantId();

            var query = _context.Payments.Where(p => p.TenantId == tenantId);

            if (studentId.HasValue) query = query.Where(p => p.StudentId  == studentId);
            if (feePlanId.HasValue) query = query.Where(p => p.FeePlanId  == feePlanId);
            if (fromDate.HasValue)  query = query.Where(p => p.PaymentDate >= fromDate);
            if (toDate.HasValue)    query = query.Where(p => p.PaymentDate <= toDate);

            // batchId is the most specific — classId and academicYearId broaden the scope
            if (batchId.HasValue)
            {
                var studentIds = _context.StudentEnrollments
                    .Where(e => e.TenantId == tenantId && e.BatchId == batchId && e.IsActive)
                    .Select(e => e.StudentId);
                query = query.Where(p => studentIds.Contains(p.StudentId));
            }
            else if (classId.HasValue)
            {
                var batchIds = _context.Batches
                    .Where(b => b.TenantId == tenantId && b.ClassId == classId)
                    .Select(b => b.Id);
                var studentIds = _context.StudentEnrollments
                    .Where(e => e.TenantId == tenantId && e.BatchId != null && batchIds.Contains(e.BatchId.Value) && e.IsActive)
                    .Select(e => e.StudentId);
                query = query.Where(p => studentIds.Contains(p.StudentId));
            }
            else if (academicYearId.HasValue)
            {
                var batchIds = _context.Batches
                    .Where(b => b.TenantId == tenantId && b.AcademicYearId == academicYearId)
                    .Select(b => b.Id);
                var studentIds = _context.StudentEnrollments
                    .Where(e => e.TenantId == tenantId && e.BatchId != null && batchIds.Contains(e.BatchId.Value) && e.IsActive)
                    .Select(e => e.StudentId);
                query = query.Where(p => studentIds.Contains(p.StudentId));
            }

            var total = query.Count();

            var payments = query
                .OrderByDescending(p => p.PaymentDate)
                .ThenByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PaymentDto
                {
                    Id              = p.Id,
                    SystemId        = p.SystemId ?? string.Empty,
                    StudentId       = p.StudentId,
                    StudentName     = p.Student.FullName,
                    AdmissionNo     = p.Student.AdmissionNo,
                    FeePlanId       = p.FeePlanId,
                    FeePlanName     = p.FeePlan.Name,
                    FeePlanCategory = p.FeePlan.Category,
                    AmountPaid      = p.AmountPaid,
                    PaymentDate     = p.PaymentDate,
                    PaymentMethod   = p.PaymentMethod,
                    ReferenceNo     = p.ReferenceNo,
                    Notes           = p.Notes,
                    CreatedAt       = p.CreatedAt,
                })
                .ToList();

            return Ok(new ApiResponse<object>(new { payments, total, page, pageSize }));
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreatePaymentRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var methodUpper = request.PaymentMethod.ToUpper();
            if (!ValidMethods.Contains(methodUpper))
                return BadRequest(new ApiResponse<object>(null, "Payment method must be CASH, UPI, CARD, or BANK."));

            if (request.PaymentDate > DateOnly.FromDateTime(DateTime.UtcNow))
                return BadRequest(new ApiResponse<object>(null, "Payment date cannot be in the future."));

            var tenantId = User.GetTenantId();

            var student = _context.Students.FirstOrDefault(s => s.TenantId == tenantId && s.Id == request.StudentId);
            if (student == null)
                return BadRequest(new ApiResponse<object>(null, "Student not found in this tenant."));

            var feePlan = _context.FeePlans.FirstOrDefault(fp => fp.TenantId == tenantId && fp.Id == request.FeePlanId);
            if (feePlan == null)
                return BadRequest(new ApiResponse<object>(null, "Fee plan not found in this tenant."));

            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now       = DateTime.UtcNow;
            var paymentId = Guid.NewGuid();
            var payment   = new Payment
            {
                Id            = paymentId,
                TenantId      = tenantId,
                StudentId     = request.StudentId,
                FeePlanId     = request.FeePlanId,
                AmountPaid    = request.AmountPaid,
                PaymentDate   = request.PaymentDate,
                PaymentMethod = methodUpper,
                ReferenceNo   = string.IsNullOrWhiteSpace(request.ReferenceNo) ? null : request.ReferenceNo.Trim(),
                Notes         = string.IsNullOrWhiteSpace(request.Notes)       ? null : request.Notes.Trim(),
                SystemId      = SystemIdService.Generate(tenantCode, SystemIdService.Payment, paymentId),
                CreatedAt     = now,
                UpdatedAt     = now,
            };

            _context.Payments.Add(payment);
            _context.SaveChanges();

            var dto = new PaymentDto
            {
                Id              = payment.Id,
                SystemId        = payment.SystemId ?? string.Empty,
                StudentId       = payment.StudentId,
                StudentName     = student.FullName,
                AdmissionNo     = student.AdmissionNo,
                FeePlanId       = payment.FeePlanId,
                FeePlanName     = feePlan.Name,
                FeePlanCategory = feePlan.Category,
                AmountPaid      = payment.AmountPaid,
                PaymentDate     = payment.PaymentDate,
                PaymentMethod   = payment.PaymentMethod,
                ReferenceNo     = payment.ReferenceNo,
                Notes           = payment.Notes,
                CreatedAt       = payment.CreatedAt,
            };

            return Ok(new ApiResponse<PaymentDto>(dto));
        }

        [HttpGet("batch-collection")]
        public IActionResult GetBatchCollection([FromQuery] Guid batchId)
        {
            var tenantId = User.GetTenantId();

            var batch = _context.Batches
                .Where(b => b.TenantId == tenantId && b.Id == batchId)
                .Select(b => new { b.Id, b.Name })
                .FirstOrDefault();

            if (batch == null)
                return NotFound(new ApiResponse<object>(null, "Batch not found."));

            // Resolve the fee plan linked directly to this batch (if any)
            var linkedFeePlan = _context.FeePlans
                .Where(fp => fp.TenantId == tenantId && fp.BatchId == batchId && fp.IsActive)
                .Select(fp => new FeePlanDto
                {
                    Id        = fp.Id,
                    SystemId  = fp.SystemId ?? string.Empty,
                    Name      = fp.Name,
                    Category  = fp.Category,
                    Frequency = fp.Frequency,
                    Amount    = fp.Amount,
                    DueDay    = fp.DueDay,
                    IsActive  = fp.IsActive,
                })
                .FirstOrDefault();

            // All active student IDs enrolled in this batch
            var enrolledStudentIds = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == batchId && e.IsActive)
                .Select(e => e.StudentId)
                .ToList();

            if (enrolledStudentIds.Count == 0)
            {
                return Ok(new ApiResponse<BatchCollectionDto>(new BatchCollectionDto
                {
                    BatchId      = batch.Id,
                    BatchName    = batch.Name,
                    LinkedFeePlan = linkedFeePlan,
                    Students     = new List<BatchCollectionStudentRow>()
                }));
            }

            // Payment sums per student — scoped to linked fee plan if one exists
            var paymentsQuery = _context.Payments
                .Where(p => p.TenantId == tenantId && enrolledStudentIds.Contains(p.StudentId));

            if (linkedFeePlan != null)
                paymentsQuery = paymentsQuery.Where(p => p.FeePlanId == linkedFeePlan.Id);

            var paymentSummaries = paymentsQuery
                .GroupBy(p => p.StudentId)
                .Select(g => new
                {
                    StudentId       = g.Key,
                    TotalPaid       = g.Sum(p => p.AmountPaid),
                    LastPaymentDate = g.Max(p => (DateOnly?)p.PaymentDate),
                    PaymentCount    = g.Count()
                })
                .ToList();

            // Student details — ordered by name
            var students = _context.Students
                .Where(s => s.TenantId == tenantId && enrolledStudentIds.Contains(s.Id))
                .OrderBy(s => s.FullName)
                .Select(s => new { s.Id, s.FullName, s.AdmissionNo })
                .ToList();

            var rows = students.Select(s =>
            {
                var summary = paymentSummaries.FirstOrDefault(ps => ps.StudentId == s.Id);
                return new BatchCollectionStudentRow
                {
                    StudentId       = s.Id,
                    StudentName     = s.FullName,
                    AdmissionNo     = s.AdmissionNo,
                    TotalPaid       = summary?.TotalPaid ?? 0m,
                    LastPaymentDate = summary?.LastPaymentDate,
                    PaymentCount    = summary?.PaymentCount ?? 0,
                };
            }).ToList();

            return Ok(new ApiResponse<BatchCollectionDto>(new BatchCollectionDto
            {
                BatchId       = batch.Id,
                BatchName     = batch.Name,
                LinkedFeePlan = linkedFeePlan,
                Students      = rows,
            }));
        }

        [HttpDelete("{id:guid}")]
        public IActionResult Delete(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var payment  = _context.Payments.FirstOrDefault(p => p.TenantId == tenantId && p.Id == id);

            if (payment == null)
                return NotFound(new ApiResponse<object>(null, "Payment not found."));

            _context.Payments.Remove(payment);
            _context.SaveChanges();

            return Ok(new ApiResponse<object>(new { id }));
        }
    }
}
