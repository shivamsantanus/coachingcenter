export interface TenantBranding {
  name: string;
  slug: string;
  status: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  landingPage: LandingPageContent | null;
}

export interface LandingPageContent {
  hero: HeroSection | null;
  about: AboutSection | null;
  offerings: OfferingsSection | null;
  teachersSection: TeachersSectionConfig | null;
  achievements: AchievementsSection | null;
  gallery: GallerySection | null;
  contact: ContactSection | null;
  social: SocialLinks | null;
}

export interface HeroSection {
  headline: string | null;
  tagline: string | null;
  bannerImageUrl: string | null;
  ctaText: string | null;
}

export interface AboutSection {
  isVisible: boolean;
  description: string | null;
  foundedYear: number | null;
  studentCount: number | null;
}

export interface OfferingsSection {
  isVisible: boolean;
  items: OfferingItem[];
}

export interface OfferingItem {
  title: string;
  note: string | null;
}

export interface TeachersSectionConfig {
  isVisible: boolean;
}

export interface AchievementsSection {
  isVisible: boolean;
  items: AchievementItem[];
}

export interface AchievementItem {
  studentName: string;
  exam: string;
  score: string;
  photoUrl: string | null;
  year: number | null;
}

export interface GallerySection {
  isVisible: boolean;
  imageUrls: string[];
}

export interface ContactSection {
  isVisible: boolean;
  phone: string | null;
  email: string | null;
  address: string | null;
  mapsEmbedUrl: string | null;
}

export interface SocialLinks {
  whatsapp: string | null;
  instagram: string | null;
  youtube: string | null;
  facebook: string | null;
}

export interface TeacherPreview {
  fullName: string;
  qualification: string | null;
  photoUrl: string | null;
}

export interface UpdateBrandingRequest {
  brandName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  landingPage?: LandingPageContent | null;
}
