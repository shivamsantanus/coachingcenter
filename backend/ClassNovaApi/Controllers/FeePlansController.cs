using System.ComponentModel.DataAnnotations;
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
    public class FeePlansController : ControllerBase
    {
        private static readonly HashSet<string> ValidCategories  = new() { "TUITION", "ADMISSION", "EXAM", "TRANSPORT" };
        private static readonly HashSet<string> ValidFrequencies = new() { "MONTHLY", "QUARTERLY", "ONE_TIME" };

        private readonly AppDbContext _context;

        public FeePlansController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] bool? activeOnly = null)
        {
            var tenantId = User.GetTenantId();

            var query = _context.FeePlans.Where(fp => fp.TenantId == tenantId);

            if (activeOnly == true)
                query = query.Where(fp => fp.IsActive);

            var plans = query
                .OrderBy(fp => fp.Category)
                .ThenBy(fp => fp.Name)
                .Select(fp => new FeePlanDto
                {
                    Id         = fp.Id,
                    SystemId   = fp.SystemId ?? string.Empty,
                    Name       = fp.Name,
                    Category   = fp.Category,
                    Frequency  = fp.Frequency,
                    Amount     = fp.Amount,
                    DueDay     = fp.DueDay,
                    IsActive   = fp.IsActive,
                    BranchId   = fp.BranchId,
                    BranchName = fp.Branch != null ? fp.Branch.Name : null,
                    BatchId    = fp.BatchId,
                    BatchName  = fp.Batch  != null ? fp.Batch.Name  : null,
                    CreatedAt  = fp.CreatedAt,
                })
                .ToList();

            return Ok(new ApiResponse<List<FeePlanDto>>(plans));
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateFeePlanRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var categoryUpper  = request.Category.ToUpper();
            var frequencyUpper = request.Frequency.ToUpper();

            if (!ValidCategories.Contains(categoryUpper))
                return BadRequest(new ApiResponse<object>(null, "Category must be TUITION, ADMISSION, EXAM, or TRANSPORT."));

            if (!ValidFrequencies.Contains(frequencyUpper))
                return BadRequest(new ApiResponse<object>(null, "Frequency must be MONTHLY, QUARTERLY, or ONE_TIME."));

            if (frequencyUpper != "ONE_TIME" && request.DueDay == null)
                return BadRequest(new ApiResponse<object>(null, "DueDay is required for MONTHLY and QUARTERLY fee plans."));

            var tenantId = User.GetTenantId();

            if (request.BranchId.HasValue && !_context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId))
                return BadRequest(new ApiResponse<object>(null, "Branch not found in this tenant."));

            if (request.BatchId.HasValue && !_context.Batches.Any(b => b.TenantId == tenantId && b.Id == request.BatchId))
                return BadRequest(new ApiResponse<object>(null, "Batch not found in this tenant."));

            var tenantCode = _context.Tenants
                .Where(t => t.Id == tenantId)
                .Select(t => t.Code.Trim())
                .First();

            var now      = DateTime.UtcNow;
            var planId   = Guid.NewGuid();
            var feePlan  = new FeePlan
            {
                Id        = planId,
                TenantId  = tenantId,
                Name      = request.Name.Trim(),
                Category  = categoryUpper,
                Frequency = frequencyUpper,
                Amount    = request.Amount,
                DueDay    = frequencyUpper == "ONE_TIME" ? null : request.DueDay,
                IsActive  = true,
                BranchId  = request.BranchId,
                BatchId   = request.BatchId,
                SystemId  = SystemIdService.Generate(tenantCode, SystemIdService.FeePlan, planId),
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.FeePlans.Add(feePlan);
            _context.SaveChanges();

            var dto = BuildDto(feePlan, tenantId);
            return Ok(new ApiResponse<FeePlanDto>(dto));
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateFeePlanRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var feePlan  = _context.FeePlans.FirstOrDefault(fp => fp.TenantId == tenantId && fp.Id == id);

            if (feePlan == null)
                return NotFound(new ApiResponse<object>(null, "Fee plan not found."));

            if (request.Name     != null) feePlan.Name     = request.Name.Trim();
            if (request.Amount   != null) feePlan.Amount   = request.Amount.Value;
            if (request.DueDay   != null) feePlan.DueDay   = request.DueDay;

            if (request.Category != null)
            {
                var categoryUpper = request.Category.ToUpper();
                if (!ValidCategories.Contains(categoryUpper))
                    return BadRequest(new ApiResponse<object>(null, "Invalid category."));
                feePlan.Category = categoryUpper;
            }

            if (request.Frequency != null)
            {
                var frequencyUpper = request.Frequency.ToUpper();
                if (!ValidFrequencies.Contains(frequencyUpper))
                    return BadRequest(new ApiResponse<object>(null, "Invalid frequency."));
                feePlan.Frequency = frequencyUpper;
                if (frequencyUpper == "ONE_TIME")
                    feePlan.DueDay = null;
            }

            if (request.BranchId.HasValue)
            {
                if (request.BranchId.Value == Guid.Empty)
                    feePlan.BranchId = null;
                else if (!_context.Branches.Any(b => b.TenantId == tenantId && b.Id == request.BranchId))
                    return BadRequest(new ApiResponse<object>(null, "Branch not found in this tenant."));
                else
                    feePlan.BranchId = request.BranchId;
            }

            if (request.BatchId.HasValue)
            {
                if (request.BatchId.Value == Guid.Empty)
                    feePlan.BatchId = null;
                else if (!_context.Batches.Any(b => b.TenantId == tenantId && b.Id == request.BatchId))
                    return BadRequest(new ApiResponse<object>(null, "Batch not found in this tenant."));
                else
                    feePlan.BatchId = request.BatchId;
            }

            feePlan.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            var dto = BuildDto(feePlan, tenantId);
            return Ok(new ApiResponse<FeePlanDto>(dto));
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var feePlan  = _context.FeePlans.FirstOrDefault(fp => fp.TenantId == tenantId && fp.Id == id);

            if (feePlan == null)
                return NotFound(new ApiResponse<object>(null, "Fee plan not found."));

            var normalized = request.Status.ToUpper();
            if (normalized != "ACTIVE" && normalized != "INACTIVE")
                return BadRequest(new ApiResponse<object>(null, "Status must be ACTIVE or INACTIVE."));

            feePlan.IsActive  = normalized == "ACTIVE";
            feePlan.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new ApiResponse<object>(new { feePlan.Id, IsActive = feePlan.IsActive }));
        }

        [HttpDelete("{id:guid}")]
        public IActionResult Delete(Guid id)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId  = User.GetTenantId();
            var feePlan   = _context.FeePlans.FirstOrDefault(fp => fp.TenantId == tenantId && fp.Id == id);

            if (feePlan == null)
                return NotFound(new ApiResponse<object>(null, "Fee plan not found."));

            var hasPayments = _context.PaymentLineItems.Any(li => li.Payment.TenantId == tenantId && li.FeePlanId == id);
            if (hasPayments)
                return Conflict(new ApiResponse<object>(null, "Cannot delete a fee plan that has associated payments."));

            _context.FeePlans.Remove(feePlan);
            _context.SaveChanges();

            return Ok(new ApiResponse<object>(new { id }));
        }

        private FeePlanDto BuildDto(FeePlan fp, Guid tenantId)
        {
            string? branchName = fp.BranchId.HasValue
                ? _context.Branches.Where(b => b.TenantId == tenantId && b.Id == fp.BranchId).Select(b => b.Name).FirstOrDefault()
                : null;

            string? batchName = fp.BatchId.HasValue
                ? _context.Batches.Where(b => b.TenantId == tenantId && b.Id == fp.BatchId).Select(b => b.Name).FirstOrDefault()
                : null;

            return new FeePlanDto
            {
                Id         = fp.Id,
                SystemId   = fp.SystemId ?? string.Empty,
                Name       = fp.Name,
                Category   = fp.Category,
                Frequency  = fp.Frequency,
                Amount     = fp.Amount,
                DueDay     = fp.DueDay,
                IsActive   = fp.IsActive,
                BranchId   = fp.BranchId,
                BranchName = branchName,
                BatchId    = fp.BatchId,
                BatchName  = batchName,
                CreatedAt  = fp.CreatedAt,
            };
        }
    }
}
