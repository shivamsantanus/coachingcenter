using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace ClassNovaApi.Models
{
    public class LandingPageContent
    {
        public HeroSection? Hero { get; set; }
        public AboutSection? About { get; set; }
        public OfferingsSection? Offerings { get; set; }
        public TeachersSectionConfig? TeachersSection { get; set; }
        public GallerySection? Gallery { get; set; }
        public ContactSection? Contact { get; set; }
        public SocialLinks? Social { get; set; }
    }

    public class HeroSection
    {
        [MaxLength(80)]
        public string? Headline { get; set; }

        [MaxLength(120)]
        public string? Tagline { get; set; }

        public string? BannerImageUrl { get; set; }

        [MaxLength(40)]
        public string? CtaText { get; set; }
    }

    public class AboutSection
    {
        public bool IsVisible { get; set; } = true;

        [MaxLength(500)]
        public string? Description { get; set; }

        [Range(1900, 2100)]
        public int? FoundedYear { get; set; }

        [Range(0, 1_000_000)]
        public int? StudentCount { get; set; }
    }

    public class OfferingsSection
    {
        public bool IsVisible { get; set; } = true;
        public List<OfferingItem> Items { get; set; } = [];
    }

    public class OfferingItem
    {
        [Required, MaxLength(60)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? Note { get; set; }
    }

    public class TeachersSectionConfig
    {
        public bool IsVisible { get; set; } = true;
    }

    public class GallerySection
    {
        public bool IsVisible { get; set; } = true;
        public List<string> ImageUrls { get; set; } = [];
    }

    public class ContactSection
    {
        public bool IsVisible { get; set; } = true;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [MaxLength(100), EmailAddress]
        public string? Email { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        public string? MapsEmbedUrl { get; set; }
    }

    public class SocialLinks
    {
        [MaxLength(20)]
        public string? Whatsapp { get; set; }

        [MaxLength(200)]
        public string? Instagram { get; set; }

        [MaxLength(200)]
        public string? Youtube { get; set; }

        [MaxLength(200)]
        public string? Facebook { get; set; }
    }
}
