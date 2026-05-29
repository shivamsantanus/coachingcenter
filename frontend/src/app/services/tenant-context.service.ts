import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly slugSignal           = signal('');
  private readonly isCustomDomainSignal = signal(false);

  readonly slug           = this.slugSignal.asReadonly();
  readonly isCustomDomain = this.isCustomDomainSignal.asReadonly();

  setContext(slug: string, isCustomDomain: boolean): void {
    this.slugSignal.set(slug);
    this.isCustomDomainSignal.set(isCustomDomain);
  }

  // Called by LandingPageComponent and TenantAuthComponent when the slug comes
  // from the route param (/t/:slug/...). On a custom domain the slug is already
  // set correctly by DomainResolverService, so we leave it alone there.
  setSlugFromRoute(slug: string): void {
    if (!this.isCustomDomainSignal()) {
      this.slugSignal.set(slug);
    }
  }

  authPath(page: string): string {
    return this.isCustomDomain() ? `/${page}` : `/t/${this.slug()}/${page}`;
  }

  get landingUrl(): string {
    return this.isCustomDomain() ? '/' : `/t/${this.slug()}`;
  }
}
