import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Landing pages benefit from SSR for SEO / first paint.
  { path: '',        renderMode: RenderMode.Server },
  { path: 't/:slug', renderMode: RenderMode.Server },

  // Auth pages are purely interactive forms — SSR causes hydration re-init which
  // re-triggers BrandingService.loadBranding(), briefly setting isLoading=true,
  // hiding the router-outlet, and destroying the child component mid-login.
  // Client rendering avoids all hydration edge cases for these routes.
  { path: 'login',                   renderMode: RenderMode.Client },
  { path: 'register',                renderMode: RenderMode.Client },
  { path: 'verify-email',            renderMode: RenderMode.Client },
  { path: 'forgot-password',         renderMode: RenderMode.Client },
  { path: 'reset-password',          renderMode: RenderMode.Client },
  { path: 't/:slug/login',           renderMode: RenderMode.Client },
  { path: 't/:slug/register',        renderMode: RenderMode.Client },
  { path: 't/:slug/verify-email',    renderMode: RenderMode.Client },
  { path: 't/:slug/forgot-password', renderMode: RenderMode.Client },
  { path: 't/:slug/reset-password',  renderMode: RenderMode.Client },

  // Authenticated routes depend on localStorage — client only.
  { path: '**', renderMode: RenderMode.Client }
];
