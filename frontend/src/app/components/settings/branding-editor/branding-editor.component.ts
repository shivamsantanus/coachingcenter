import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TabsModule } from 'primeng/tabs';
import { AuthService } from '../../../services/auth.service';
import { BrandingService } from '../../../services/branding.service';
import { TenantBranding, UpdateBrandingRequest } from '../../../models/branding.models';

@Component({
  selector: 'app-branding-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule, ToggleSwitchModule, TabsModule
  ],
  templateUrl: './branding-editor.component.html',
  styleUrls: ['./branding-editor.component.scss']
})
export class BrandingEditorComponent implements OnInit, OnDestroy {
  private readonly fb              = inject(FormBuilder);
  private readonly authService     = inject(AuthService);
  private readonly brandingService = inject(BrandingService);
  private readonly router          = inject(Router);
  private readonly destroy$        = new Subject<void>();

  readonly isSaving    = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError   = signal<string | null>(null);

  readonly brandingForm: FormGroup = this.buildForm();

  get offeringsItems(): FormArray    { return this.brandingForm.get('offerings.items') as FormArray; }
  get galleryUrls(): FormArray       { return this.brandingForm.get('gallery.imageUrls') as FormArray; }
  get achievementItems(): FormArray  { return this.brandingForm.get('achievements.items') as FormArray; }

  ngOnInit(): void {
    const role = this.authService.getRole();
    if (role !== 'ORG_ADMIN') {
      const slug = this.authService.getTenantSlug();
      this.router.navigate(slug ? [`/t/${slug}/dashboard`] : ['/login']);
      return;
    }
    this.loadExistingBranding();
  }

  private loadExistingBranding(): void {
    const slug = this.authService.getTenantSlug();
    if (!slug) return;

    this.brandingService.loadBranding(slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe(brandingData => {
        if (brandingData) this.patchForm(brandingData);
      });
  }

  private patchForm(branding: TenantBranding): void {
    this.brandingForm.patchValue({
      brandName:    branding.brandName,
      logoUrl:      branding.logoUrl      ?? '',
      primaryColor: branding.primaryColor ?? '',
      accentColor:  branding.accentColor  ?? '',
      hero:             branding.landingPage?.hero             ?? {},
      about:            branding.landingPage?.about            ?? {},
      teachersSection:  branding.landingPage?.teachersSection  ?? { isVisible: true },
      contact:          branding.landingPage?.contact          ?? {},
      social:           branding.landingPage?.social           ?? {},
      offerings: { isVisible: branding.landingPage?.offerings?.isVisible ?? true },
      gallery:    { isVisible: branding.landingPage?.gallery?.isVisible  ?? true },
    });

    this.offeringsItems.clear();
    (branding.landingPage?.offerings?.items ?? []).forEach(item =>
      this.offeringsItems.push(this.buildOfferingGroup(item.title, item.note ?? ''))
    );

    this.galleryUrls.clear();
    (branding.landingPage?.gallery?.imageUrls ?? []).forEach(url =>
      this.galleryUrls.push(this.fb.control(url))
    );

    this.brandingForm.patchValue({
      achievements: { isVisible: branding.landingPage?.achievements?.isVisible ?? true },
    });
    this.achievementItems.clear();
    (branding.landingPage?.achievements?.items ?? []).forEach(item =>
      this.achievementItems.push(this.buildAchievementGroup(item))
    );
  }

  addAchievement(): void {
    if (this.achievementItems.length >= 12) return;
    this.achievementItems.push(this.buildAchievementGroup());
  }

  removeAchievement(index: number): void {
    this.achievementItems.removeAt(index);
  }

  addOffering(): void {
    if (this.offeringsItems.length >= 6) return;
    this.offeringsItems.push(this.buildOfferingGroup('', ''));
  }

  removeOffering(index: number): void {
    this.offeringsItems.removeAt(index);
  }

  addGalleryUrl(): void {
    if (this.galleryUrls.length >= 8) return;
    this.galleryUrls.push(this.fb.control(''));
  }

  removeGalleryUrl(index: number): void {
    this.galleryUrls.removeAt(index);
  }

  openPreview(): void {
    const slug = this.authService.getTenantSlug();
    if (slug) window.open(`/t/${slug}`, '_blank');
  }

  onSubmit(): void {
    if (this.brandingForm.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    this.saveSuccess.set(false);
    this.saveError.set(null);

    const request = this.buildRequest();
    this.brandingService.saveBranding(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saveSuccess.set(true);
          this.brandingService.loadBranding(this.authService.getTenantSlug()!).subscribe();
          setTimeout(() => this.saveSuccess.set(false), 3000);
        },
        error: (err: Error) => {
          this.isSaving.set(false);
          this.saveError.set(err.message);
        }
      });
  }

  private buildRequest(): UpdateBrandingRequest {
    const v = this.brandingForm.getRawValue();
    return {
      brandName:    v.brandName    || null,
      logoUrl:      v.logoUrl      || null,
      primaryColor: v.primaryColor || null,
      accentColor:  v.accentColor  || null,
      landingPage: {
        hero:            { headline: v.hero.headline || null, tagline: v.hero.tagline || null,
                           bannerImageUrl: v.hero.bannerImageUrl || null, ctaText: v.hero.ctaText || null },
        about:           { isVisible: v.about.isVisible, description: v.about.description || null,
                           foundedYear: v.about.foundedYear || null, studentCount: v.about.studentCount || null },
        offerings:       { isVisible: v.offerings.isVisible, items: v.offerings.items },
        teachersSection: { isVisible: v.teachersSection.isVisible },
        achievements:    { isVisible: v.achievements.isVisible, items: v.achievements.items },
        gallery:         { isVisible: v.gallery.isVisible,
                           imageUrls: (v.gallery.imageUrls as string[]).filter(u => u.trim()) },
        contact:         { isVisible: v.contact.isVisible, phone: v.contact.phone || null,
                           email: v.contact.email || null, address: v.contact.address || null,
                           mapsEmbedUrl: v.contact.mapsEmbedUrl || null },
        social:          { whatsapp: v.social.whatsapp || null, instagram: v.social.instagram || null,
                           youtube: v.social.youtube || null, facebook: v.social.facebook || null },
      }
    };
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      brandName:    ['', Validators.maxLength(100)],
      logoUrl:      [''],
      primaryColor: [''],
      accentColor:  [''],
      hero: this.fb.group({
        headline:       ['', Validators.maxLength(80)],
        tagline:        ['', Validators.maxLength(120)],
        bannerImageUrl: [''],
        ctaText:        ['', Validators.maxLength(40)],
      }),
      about: this.fb.group({
        isVisible:    [true],
        description:  ['', Validators.maxLength(500)],
        foundedYear:  [null],
        studentCount: [null],
      }),
      offerings: this.fb.group({
        isVisible: [true],
        items: this.fb.array([]),
      }),
      teachersSection: this.fb.group({ isVisible: [true] }),
      achievements: this.fb.group({
        isVisible: [true],
        items: this.fb.array([]),
      }),
      gallery: this.fb.group({
        isVisible: [true],
        imageUrls: this.fb.array([]),
      }),
      contact: this.fb.group({
        isVisible:    [true],
        phone:        [''],
        email:        ['', Validators.email],
        address:      [''],
        mapsEmbedUrl: [''],
      }),
      social: this.fb.group({
        whatsapp:  [''],
        instagram: [''],
        youtube:   [''],
        facebook:  [''],
      }),
    });
  }

  private buildAchievementGroup(item?: { studentName: string; exam: string; score: string; photoUrl: string | null; year: number | null }): FormGroup {
    return this.fb.group({
      studentName: [item?.studentName ?? '', [Validators.required, Validators.maxLength(80)]],
      exam:        [item?.exam        ?? '', [Validators.required, Validators.maxLength(100)]],
      score:       [item?.score       ?? '', [Validators.required, Validators.maxLength(60)]],
      photoUrl:    [item?.photoUrl    ?? ''],
      year:        [item?.year        ?? null],
    });
  }

  private buildOfferingGroup(title: string, note: string): FormGroup {
    return this.fb.group({
      title: [title, [Validators.required, Validators.maxLength(60)]],
      note:  [note,  Validators.maxLength(100)],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
