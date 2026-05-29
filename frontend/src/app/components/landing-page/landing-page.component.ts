import { Component, OnInit, OnDestroy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, switchMap, takeUntil, fromEvent } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';
import { TenantContextService } from '../../services/tenant-context.service';
import { TenantBranding, TeacherPreview } from '../../models/branding.models';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, CarouselModule],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, OnDestroy {
  private readonly route           = inject(ActivatedRoute);
  private readonly router          = inject(Router);
  private readonly authService     = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly tenantContext   = inject(TenantContextService);
  private readonly sanitizer       = inject(DomSanitizer);
  private readonly platformId      = inject(PLATFORM_ID);
  private readonly destroy$        = new Subject<void>();

  readonly branding          = signal<TenantBranding | null>(null);
  readonly teachers          = signal<TeacherPreview[]>([]);
  readonly notFound          = signal(false);
  readonly isLoading         = this.brandingService.isLoading;
  readonly isSignedInHere    = signal(false);
  readonly navScrolled       = signal(false);

  readonly carouselResponsiveOptions = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '480px',  numVisible: 1, numScroll: 1 },
  ];

  private slug = '';
  private revealObserver: IntersectionObserver | null = null;
  private revealFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Set the correct nav button immediately from the route snapshot so the
    // first render shows the right button without waiting for paramMap to emit.
    const initialSlug = this.route.snapshot.paramMap.get('slug') ?? this.tenantContext.slug();
    this.isSignedInHere.set(
      this.authService.isLoggedIn() && this.authService.getTenantSlug() === initialSlug
    );

    // effect() runs after Angular re-renders due to the branding signal change,
    // guaranteeing .reveal elements exist in the DOM before we observe them.
    effect(() => {
      const currentBranding = this.branding();
      if (currentBranding && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.setupRevealObserver(), 0);
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('slug') ?? this.tenantContext.slug();
        this.tenantContext.setSlugFromRoute(this.slug);
        this.isSignedInHere.set(
          this.authService.isLoggedIn() &&
          this.authService.getTenantSlug() === this.slug
        );
        return this.brandingService.loadBranding(this.slug);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: brandingData => {
        if (!brandingData) {
          this.notFound.set(true);
          return;
        }
        this.branding.set(brandingData);
        if (brandingData.landingPage?.teachersSection?.isVisible) {
          this.loadTeachers();
        }
      },
      error: () => this.notFound.set(true)
    });

    if (isPlatformBrowser(this.platformId)) {
      fromEvent(window, 'scroll', { passive: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.navScrolled.set(window.scrollY > 60));
    }
  }

  private setupRevealObserver(): void {
    this.revealObserver?.disconnect();

    this.revealObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible', 'has-revealed');
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => {
      this.revealObserver!.observe(el);
    });
  }

  private loadTeachers(): void {
    this.brandingService.loadTeachersPreview(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe(teacherList => this.teachers.set(teacherList));
  }

  navigateToLogin(): void {
    this.router.navigate([this.tenantContext.authPath('login')]);
  }

  navigateToRegister(): void {
    this.router.navigate([this.tenantContext.authPath('register')]);
  }

  navigateToDashboard(): void {
    this.router.navigate([this.tenantContext.authPath('dashboard')]);
  }

  safeMapUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onImageError(event: Event): void {
    (event.target as HTMLElement).closest('.gallery-item')?.classList.add('hidden');
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    if (this.revealFallbackTimer !== null) clearTimeout(this.revealFallbackTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
