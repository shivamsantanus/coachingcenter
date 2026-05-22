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

  authPath(page: string): string {
    return this.isCustomDomain() ? `/${page}` : `/t/${this.slug()}/${page}`;
  }

  get landingUrl(): string {
    return this.isCustomDomain() ? '/' : `/t/${this.slug()}`;
  }
}
