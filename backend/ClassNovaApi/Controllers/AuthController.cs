using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ClassNovaApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public IActionResult Register([FromBody] AuthRequest request)
        {
            var tenant = _context.Tenants.FirstOrDefault(t => t.Slug == request.TenantSlug.ToLower());
            if (tenant == null) return BadRequest(new { error = "Tenant not found." });
            if (tenant.Status != "ACTIVE") return BadRequest(new { error = "Tenant is not active." });

            if (_context.Users.Any(u => u.Email == request.Email))
                return BadRequest(new { error = "Email is already registered." });

            var role = _context.Roles.FirstOrDefault(r => r.Code == request.RoleCode);
            if (role == null) return BadRequest(new { error = "Invalid role code." });

            var now = DateTime.UtcNow;
            var userId = Guid.NewGuid();

            var user = new User
            {
                Id = userId,
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            };

            var tenantUserRole = new TenantUserRole
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                UserId = userId,
                RoleId = role.Id,
                Status = "ACTIVE"
            };

            _context.Users.Add(user);
            _context.TenantUserRoles.Add(tenantUserRole);
            _context.SaveChanges();

            return Ok(new { message = "User registered successfully." });
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            var tenant = _context.Tenants.FirstOrDefault(t => t.Slug == request.TenantSlug.ToLower());
            if (tenant == null) return Unauthorized(new { error = "Tenant not found." });
            if (tenant.Status != "ACTIVE") return Unauthorized(new { error = "Tenant is not active." });

            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new { error = "Invalid email or password." });

            if (!user.IsActive)
                return Unauthorized(new { error = "Account is inactive." });

            var tenantUserRole = _context.TenantUserRoles
                .Include(tur => tur.Role)
                .FirstOrDefault(tur =>
                    tur.TenantId == tenant.Id &&
                    tur.UserId == user.Id &&
                    tur.Status == "ACTIVE");

            if (tenantUserRole == null)
                return Unauthorized(new { error = "User does not have access to this tenant." });

            user.LastLoginAt = DateTime.UtcNow;
            _context.SaveChanges();

            var token = GenerateToken(user, tenant, tenantUserRole.Role.Code);

            return Ok(new
            {
                token,
                role = tenantUserRole.Role.Code,
                tenantSlug = tenant.Slug,
                tenantName = tenant.Name,
                fullName = user.FullName
            });
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            return Ok(new
            {
                userId     = User.FindFirstValue(ClaimTypes.NameIdentifier),
                fullName   = User.FindFirstValue(ClaimTypes.Name),
                email      = User.FindFirstValue(ClaimTypes.Email),
                tenantId   = User.FindFirstValue("tenant_id"),
                tenantSlug = User.FindFirstValue("tenant_slug"),
                role       = User.FindFirstValue("role")
            });
        }

        private string GenerateToken(User user, Tenant tenant, string roleCode)
        {
            var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"]!);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                    new Claim(ClaimTypes.Name,           user.FullName),
                    new Claim(ClaimTypes.Email,          user.Email ?? string.Empty),
                    new Claim("tenant_id",               tenant.Id.ToString()),
                    new Claim("tenant_slug",             tenant.Slug),
                    new Claim("role",                    roleCode)
                ]),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var handler = new JwtSecurityTokenHandler();
            return handler.WriteToken(handler.CreateToken(tokenDescriptor));
        }
    }
}
