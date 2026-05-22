import { Routes, CanMatchFn } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { BrandingEditorComponent } from './components/settings/branding-editor/branding-editor.component';
import { ShellComponent } from './components/shell/shell.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StudentListComponent } from './components/students/student-list/student-list.component';
import { TenantAuthComponent } from './components/tenant-auth/tenant-auth.component';
import { TenantLoginComponent } from './components/tenant-auth/tenant-login/tenant-login.component';
import { TenantRegisterComponent } from './components/tenant-auth/tenant-register/tenant-register.component';
import { TenantVerifyEmailComponent } from './components/tenant-auth/tenant-verify-email/tenant-verify-email.component';
import { TenantForgotPasswordComponent } from './components/tenant-auth/tenant-forgot-password/tenant-forgot-password.component';
import { TenantResetPasswordComponent } from './components/tenant-auth/tenant-reset-password/tenant-reset-password.component';
import { TenantContextService } from './services/tenant-context.service';
import { authGuard } from './guards/auth.guard';
import { platformAdminGuard } from './guards/platform-admin.guard';
import { PlatformAdminLoginComponent } from './components/platform-admin/platform-admin-login/platform-admin-login.component';
import { PlatformAdminShellComponent } from './components/platform-admin/platform-admin-shell/platform-admin-shell.component';
import { TenantListComponent } from './components/platform-admin/tenant-list/tenant-list.component';
import { CreateTenantComponent } from './components/platform-admin/create-tenant/create-tenant.component';

const onCustomDomain: CanMatchFn = () => inject(TenantContextService).isCustomDomain();

export const routes: Routes = [
  // ── Platform Admin ──────────────────────────────────────
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

  // ── Custom domain routes (only matched when APP_INITIALIZER resolved a custom domain) ──
  { path: '', canMatch: [onCustomDomain], component: LandingPageComponent, pathMatch: 'full' },
  {
    path: '',
    canMatch: [onCustomDomain],
    component: TenantAuthComponent,
    children: [
      { path: 'login',           component: TenantLoginComponent           },
      { path: 'register',        component: TenantRegisterComponent        },
      { path: 'verify-email',    component: TenantVerifyEmailComponent     },
      { path: 'forgot-password', component: TenantForgotPasswordComponent  },
      { path: 'reset-password',  component: TenantResetPasswordComponent   },
    ]
  },

  // ── ClassNova domain routes ──
  {
    path: 't/:slug',
    children: [
      { path: '', component: LandingPageComponent, pathMatch: 'full' },
      {
        path: '',
        component: TenantAuthComponent,
        children: [
          { path: 'login',           component: TenantLoginComponent           },
          { path: 'register',        component: TenantRegisterComponent        },
          { path: 'verify-email',    component: TenantVerifyEmailComponent     },
          { path: 'forgot-password', component: TenantForgotPasswordComponent  },
          { path: 'reset-password',  component: TenantResetPasswordComponent   },
        ]
      }
    ]
  },
  { path: 'login',           component: LoginComponent           },
  { path: 'register',        component: RegisterComponent        },
  { path: 'verify-email',    component: VerifyEmailComponent     },
  { path: 'forgot-password', component: ForgotPasswordComponent  },
  { path: 'reset-password',  component: ResetPasswordComponent   },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard',          component: DashboardComponent       },
      { path: 'students',           component: StudentListComponent      },
      { path: 'settings',           redirectTo: 'settings/branding', pathMatch: 'full' },
      { path: 'settings/branding',  component: BrandingEditorComponent   },
      { path: '',                   redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  }
];
