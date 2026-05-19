using System.ComponentModel.DataAnnotations;

namespace ClassNovaApi.Models
{
    public class UpdateBrandingRequest
    {
        [MaxLength(100)]
        public string? BrandName { get; set; }

        public string? LogoUrl { get; set; }

        [MaxLength(7)]
        public string? PrimaryColor { get; set; }

        [MaxLength(7)]
        public string? AccentColor { get; set; }

        public LandingPageContent? LandingPage { get; set; }
    }

    public class TeacherPreviewDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? Qualification { get; set; }
        public string? PhotoUrl { get; set; }
    }
}
