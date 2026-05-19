import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { AuthService } from '../../services/auth.service';
import { BrandingService } from '../../services/branding.service';
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
  private readonly sanitizer       = inject(DomSanitizer);
  private readonly destroy$        = new Subject<void>();

  readonly branding          = signal<TenantBranding | null>(null);
  readonly teachers          = signal<TeacherPreview[]>([]);
  readonly notFound          = signal(false);
  readonly isLoading         = this.brandingService.isLoading;
  readonly isSignedInHere    = signal(false);

  readonly carouselResponsiveOptions = [
    { breakpoint: '1024px', numVisible: 3, numScroll: 1 },
    { breakpoint: '768px',  numVisible: 2, numScroll: 1 },
    { breakpoint: '480px',  numVisible: 1, numScroll: 1 },
  ];

  private slug = '';

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.slug = params.get('slug') ?? '';
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
  }

  private loadTeachers(): void {
    this.brandingService.loadTeachersPreview(this.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe(teacherList => this.teachers.set(teacherList));
  }

  navigateToLogin(): void {
    this.router.navigate([`/t/${this.slug}/login`]);
  }

  navigateToRegister(): void {
    this.router.navigate([`/t/${this.slug}/register`]);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  safeMapUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  onImageError(event: Event): void {
    (event.target as HTMLElement).closest('.gallery-item')?.classList.add('hidden');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
