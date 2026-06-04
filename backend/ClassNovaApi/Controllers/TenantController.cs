using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;
using ClassNovaApi.Services;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly BrandingService _brandingService;
        private readonly ILogger<TenantController> _logger;

        public TenantController(
            AppDbContext context,
            BrandingService brandingService,
            ILogger<TenantController> logger)
        {
            _context         = context;
            _brandingService = brandingService;
            _logger          = logger;
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAllTenants()
        {
            var role = User.GetRole();
            if (role != "PLATFORM_ADMIN")
                return StatusCode(403, new ApiResponse<object>(null, "Access denied."));

            var tenants = await _context.Tenants
                .Where(t => t.Status != "DELETED")
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new TenantSummaryDto
                {
                    Id                  = t.Id,
                    Name                = t.Name,
                    Slug                = t.Slug,
                    OrganizationType    = t.OrganizationType,
                    Status              = t.Status,
                    PrimaryContactName  = t.PrimaryContactName,
                    PrimaryContactEmail = t.PrimaryContactEmail,
                    PlanCode            = t.PlanCode,
                    CreatedAt           = t.CreatedAt
                })
                .ToListAsync();

            _logger.LogInformation("Platform admin fetched tenant list. Count: {Count}", tenants.Count);
            return Ok(new ApiResponse<List<TenantSummaryDto>>(tenants));
        }

        [Authorize]
        [HttpPost]
        public IActionResult CreateTenant([FromBody] CreateTenantRequest request)
        {
            var role = User.GetRole();
            if (role != "PLATFORM_ADMIN")
                return StatusCode(403, new ApiResponse<object>(null, "Only Platform Admin can create tenants."));

            var slug = request.Slug.ToLower().Trim();

            if (_context.Tenants.Any(t => t.Slug == slug))
                return BadRequest(new ApiResponse<object>(null, "Slug is already taken."));

            var now      = DateTime.UtcNow;
            var tenantId = Guid.NewGuid();

            var tenant = new Tenant
            {
                Id                  = tenantId,
                Name                = request.Name,
                Slug                = slug,
                Code                = SystemIdService.DeriveTenantCode(slug),
                OrganizationType    = request.OrganizationType,
                Status              = "ACTIVE",
                PrimaryContactName  = request.PrimaryContactName,
                PrimaryContactEmail = request.PrimaryContactEmail,
                PrimaryContactPhone = request.PrimaryContactPhone,
                CreatedAt           = now,
                UpdatedAt           = now
            };

            var settings = new TenantSettings
            {
                Id           = Guid.NewGuid(),
                TenantId     = tenantId,
                BrandName    = request.BrandName,
                LogoUrl      = request.LogoUrl,
                Timezone     = request.Timezone,
                CurrencyCode = request.CurrencyCode,
                CreatedAt    = now,
                UpdatedAt    = now
            };

            var features = new List<TenantFeature>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, FeatureKey = "FEES",           IsEnabled = true  },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, FeatureKey = "EXAMS",          IsEnabled = true  },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, FeatureKey = "ATTENDANCE",     IsEnabled = false },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, FeatureKey = "PARENTS_PORTAL", IsEnabled = false }
            };

            _context.Tenants.Add(tenant);
            _context.TenantSettings.Add(settings);
            _context.TenantFeatures.AddRange(features);
            _context.SaveChanges();

            _logger.LogInformation("Tenant created by platform admin. Slug: {Slug}", tenant.Slug);
            return Ok(new ApiResponse<TenantSummaryDto>(new TenantSummaryDto
            {
                Id                  = tenant.Id,
                Name                = tenant.Name,
                Slug                = tenant.Slug,
                OrganizationType    = tenant.OrganizationType,
                Status              = tenant.Status,
                PrimaryContactName  = tenant.PrimaryContactName,
                PrimaryContactEmail = tenant.PrimaryContactEmail,
                PlanCode            = tenant.PlanCode,
                CreatedAt           = tenant.CreatedAt
            }));
        }

        [Authorize]
        [HttpPatch("{id:guid}/status")]
        public async Task<IActionResult> UpdateTenantStatus(Guid id, [FromBody] UpdateTenantStatusRequest request)
        {
            var role = User.GetRole();
            if (role != "PLATFORM_ADMIN")
                return StatusCode(403, new ApiResponse<object>(null, "Access denied."));

            var allowed = new[] { "ACTIVE", "SUSPENDED" };
            var newStatus = request.Status.ToUpper().Trim();
            if (!allowed.Contains(newStatus))
                return BadRequest(new ApiResponse<object>(null, "Status must be ACTIVE or SUSPENDED."));

            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null || tenant.Status == "DELETED")
                return NotFound(new ApiResponse<object>(null, "Tenant not found."));

            tenant.Status    = newStatus;
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Tenant {Slug} status set to {Status} by platform admin", tenant.Slug, newStatus);
            return Ok(new ApiResponse<object>(new { message = $"Tenant status updated to {newStatus}." }));
        }

        [Authorize]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteTenant(Guid id)
        {
            var role = User.GetRole();
            if (role != "PLATFORM_ADMIN")
                return StatusCode(403, new ApiResponse<object>(null, "Access denied."));

            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null || tenant.Status == "DELETED")
                return NotFound(new ApiResponse<object>(null, "Tenant not found."));

            tenant.Status    = "DELETED";
            tenant.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Tenant {Slug} soft-deleted by platform admin", tenant.Slug);
            return Ok(new ApiResponse<object>(new { message = "Tenant deleted." }));
        }

        // Public endpoint — frontend calls this to load branding before showing any page
        [AllowAnonymous]
        [HttpGet("{slug}")]
        public IActionResult GetTenant(string slug)
        {
            var tenant = _context.Tenants
                .Where(t => t.Slug == slug.ToLower())
                .Select(t => new
                {
                    t.Name,
                    t.Slug,
                    t.Status,
                    BrandName    = t.Settings != null ? t.Settings.BrandName    : t.Name,
                    LogoUrl      = t.Settings != null ? t.Settings.LogoUrl      : null,
                    PrimaryColor = t.Settings != null ? t.Settings.PrimaryColor : null,
                    AccentColor  = t.Settings != null ? t.Settings.AccentColor  : null,
                    LandingPageJson = t.Settings != null ? t.Settings.LandingPageJson : null
                })
                .FirstOrDefault();

            if (tenant == null)
                return NotFound(new ApiResponse<object>(null, "Tenant not found."));

            if (tenant.Status != "ACTIVE")
                return BadRequest(new ApiResponse<object>(null, "Tenant is not active."));

            var landingPage = _brandingService.DeserializeLandingPage(tenant.LandingPageJson);

            return Ok(new
            {
                tenant.Name,
                tenant.Slug,
                tenant.Status,
                tenant.BrandName,
                tenant.LogoUrl,
                tenant.PrimaryColor,
                tenant.AccentColor,
                LandingPage = landingPage
            });
        }

        // ORG_ADMIN updates their branding and landing page content
        [Authorize]
        [HttpPut("branding")]
        public async Task<IActionResult> UpdateBranding([FromBody] UpdateBrandingRequest request)
        {
            var role = User.GetRole();
            if (role != "ORG_ADMIN")
                return StatusCode(403, new ApiResponse<object>(null, "Only ORG_ADMIN can update branding."));

            var tenantId = User.GetTenantId();
            var (success, error) = await _brandingService.UpdateBrandingAsync(tenantId, request);

            if (!success)
                return BadRequest(new ApiResponse<object>(null, error!));

            _logger.LogInformation("Branding updated by ORG_ADMIN in tenant {TenantId}", tenantId);
            return Ok(new ApiResponse<object>(new { message = "Branding updated successfully." }));
        }

        // Public endpoint — resolves tenant slug from a custom domain hostname
        [AllowAnonymous]
        [HttpGet("by-domain")]
        public IActionResult GetTenantByDomain([FromQuery] string hostname)
        {
            if (string.IsNullOrWhiteSpace(hostname))
                return BadRequest(new ApiResponse<object>(null, "Hostname is required."));

            var tenant = _context.Tenants
                .Where(t => t.CustomDomain == hostname.ToLower())
                .Select(t => new
                {
                    t.Name,
                    t.Slug,
                    t.Status,
                    BrandName       = t.Settings != null ? t.Settings.BrandName    : t.Name,
                    LogoUrl         = t.Settings != null ? t.Settings.LogoUrl      : null,
                    PrimaryColor    = t.Settings != null ? t.Settings.PrimaryColor : null,
                    AccentColor     = t.Settings != null ? t.Settings.AccentColor  : null,
                    LandingPageJson = t.Settings != null ? t.Settings.LandingPageJson : null
                })
                .FirstOrDefault();

            if (tenant == null)
                return NotFound(new ApiResponse<object>(null, "No tenant mapped to this domain."));

            if (tenant.Status != "ACTIVE")
                return BadRequest(new ApiResponse<object>(null, "Tenant is not active."));

            var landingPage = _brandingService.DeserializeLandingPage(tenant.LandingPageJson);

            return Ok(new
            {
                tenant.Name,
                tenant.Slug,
                tenant.Status,
                tenant.BrandName,
                tenant.LogoUrl,
                tenant.PrimaryColor,
                tenant.AccentColor,
                LandingPage = landingPage
            });
        }

        // Public endpoint — landing page uses this to show the teachers section
        [AllowAnonymous]
        [HttpGet("teachers-preview")]
        public async Task<IActionResult> GetTeachersPreview([FromQuery] string slug)
        {
            if (string.IsNullOrWhiteSpace(slug))
                return BadRequest(new ApiResponse<object>(null, "Tenant slug is required."));

            var tenant = await _context.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Slug == slug.ToLower() && t.Status == "ACTIVE");

            if (tenant == null)
                return NotFound(new ApiResponse<object>(null, "Tenant not found."));

            var teachers = await _context.Teachers
                .Where(t => t.TenantId == tenant.Id && t.Status == "ACTIVE")
                .OrderBy(t => t.CreatedAt)
                .Take(8)
                .Select(t => new TeacherPreviewDto
                {
                    FullName      = t.FullName,
                    Qualification = t.Qualification,
                    PhotoUrl      = t.PhotoUrl
                })
                .ToListAsync();

            return Ok(new ApiResponse<List<TeacherPreviewDto>>(teachers));
        }
    }
}
