export interface LoginRequest {
  tenantSlug: string;
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  tenantSlug: string;
  email: string;
  password: string;
  roleCode: string;
}

export interface AuthData {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
  isFirstLogin: boolean;
}

export interface AuthContext {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
  isFirstLogin: boolean;
}

export interface VerifyEmailRequest {
  tenantSlug: string;
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  tenantSlug: string;
  email: string;
}

export interface ForgotPasswordRequest {
  tenantSlug: string;
  email: string;
}

export interface ResetPasswordRequest {
  tenantSlug:  string;
  email:       string;
  otp:         string;
  newPassword: string;
}

export interface PlatformLoginRequest {
  email:    string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
