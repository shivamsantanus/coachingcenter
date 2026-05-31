using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    public class CreateBranchRequest
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Code { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? MapUrl { get; set; }
    }

    public class UpdateBranchRequest
    {
        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; }

        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(500)]
        public string? MapUrl { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class BranchesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BranchesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAll()
        {
            var tenantId = User.GetTenantId();

            var branches = _context.Branches
                .Where(b => b.TenantId == tenantId)
                .OrderBy(b => b.Name)
                .Select(b => new { b.Id, b.Name, b.Code, b.Address, b.Phone, b.MapUrl, b.Status })
                .ToList();

            return Ok(new { success = true, data = branches, error = (string?)null });
        }

        [HttpGet("{id:guid}")]
        public IActionResult GetById(Guid id)
        {
            var tenantId = User.GetTenantId();

            var branch = _context.Branches
                .Where(b => b.TenantId == tenantId && b.Id == id)
                .Select(b => new { b.Id, b.Name, b.Code, b.Address, b.Phone, b.MapUrl, b.Status })
                .FirstOrDefault();

            if (branch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Branch not found." });

            return Ok(new { success = true, data = branch, error = (string?)null });
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateBranchRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            var nameExists = _context.Branches
                .Any(b => b.TenantId == tenantId && b.Name == request.Name);

            if (nameExists)
                return Conflict(new { success = false, data = (object?)null, error = "A branch with this name already exists." });

            if (!string.IsNullOrWhiteSpace(request.Code))
            {
                var codeExists = _context.Branches
                    .Any(b => b.TenantId == tenantId && b.Code == request.Code);

                if (codeExists)
                    return Conflict(new { success = false, data = (object?)null, error = "A branch with this code already exists." });
            }

            var now = DateTime.UtcNow;
            var branch = new Branch
            {
                Id        = Guid.NewGuid(),
                TenantId  = tenantId,
                Name      = request.Name.Trim(),
                Code      = string.IsNullOrWhiteSpace(request.Code)    ? null : request.Code.Trim(),
                Address   = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim(),
                Phone     = string.IsNullOrWhiteSpace(request.Phone)   ? null : request.Phone.Trim(),
                MapUrl    = string.IsNullOrWhiteSpace(request.MapUrl)  ? null : request.MapUrl.Trim(),
                Status    = "ACTIVE",
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Branches.Add(branch);
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { branch.Id, branch.Name, branch.Code, branch.Address, branch.Phone, branch.MapUrl, branch.Status },
                error   = (string?)null
            });
        }

        [HttpPut("{id:guid}")]
        public IActionResult Update(Guid id, [FromBody] UpdateBranchRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var branch   = _context.Branches.FirstOrDefault(b => b.TenantId == tenantId && b.Id == id);

            if (branch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Branch not found." });

            if (request.Name != null && request.Name != branch.Name)
            {
                var nameExists = _context.Branches
                    .Any(b => b.TenantId == tenantId && b.Name == request.Name && b.Id != id);

                if (nameExists)
                    return Conflict(new { success = false, data = (object?)null, error = "A branch with this name already exists." });

                branch.Name = request.Name.Trim();
            }

            if (request.Code != null && request.Code != branch.Code)
            {
                var normalizedCode = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();

                if (normalizedCode != null)
                {
                    var codeExists = _context.Branches
                        .Any(b => b.TenantId == tenantId && b.Code == normalizedCode && b.Id != id);

                    if (codeExists)
                        return Conflict(new { success = false, data = (object?)null, error = "A branch with this code already exists." });
                }

                branch.Code = normalizedCode;
            }

            if (request.Address != null)
                branch.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();

            if (request.Phone != null)
                branch.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

            if (request.MapUrl != null)
                branch.MapUrl = string.IsNullOrWhiteSpace(request.MapUrl) ? null : request.MapUrl.Trim();

            branch.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new
            {
                success = true,
                data    = new { branch.Id, branch.Name, branch.Code, branch.Address, branch.Phone, branch.MapUrl, branch.Status },
                error   = (string?)null
            });
        }

        [HttpPatch("{id:guid}/status")]
        public IActionResult UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();
            var branch   = _context.Branches.FirstOrDefault(b => b.TenantId == tenantId && b.Id == id);

            if (branch == null)
                return NotFound(new { success = false, data = (object?)null, error = "Branch not found." });

            var normalized = request.Status.ToUpper();
            if (normalized != "ACTIVE" && normalized != "INACTIVE")
                return BadRequest(new { success = false, data = (object?)null, error = "Status must be ACTIVE or INACTIVE." });

            branch.Status    = normalized;
            branch.UpdatedAt = DateTime.UtcNow;
            _context.SaveChanges();

            return Ok(new { success = true, data = new { branch.Id, branch.Status }, error = (string?)null });
        }
    }
}
