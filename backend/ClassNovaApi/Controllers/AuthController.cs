using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using ClassNovaApi.Services;
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
        private readonly OtpService _otpService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDbContext context,
            IConfiguration config,
            OtpService otpService,
            ILogger<AuthController> logger)
        {
            _context    = context;
            _config     = config;
            _otpService = otpService;
            _logger     = logger;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest request)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == request.TenantSlug.ToLower());

            if (tenant == null)
                return BadRequest(new ApiResponse<object>(null, "Tenant not found."));

            if (tenant.Status != "ACTIVE")
                return BadRequest(new ApiResponse<object>(null, "Tenant is not active."));

            var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (emailExists)
                return BadRequest(new ApiResponse<object>(null, "Email is already registered."));

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Code == request.RoleCode);
            if (role == null)
                return BadRequest(new ApiResponse<object>(null, "Invalid role code."));

            var now    = DateTime.UtcNow;
            var userId = Guid.NewGuid();

            var user = new User
            {
                Id              = userId,
                FullName        = request.FullName,
                Email           = request.Email,
                PasswordHash    = BCrypt.Net.BCrypt.HashPassword(request.Password),
                IsActive        = true,
                IsEmailVerified = false,
                CreatedAt       = now,
                UpdatedAt       = now
            };

            var tenantUserRole = new TenantUserRole
            {
                Id       = Guid.NewGuid(),
                TenantId = tenant.Id,
                UserId   = userId,
                RoleId   = role.Id,
                Status   = "ACTIVE"
            };

            _context.Users.Add(user);
            _context.TenantUserRoles.Add(tenantUserRole);
            await _context.SaveChangesAsync();

            await _otpService.IssueOtpAsync(user);

            _logger.LogInformation("New user registered. Email: {Email}, Tenant: {Slug}, Role: {Role}",
                request.Email, tenant.Slug, role.Code);

            return Ok(new ApiResponse<object>(new { message = "Registration successful. Please check your email for a verification code." }));
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == request.TenantSlug.ToLower());

            if (tenant == null)
                return Unauthorized(new ApiResponse<object>(null, "Tenant not found."));

            if (tenant.Status != "ACTIVE")
                return Unauthorized(new ApiResponse<object>(null, "Tenant is not active."));

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            const string invalidCredentials = "Invalid email or password.";

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new ApiResponse<object>(null, invalidCredentials));

            if (!user.IsActive)
                return Unauthorized(new ApiResponse<object>(null, "Account is inactive."));

            // Block login until email is verified
            if (!user.IsEmailVerified)
                return StatusCode(403, new ApiResponse<object>(null, "Please verify your email before signing in."));

            var tenantUserRole = await _context.TenantUserRoles
                .Include(tur => tur.Role)
                .FirstOrDefaultAsync(tur =>
                    tur.TenantId == tenant.Id &&
                    tur.UserId   == user.Id   &&
                    tur.Status   == "ACTIVE");

            if (tenantUserRole == null)
                return Unauthorized(new ApiResponse<object>(null, invalidCredentials));

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GenerateToken(user, tenant, tenantUserRole.Role.Code);

            _logger.LogInformation("User logged in. Email: {Email}, Tenant: {Slug}, Role: {Role}",
                user.Email, tenant.Slug, tenantUserRole.Role.Code);

            return Ok(new ApiResponse<object>(new
            {
                token,
                role       = tenantUserRole.Role.Code,
                tenantSlug = tenant.Slug,
                tenantName = tenant.Name,
                fullName   = user.FullName
            }));
        }

        [AllowAnonymous]
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            var user = await ResolveUserForTenant(request.Email, request.TenantSlug);

            // Return the same response whether email exists or not — avoids user enumeration
            if (user == null)
                return BadRequest(new ApiResponse<object>(null, "Invalid or expired verification code."));

            if (user.IsEmailVerified)
                return Ok(new ApiResponse<object>(new { message = "Email is already verified. You can sign in." }));

            var (success, error, _) = await _otpService.VerifyOtpAsync(user.Id, request.Otp);

            if (!success)
                return BadRequest(new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new { message = "Email verified successfully. You can now sign in." }));
        }

        [AllowAnonymous]
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
        {
            var user = await ResolveUserForTenant(request.Email, request.TenantSlug);

            // Always return success shape — never confirm whether email is registered
            if (user == null || user.IsEmailVerified)
                return Ok(new ApiResponse<object>(new { message = "If your email is registered and unverified, a new code has been sent." }));

            var (success, error) = await _otpService.ResendOtpAsync(user);

            if (!success)
                return StatusCode(429, new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new { message = "A new verification code has been sent to your email." }));
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            return Ok(new ApiResponse<object>(new
            {
                userId     = User.FindFirstValue("nameid"),
                fullName   = User.FindFirstValue("unique_name"),
                email      = User.FindFirstValue("email"),
                tenantId   = User.FindFirstValue("tenant_id"),
                tenantSlug = User.FindFirstValue("tenant_slug"),
                role       = User.FindFirstValue("role")
            }));
        }

        private async Task<User?> ResolveUserForTenant(string email, string tenantSlug)
        {
            var tenant = await _context.Tenants
                .FirstOrDefaultAsync(t => t.Slug == tenantSlug.ToLower() && t.Status == "ACTIVE");
            if (tenant == null) return null;

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null) return null;

            var linked = await _context.TenantUserRoles
                .AnyAsync(tur => tur.TenantId == tenant.Id && tur.UserId == user.Id);

            return linked ? user : null;
        }

        private string GenerateToken(User user, Tenant tenant, string roleCode)
        {
            var jwtKey = _config["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT key is not configured.");

            var key = Encoding.ASCII.GetBytes(jwtKey);
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
