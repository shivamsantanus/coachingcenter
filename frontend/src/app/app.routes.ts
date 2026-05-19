import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { BrandingEditorComponent } from './components/settings/branding-editor/branding-editor.component';
import { ShellComponent } from './components/shell/shell.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TenantAuthComponent } from './components/tenant-auth/tenant-auth.component';
import { TenantLoginComponent } from './components/tenant-auth/tenant-login/tenant-login.component';
import { TenantRegisterComponent } from './components/tenant-auth/tenant-register/tenant-register.component';
import { TenantVerifyEmailComponent } from './components/tenant-auth/tenant-verify-email/tenant-verify-email.component';
import { TenantForgotPasswordComponent } from './components/tenant-auth/tenant-forgot-password/tenant-forgot-password.component';
import { TenantResetPasswordComponent } from './components/tenant-auth/tenant-reset-password/tenant-reset-password.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
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
      { path: 'dashboard', component: DashboardComponent },
      { path: 'settings',          redirectTo: 'settings/branding', pathMatch: 'full' },
      { path: 'settings/branding', component: BrandingEditorComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ]
  }
];
