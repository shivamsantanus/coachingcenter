using System.Text.Json;
using System.Text.RegularExpressions;
using ClassNovaApi.Data;
using ClassNovaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClassNovaApi.Services
{
    public class BrandingService
    {
        private static readonly Regex HexColorRegex = new(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);
        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        private readonly AppDbContext _context;
        private readonly ILogger<BrandingService> _logger;

        public BrandingService(AppDbContext context, ILogger<BrandingService> logger)
        {
            _context = context;
            _logger  = logger;
        }

        public async Task<(bool Success, string? Error)> UpdateBrandingAsync(
            Guid tenantId, UpdateBrandingRequest request)
        {
            var validationError = ValidateRequest(request);
            if (validationError != null)
                return (false, validationError);

            var settings = await _context.TenantSettings
                .FirstOrDefaultAsync(ts => ts.TenantId == tenantId);

            if (settings == null)
                return (false, "Tenant settings not found.");

            ApplyBrandingChanges(settings, request);

            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Branding updated for tenant {TenantId}", tenantId);
            return (true, null);
        }

        public LandingPageContent? DeserializeLandingPage(string? json)
        {
            if (string.IsNullOrEmpty(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<LandingPageContent>(json, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to deserialise landing_page_json");
                return null;
            }
        }

        private void ApplyBrandingChanges(TenantSettings settings, UpdateBrandingRequest request)
        {
            if (request.BrandName != null)
                settings.BrandName = request.BrandName;

            if (request.LogoUrl != null)
                settings.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl;

            if (request.PrimaryColor != null)
                settings.PrimaryColor = string.IsNullOrWhiteSpace(request.PrimaryColor) ? null : request.PrimaryColor;

            if (request.AccentColor != null)
                settings.AccentColor = string.IsNullOrWhiteSpace(request.AccentColor) ? null : request.AccentColor;

            if (request.LandingPage != null)
                settings.LandingPageJson = JsonSerializer.Serialize(request.LandingPage, JsonOptions);
        }

        private static string? ValidateRequest(UpdateBrandingRequest request)
        {
            if (request.PrimaryColor != null
                && !string.IsNullOrWhiteSpace(request.PrimaryColor)
                && !HexColorRegex.IsMatch(request.PrimaryColor))
                return "Primary colour must be a valid 6-digit hex code (e.g. #1A73E8).";

            if (request.AccentColor != null
                && !string.IsNullOrWhiteSpace(request.AccentColor)
                && !HexColorRegex.IsMatch(request.AccentColor))
                return "Accent colour must be a valid 6-digit hex code (e.g. #FF6B35).";

            if (request.LandingPage?.Offerings?.Items?.Count > 6)
                return "Offerings list cannot exceed 6 items.";

            if (request.LandingPage?.Gallery?.ImageUrls?.Count > 8)
                return "Gallery cannot exceed 8 images.";

            if (request.LandingPage?.Achievements?.Items?.Count > 12)
                return "Achievements list cannot exceed 12 items.";

            return null;
        }
    }
}
