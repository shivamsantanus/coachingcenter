using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
using ClassNovaApi.Models;

namespace ClassNovaApi.Controllers
{
    public class UpdateNavPermissionRequest
    {
        [Required] public string RoleCode   { get; set; } = string.Empty;
        [Required] public string NavItemKey { get; set; } = string.Empty;
        [Required] public bool   IsEnabled  { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NavigationController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Default nav keys per role — used when no DB entries exist yet for a tenant
        private static readonly Dictionary<string, HashSet<string>> DefaultPermissions = new()
        {
            ["TEACHER"] = ["dashboard", "academic", "attendance", "teacher-profile", "my-attendance"],
            ["STUDENT"]  = ["dashboard", "attendance"]
        };

        // Items that are personal to the TEACHER role — never shown to ORG_ADMIN or PLATFORM_ADMIN
        private static readonly HashSet<string> TeacherPersonalKeys = ["my-attendance", "teacher-profile"];

        public NavigationController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/navigation/my-nav
        // Returns nav items visible to the current user's role.
        [HttpGet("my-nav")]
        public IActionResult GetMyNav()
        {
            var role     = User.GetRole();
            var tenantId = User.GetTenantId();

            var allItems = _context.NavigationItems
                .OrderBy(n => n.SortOrder)
                .ToList();

            List<NavigationItem> visibleItems;

            if (role == "ORG_ADMIN" || role == "PLATFORM_ADMIN")
            {
                visibleItems = allItems
                    .Where(item => !TeacherPersonalKeys.Contains(item.Key))
                    .ToList();
            }
            else
            {
                var dbPermissions = _context.RoleNavPermissions
                    .Where(p => p.TenantId == tenantId && p.RoleCode == role)
                    .ToList();

                HashSet<string> enabledKeys;

                if (dbPermissions.Count == 0)
                {
                    // No DB entries yet — use hard-coded defaults
                    enabledKeys = DefaultPermissions.TryGetValue(role, out var defaults)
                        ? defaults
                        : ["dashboard"];
                }
                else
                {
                    enabledKeys = dbPermissions
                        .Where(p => p.IsEnabled)
                        .Select(p => p.NavItemKey)
                        .ToHashSet();
                }

                visibleItems = allItems
                    .Where(item => !item.IsAdminOnly && (item.IsLocked || enabledKeys.Contains(item.Key)))
                    .ToList();
            }

            var result = visibleItems.Select(item => new
            {
                item.Key,
                item.Label,
                item.Icon,
                item.RoutePath,
                item.SortOrder,
                item.IsLocked
            });

            return Ok(new { success = true, data = result, error = (string?)null });
        }

        // GET /api/navigation/permissions — ORG_ADMIN only
        // Returns the full permission matrix for the settings UI.
        [HttpGet("permissions")]
        public IActionResult GetPermissions()
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var tenantId = User.GetTenantId();

            // Only non-admin-only items appear in the matrix
            var matrixItems = _context.NavigationItems
                .Where(n => !n.IsAdminOnly)
                .OrderBy(n => n.SortOrder)
                .ToList();

            var dbPermissions = _context.RoleNavPermissions
                .Where(p => p.TenantId == tenantId && (p.RoleCode == "TEACHER" || p.RoleCode == "STUDENT"))
                .ToList();

            var managedRoles = new[] { "TEACHER", "STUDENT" };

            var matrix = matrixItems.Select(item => new
            {
                item.Key,
                item.Label,
                item.IsLocked,
                Permissions = managedRoles.Select(roleCode =>
                {
                    var dbEntry = dbPermissions
                        .FirstOrDefault(p => p.RoleCode == roleCode && p.NavItemKey == item.Key);

                    bool isEnabled;
                    if (dbEntry != null)
                        isEnabled = dbEntry.IsEnabled;
                    else
                        isEnabled = DefaultPermissions.TryGetValue(roleCode, out var defaults)
                            && defaults.Contains(item.Key);

                    return new { RoleCode = roleCode, IsEnabled = isEnabled };
                }).ToList()
            }).ToList();

            return Ok(new { success = true, data = matrix, error = (string?)null });
        }

        // PUT /api/navigation/permissions — ORG_ADMIN only
        // Upserts a single permission toggle.
        [HttpPut("permissions")]
        public IActionResult UpdatePermission([FromBody] UpdateNavPermissionRequest request)
        {
            if (User.GetRole() != "ORG_ADMIN")
                return Forbid();

            var allowedRoles = new[] { "TEACHER", "STUDENT" };
            if (!allowedRoles.Contains(request.RoleCode))
                return BadRequest(new { success = false, data = (object?)null, error = "Only TEACHER and STUDENT permissions can be managed." });

            var tenantId = User.GetTenantId();

            var navItem = _context.NavigationItems.Find(request.NavItemKey);
            if (navItem == null)
                return BadRequest(new { success = false, data = (object?)null, error = "Navigation item not found." });

            if (navItem.IsAdminOnly)
                return BadRequest(new { success = false, data = (object?)null, error = "Admin-only items cannot be assigned to other roles." });

            if (navItem.IsLocked)
                return BadRequest(new { success = false, data = (object?)null, error = "Locked items cannot be toggled." });

            var existing = _context.RoleNavPermissions
                .FirstOrDefault(p => p.TenantId  == tenantId
                                  && p.RoleCode   == request.RoleCode
                                  && p.NavItemKey == request.NavItemKey);

            if (existing != null)
            {
                existing.IsEnabled = request.IsEnabled;
            }
            else
            {
                _context.RoleNavPermissions.Add(new RoleNavPermission
                {
                    Id         = Guid.NewGuid(),
                    TenantId   = tenantId,
                    RoleCode   = request.RoleCode,
                    NavItemKey = request.NavItemKey,
                    IsEnabled  = request.IsEnabled
                });
            }

            _context.SaveChanges();

            return Ok(new { success = true, data = new { request.RoleCode, request.NavItemKey, request.IsEnabled }, error = (string?)null });
        }
    }
}
