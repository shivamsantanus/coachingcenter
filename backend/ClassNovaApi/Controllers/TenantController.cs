using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantController(AppDbContext context)
        {
            _context = context;
        }

        // Open endpoint — in production this would be restricted to Platform Admin
        [AllowAnonymous]
        [HttpPost]
        public IActionResult CreateTenant([FromBody] CreateTenantRequest request)
        {
            var slug = request.Slug.ToLower().Trim();

            if (_context.Tenants.Any(t => t.Slug == slug))
                return BadRequest(new { error = "Slug is already taken." });

            var now = DateTime.UtcNow;
            var tenantId = Guid.NewGuid();

            var tenant = new Tenant
            {
                Id = tenantId,
                Name = request.Name,
                Slug = slug,
                OrganizationType = request.OrganizationType,
                Status = "ACTIVE",
                PrimaryContactName = request.PrimaryContactName,
                PrimaryContactEmail = request.PrimaryContactEmail,
                PrimaryContactPhone = request.PrimaryContactPhone,
                CreatedAt = now,
                UpdatedAt = now
            };

            var settings = new TenantSettings
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                BrandName = request.BrandName,
                LogoUrl = request.LogoUrl,
                Timezone = request.Timezone,
                CurrencyCode = request.CurrencyCode,
                CreatedAt = now,
                UpdatedAt = now
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

            return Ok(new
            {
                id = tenant.Id,
                slug = tenant.Slug,
                name = tenant.Name,
                status = tenant.Status
            });
        }

        // Public endpoint — frontend calls this to load branding before showing the login page
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
                    BrandName     = t.Settings != null ? t.Settings.BrandName     : t.Name,
                    LogoUrl       = t.Settings != null ? t.Settings.LogoUrl       : null,
                    PrimaryColor  = t.Settings != null ? t.Settings.PrimaryColor  : null,
                    CurrencyCode  = t.Settings != null ? t.Settings.CurrencyCode  : "INR"
                })
                .FirstOrDefault();

            if (tenant == null) return NotFound(new { error = "Tenant not found." });
            if (tenant.Status != "ACTIVE") return BadRequest(new { error = "Tenant is not active." });

            return Ok(tenant);
        }
    }
}
