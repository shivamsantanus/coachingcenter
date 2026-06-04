using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ClassNovaApi.Data;
using ClassNovaApi.Extensions;
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
        private readonly PasswordResetService _passwordResetService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            AppDbContext context,
            IConfiguration config,
            OtpService otpService,
            PasswordResetService passwordResetService,
            ILogger<AuthController> logger)
        {
            _context              = context;
            _config               = config;
            _otpService           = otpService;
            _passwordResetService = passwordResetService;
            _logger               = logger;
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

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Code == request.RoleCode);
            if (role == null)
                return BadRequest(new ApiResponse<object>(null, "Invalid role code."));

            // Block if a verified account already exists for this email
            var verifiedExists = await _context.Users
                .AnyAsync(u => u.Email == request.Email && u.IsEmailVerified);
            if (verifiedExists)
                return BadRequest(new ApiResponse<object>(null, "Email is already registered."));

            // Clean up any leftover unverified user from old flow (safety net)
            var staleUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsEmailVerified);
            if (staleUser != null)
            {
                var staleRole = await _context.TenantUserRoles
                    .FirstOrDefaultAsync(r => r.UserId == staleUser.Id);
                if (staleRole != null) _context.TenantUserRoles.Remove(staleRole);
                _context.Users.Remove(staleUser);
            }

            // Replace any previous unverified pending attempt for this email
            var existingPending = await _context.PendingRegistrations
                .FirstOrDefaultAsync(pr => pr.Email == request.Email);
            if (existingPending != null)
                _context.PendingRegistrations.Remove(existingPending);

            var now = DateTime.UtcNow;
            var pending = new PendingRegistration
            {
                Id           = Guid.NewGuid(),
                FullName     = request.FullName,
                Email        = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                TenantId     = tenant.Id,
                RoleId       = role.Id,
                SendCount    = 1,
                LastSentAt   = now,
                CreatedAt    = now
            };

            _context.PendingRegistrations.Add(pending);
            await _context.SaveChangesAsync();

            await _otpService.IssueOtpAsync(pending);

            _logger.LogInformation("Pending registration created. Email: {Email}, Tenant: {Slug}",
                request.Email, tenant.Slug);

            return Ok(new ApiResponse<object>(new
            {
                message = "Registration started. Please check your email for a verification code."
            }));
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

            // With pending-registration flow, users in the table are always verified.
            // This guard handles any edge-case legacy unverified records.
            if (!user.IsEmailVerified)
                return StatusCode(403, new ApiResponse<object>(null,
                    "Please verify your email before signing in."));

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

            _logger.LogInformation("User logged in. Email: {Email}, Tenant: {Slug}",
                user.Email, tenant.Slug);

            return Ok(new ApiResponse<AuthResponseDto>(new AuthResponseDto
            {
                Token        = token,
                Role         = tenantUserRole.Role.Code,
                TenantSlug   = tenant.Slug,
                TenantName   = tenant.Name,
                FullName     = user.FullName,
                IsFirstLogin = user.IsFirstLogin
            }));
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userId = User.GetUserId();
            var user   = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound(new ApiResponse<object>(null, "User not found."));

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
                return BadRequest(new ApiResponse<object>(null, "Current password is incorrect."));

            if (request.NewPassword.Length < 8)
                return BadRequest(new ApiResponse<object>(null, "New password must be at least 8 characters."));

            if (request.NewPassword == request.CurrentPassword)
                return BadRequest(new ApiResponse<object>(null, "New password must be different from the current password."));

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.IsFirstLogin = false;
            user.UpdatedAt    = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed for user {UserId}", userId);
            return Ok(new ApiResponse<object>(new { message = "Password changed successfully." }));
        }

        [AllowAnonymous]
        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            var (success, error) = await _otpService.VerifyAndPromoteAsync(
                request.Email, request.TenantSlug, request.Otp);

            if (!success)
                return BadRequest(new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new
            {
                message = "Email verified successfully. You can now sign in."
            }));
        }

        [AllowAnonymous]
        [HttpPost("resend-otp")]
        public async Task<IActionResult> ResendOtp([FromBody] ResendOtpRequest request)
        {
            var (success, error) = await _otpService.ResendOtpAsync(request.Email, request.TenantSlug);

            if (!success)
                return StatusCode(429, new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new
            {
                message = "If your email is pending verification, a new code has been sent."
            }));
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var (success, error) = await _passwordResetService.IssueResetOtpAsync(
                request.Email, request.TenantSlug);

            if (!success)
                return BadRequest(new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new
            {
                message = "A reset code has been sent to your email."
            }));
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var (success, error) = await _passwordResetService.VerifyAndResetAsync(
                request.Email, request.TenantSlug, request.Otp, request.NewPassword);

            if (!success)
                return BadRequest(new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new
            {
                message = "Password reset successfully. You can now sign in."
            }));
        }

        [AllowAnonymous]
        [HttpPost("resend-reset-otp")]
        public async Task<IActionResult> ResendResetOtp([FromBody] ForgotPasswordRequest request)
        {
            var (success, error) = await _passwordResetService.ResendResetOtpAsync(
                request.Email, request.TenantSlug);

            if (!success)
                return StatusCode(429, new ApiResponse<object>(null, error));

            return Ok(new ApiResponse<object>(new
            {
                message = "If an account with that email exists, a new code has been sent."
            }));
        }

        [AllowAnonymous]
        [HttpPost("platform-login")]
        public async Task<IActionResult> PlatformLogin([FromBody] PlatformLoginRequest request)
        {
            const string invalidCredentials = "Invalid email or password.";

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsEmailVerified);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized(new ApiResponse<object>(null, invalidCredentials));

            if (!user.IsActive)
                return Unauthorized(new ApiResponse<object>(null, "Account is inactive."));

            var platformRole = await _context.TenantUserRoles
                .Include(tur => tur.Role)
                .FirstOrDefaultAsync(tur =>
                    tur.UserId     == user.Id          &&
                    tur.Role.Code  == "PLATFORM_ADMIN" &&
                    tur.Status     == "ACTIVE");

            if (platformRole == null)
                return Unauthorized(new ApiResponse<object>(null, "Access denied."));

            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = GeneratePlatformToken(user);

            _logger.LogInformation("Platform admin logged in. Email: {Email}", user.Email);

            return Ok(new ApiResponse<AuthResponseDto>(new AuthResponseDto
            {
                Token      = token,
                Role       = "PLATFORM_ADMIN",
                TenantSlug = "classnova",
                TenantName = "ClassNova Platform",
                FullName   = user.FullName
            }));
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

        private string GeneratePlatformToken(User user)
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
                    new Claim("tenant_id",               Guid.Empty.ToString()),
                    new Claim("tenant_slug",             "classnova"),
                    new Claim("role",                    "PLATFORM_ADMIN")
                ]),
                Expires = DateTime.UtcNow.AddHours(8),
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var handler = new JwtSecurityTokenHandler();
            return handler.WriteToken(handler.CreateToken(tokenDescriptor));
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
