import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Custom domain routes (hostname-based, no slug in path)
  { path: '',               renderMode: RenderMode.Server },
  { path: 'login',          renderMode: RenderMode.Server },
  { path: 'register',       renderMode: RenderMode.Server },
  { path: 'verify-email',   renderMode: RenderMode.Server },
  { path: 'forgot-password', renderMode: RenderMode.Server },
  { path: 'reset-password', renderMode: RenderMode.Server },

  // ClassNova domain slug-based routes
  { path: 't/:slug',                 renderMode: RenderMode.Server },
  { path: 't/:slug/login',           renderMode: RenderMode.Server },
  { path: 't/:slug/register',        renderMode: RenderMode.Server },
  { path: 't/:slug/verify-email',    renderMode: RenderMode.Server },
  { path: 't/:slug/forgot-password', renderMode: RenderMode.Server },
  { path: 't/:slug/reset-password',  renderMode: RenderMode.Server },

  // Authenticated routes depend on localStorage — must render on the client only.
  { path: '**', renderMode: RenderMode.Client }
];
