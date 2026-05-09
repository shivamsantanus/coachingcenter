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
}

export interface AuthContext {
  token: string;
  role: string;
  tenantSlug: string;
  tenantName: string;
  fullName: string;
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
