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

            if (studentId.HasValue) query = query.Where(p => p.StudentId == studentId);
            if (fromDate.HasValue)  query = query.Where(p => p.PaymentDate >= fromDate);
            if (toDate.HasValue)    query = query.Where(p => p.PaymentDate <= toDate);

            if (feePlanId.HasValue)
                query = query.Where(p => p.LineItems.Any(li => li.FeePlanId == feePlanId));

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
                    Id            = p.Id,
                    SystemId      = p.SystemId ?? string.Empty,
                    StudentId     = p.StudentId,
                    StudentName   = p.Student.FullName,
                    AdmissionNo   = p.Student.AdmissionNo,
                    TotalAmount   = p.TotalAmount,
                    PaymentDate   = p.PaymentDate,
                    PaymentMethod = p.PaymentMethod,
                    ReferenceNo   = p.ReferenceNo,
                    Notes         = p.Notes,
                    CreatedAt     = p.CreatedAt,
                    LineItems     = p.LineItems.Select(li => new PaymentLineItemDto
                    {
                        FeePlanId       = li.FeePlanId,
                        FeePlanName     = li.FeePlan.Name,
                        FeePlanCategory = li.FeePlan.Category,
                        AmountPaid      = li.AmountPaid,
                    }).ToList(),
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

            if (request.Plans == null || request.Plans.Count == 0)
                return BadRequest(new ApiResponse<object>(null, "At least one fee plan is required."));

            var tenantId = User.GetTenantId();

            var student = _context.Students.FirstOrDefault(s => s.TenantId == tenantId && s.Id == request.StudentId);
            if (student == null)
                return BadRequest(new ApiResponse<object>(null, "Student not found in this tenant."));

            var planIds  = request.Plans.Select(p => p.FeePlanId).ToList();
            var feePlans = _context.FeePlans
                .Where(fp => fp.TenantId == tenantId && planIds.Contains(fp.Id))
                .ToDictionary(fp => fp.Id);

            foreach (var planItem in request.Plans)
            {
                if (!feePlans.ContainsKey(planItem.FeePlanId))
                    return BadRequest(new ApiResponse<object>(null, $"Fee plan not found in this tenant."));
                if (planItem.AmountPaid <= 0)
                    return BadRequest(new ApiResponse<object>(null, "Each payment amount must be greater than zero."));
            }

            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now       = DateTime.UtcNow;
            var paymentId = Guid.NewGuid();
            var total     = request.Plans.Sum(p => p.AmountPaid);

            var payment = new Payment
            {
                Id            = paymentId,
                TenantId      = tenantId,
                StudentId     = request.StudentId,
                TotalAmount   = total,
                PaymentDate   = request.PaymentDate,
                PaymentMethod = methodUpper,
                ReferenceNo   = string.IsNullOrWhiteSpace(request.ReferenceNo) ? null : request.ReferenceNo.Trim(),
                Notes         = string.IsNullOrWhiteSpace(request.Notes)       ? null : request.Notes.Trim(),
                SystemId      = SystemIdService.Generate(tenantCode, SystemIdService.Payment, paymentId),
                CreatedAt     = now,
                UpdatedAt     = now,
            };

            var lineItems = request.Plans.Select(planItem => new PaymentLineItem
            {
                Id        = Guid.NewGuid(),
                PaymentId = paymentId,
                FeePlanId = planItem.FeePlanId,
                AmountPaid = planItem.AmountPaid,
            }).ToList();

            _context.Payments.Add(payment);
            _context.PaymentLineItems.AddRange(lineItems);
            _context.SaveChanges();

            var dto = new PaymentDto
            {
                Id            = payment.Id,
                SystemId      = payment.SystemId ?? string.Empty,
                StudentId     = payment.StudentId,
                StudentName   = student.FullName,
                AdmissionNo   = student.AdmissionNo,
                TotalAmount   = payment.TotalAmount,
                PaymentDate   = payment.PaymentDate,
                PaymentMethod = payment.PaymentMethod,
                ReferenceNo   = payment.ReferenceNo,
                Notes         = payment.Notes,
                CreatedAt     = payment.CreatedAt,
                LineItems     = lineItems.Select(li => new PaymentLineItemDto
                {
                    FeePlanId       = li.FeePlanId,
                    FeePlanName     = feePlans[li.FeePlanId].Name,
                    FeePlanCategory = feePlans[li.FeePlanId].Category,
                    AmountPaid      = li.AmountPaid,
                }).ToList(),
            };

            return Ok(new ApiResponse<PaymentDto>(dto));
        }

        [HttpGet("batch-collection")]
        public IActionResult GetBatchCollection(
            [FromQuery] Guid batchId,
            [FromQuery] int? month = null,
            [FromQuery] int? year  = null)
        {
            var tenantId = User.GetTenantId();

            if (month.HasValue != year.HasValue)
                return BadRequest(new ApiResponse<object>(null, "month and year must be provided together."));

            if (month.HasValue && (month < 1 || month > 12))
                return BadRequest(new ApiResponse<object>(null, "month must be between 1 and 12."));

            var batch = _context.Batches
                .Where(b => b.TenantId == tenantId && b.Id == batchId)
                .Select(b => new { b.Id, b.Name })
                .FirstOrDefault();

            if (batch == null)
                return NotFound(new ApiResponse<object>(null, "Batch not found."));

            var linkedFeePlans = _context.FeePlans
                .Where(fp => fp.TenantId == tenantId && fp.BatchId == batchId && fp.IsActive)
                .OrderBy(fp => fp.Category)
                .ThenBy(fp => fp.Name)
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
                .ToList();

            var enrolledStudentIds = _context.StudentEnrollments
                .Where(e => e.TenantId == tenantId && e.BatchId == batchId && e.IsActive)
                .Select(e => e.StudentId)
                .ToList();

            var linkedFeePlanIds = linkedFeePlans.Select(fp => fp.Id).ToList();

            if (enrolledStudentIds.Count == 0)
            {
                return Ok(new ApiResponse<BatchCollectionDto>(new BatchCollectionDto
                {
                    BatchId        = batch.Id,
                    BatchName      = batch.Name,
                    LinkedFeePlans = linkedFeePlans,
                    Students       = new List<BatchCollectionStudentRow>()
                }));
            }

            // Query through line items to get per-student payment totals
            var lineItemsQuery = _context.PaymentLineItems
                .Where(li => li.Payment.TenantId == tenantId
                          && enrolledStudentIds.Contains(li.Payment.StudentId));

            if (linkedFeePlanIds.Count > 0)
                lineItemsQuery = lineItemsQuery.Where(li => linkedFeePlanIds.Contains(li.FeePlanId));

            if (month.HasValue && year.HasValue)
                lineItemsQuery = lineItemsQuery.Where(li =>
                    li.Payment.PaymentDate.Month == month.Value && li.Payment.PaymentDate.Year == year.Value);

            var paymentSummaries = lineItemsQuery
                .GroupBy(li => li.Payment.StudentId)
                .Select(g => new
                {
                    StudentId       = g.Key,
                    TotalPaid       = g.Sum(li => li.AmountPaid),
                    LastPaymentDate = g.Max(li => (DateOnly?)li.Payment.PaymentDate),
                    PaymentCount    = g.Select(li => li.PaymentId).Distinct().Count(),
                })
                .ToList();

            var students = _context.Students
                .Where(s => s.TenantId == tenantId && enrolledStudentIds.Contains(s.Id))
                .OrderBy(s => s.FullName)
                .Select(s => new { s.Id, s.FullName, s.AdmissionNo })
                .ToList();

            var dueAmount = linkedFeePlans.Count > 0
                ? linkedFeePlans.Sum(fp => fp.Amount)
                : (decimal?)null;

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
                    DueAmount       = dueAmount,
                };
            }).ToList();

            return Ok(new ApiResponse<BatchCollectionDto>(new BatchCollectionDto
            {
                BatchId        = batch.Id,
                BatchName      = batch.Name,
                LinkedFeePlans = linkedFeePlans,
                Students       = rows,
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

            // Delete line items first — Restrict FK prevents cascade
            var lineItems = _context.PaymentLineItems.Where(li => li.PaymentId == id).ToList();
            _context.PaymentLineItems.RemoveRange(lineItems);
            _context.Payments.Remove(payment);
            _context.SaveChanges();

            return Ok(new ApiResponse<object>(new { id }));
        }
    }
}
