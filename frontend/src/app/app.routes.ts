import { Routes, Route, CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { BrandingEditorComponent } from './components/settings/branding-editor/branding-editor.component';
import { SettingsShellComponent } from './components/settings/settings-shell/settings-shell.component';
import { BranchesComponent } from './components/settings/branches/branches.component';
import { ShellComponent } from './components/shell/shell.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentListComponent } from './components/students/student-list/student-list.component';
import { TeacherListComponent } from './components/teachers/teacher-list/teacher-list.component';
import { TenantAuthComponent } from './components/tenant-auth/tenant-auth.component';
import { TenantLoginComponent } from './components/tenant-auth/tenant-login/tenant-login.component';
import { TenantRegisterComponent } from './components/tenant-auth/tenant-register/tenant-register.component';
import { TenantVerifyEmailComponent } from './components/tenant-auth/tenant-verify-email/tenant-verify-email.component';
import { TenantForgotPasswordComponent } from './components/tenant-auth/tenant-forgot-password/tenant-forgot-password.component';
import { TenantResetPasswordComponent } from './components/tenant-auth/tenant-reset-password/tenant-reset-password.component';
import { TenantContextService } from './services/tenant-context.service';
import { platformAdminGuard } from './guards/platform-admin.guard';
import { tenantAuthGuard } from './guards/tenant-auth.guard';
import { redirectIfLoggedInGuard } from './guards/redirect-if-logged-in.guard';
import { PlatformAdminLoginComponent } from './components/platform-admin/platform-admin-login/platform-admin-login.component';
import { PlatformAdminShellComponent } from './components/platform-admin/platform-admin-shell/platform-admin-shell.component';
import { TenantListComponent } from './components/platform-admin/tenant-list/tenant-list.component';
import { CreateTenantComponent } from './components/platform-admin/create-tenant/create-tenant.component';
import { AcademicComponent } from './components/academic/academic.component';
import { AttendanceComponent } from './components/attendance/attendance.component';

const onCustomDomain: CanMatchFn = () => inject(TenantContextService).isCustomDomain();

// ── Shell children — all protected pages inside the app ──────────────────────
// path: '**' catches unimplemented routes (fees, exams, etc.) and redirects to dashboard.
const shellChildren: Route[] = [
  { path: 'dashboard',         component: DashboardComponent      },
  { path: 'students',          component: StudentListComponent     },
  { path: 'teachers',          component: TeacherListComponent     },
  {
    path: 'settings',
    component: SettingsShellComponent,
    children: [
      { path: 'branding', component: BrandingEditorComponent },
      { path: 'branches', component: BranchesComponent       },
      { path: '',         redirectTo: 'branding', pathMatch: 'full' }
    ]
  },
  { path: 'academic',           component: AcademicComponent          },
  { path: 'attendance',         component: AttendanceComponent        },
  { path: '',                  redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**',                redirectTo: 'dashboard'             },
];

// ── Tenant auth children — login / register / password flows ─────────────────
const tenantAuthChildren: Route[] = [
  { path: 'login',           component: TenantLoginComponent           },
  { path: 'register',        component: TenantRegisterComponent        },
  { path: 'verify-email',    component: TenantVerifyEmailComponent     },
  { path: 'forgot-password', component: TenantForgotPasswordComponent  },
  { path: 'reset-password',  component: TenantResetPasswordComponent   },
];

export const routes: Routes = [

  // ── Platform Admin ────────────────────────────────────────────────────────
  { path: 'admin/login', component: PlatformAdminLoginComponent },
  {
    path: 'admin',
    component: PlatformAdminShellComponent,
    canActivate: [platformAdminGuard],
    children: [
      { path: 'tenants',     component: TenantListComponent   },
      { path: 'tenants/new', component: CreateTenantComponent },
      { path: '',            redirectTo: 'tenants', pathMatch: 'full' },
    ]
  },

  // ── Custom domain routes ──────────────────────────────────────────────────
  // canMatch only passes when APP_INITIALIZER resolved a custom domain.
  { path: '', canMatch: [onCustomDomain], component: LandingPageComponent, pathMatch: 'full' },
  {
    path: '',
    canMatch: [onCustomDomain],
    component: TenantAuthComponent,
    children: tenantAuthChildren,
  },
  {
    path: '',
    canMatch: [onCustomDomain],
    component: ShellComponent,
    canActivate: [tenantAuthGuard],
    children: shellChildren,
  },

  // ── ClassNova domain — tenant routes under /t/:slug ──────────────────────
  {
    path: 't/:slug',
    children: [
      { path: '', component: LandingPageComponent, pathMatch: 'full' },
      {
        path: '',
        component: TenantAuthComponent,
        children: tenantAuthChildren,
      },
      {
        path: '',
        component: ShellComponent,
        canActivate: [tenantAuthGuard],
        children: shellChildren,
      },
    ]
  },

  // ── Platform auth pages ───────────────────────────────────────────────────
  // redirectIfLoggedInGuard sends already-authenticated users to their home
  // screen so these pages never render for a logged-in user.
  { path: 'login',           component: LoginComponent,           canActivate: [redirectIfLoggedInGuard] },
  { path: 'register',        component: RegisterComponent,        canActivate: [redirectIfLoggedInGuard] },
  { path: 'verify-email',    component: VerifyEmailComponent,     canActivate: [redirectIfLoggedInGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent,  canActivate: [redirectIfLoggedInGuard] },
  { path: 'reset-password',  component: ResetPasswordComponent,   canActivate: [redirectIfLoggedInGuard] },

  // ── Fallbacks ─────────────────────────────────────────────────────────────
  // Root with no path → send to platform login.
  { path: '',  redirectTo: 'login', pathMatch: 'full' },
  // Catch-all for any completely unmatched URL at the root level.
  { path: '**', redirectTo: 'login' },
];
