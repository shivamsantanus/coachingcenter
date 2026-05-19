import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 't/:slug',                    renderMode: RenderMode.Server },
  { path: 't/:slug/login',              renderMode: RenderMode.Server },
  { path: 't/:slug/register',           renderMode: RenderMode.Server },
  { path: 't/:slug/verify-email',       renderMode: RenderMode.Server },
  { path: 't/:slug/forgot-password',    renderMode: RenderMode.Server },
  { path: 't/:slug/reset-password',     renderMode: RenderMode.Server },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
