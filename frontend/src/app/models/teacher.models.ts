export interface TeacherSummary {
  id: string;
  fullName: string;
  employeeCode: string;
  qualification: string | null;
  salaryType: 'MONTHLY' | 'PER_CLASS' | null;
  status: 'ACTIVE' | 'INACTIVE';
  photoUrl: string | null;
  branchId: string | null;
  createdAt: string;
}

export interface TeacherDetail extends TeacherSummary {
  userId: string | null;
  updatedAt: string;
}

export interface TeacherListResponse {
  total: number;
  page: number;
  pageSize: number;
  data: TeacherSummary[];
}

export interface CreateTeacherRequest {
  fullName: string;
  email: string;
  employeeCode: string;
  qualification: string | null;
  salaryType: string | null;
  branchId: string | null;
}

export interface UpdateTeacherRequest {
  fullName?: string | null;
  employeeCode?: string | null;
  qualification?: string | null;
  salaryType?: string | null;
}

export interface TeacherCreatedResult {
  id: string;
  fullName: string;
  employeeCode: string;
  status: string;
  systemId: string;
  loginEmail: string;
  oneTimePassword: string;
  message: string;
}

export interface TeacherPhotoResult {
  photoUrl: string;
}

export interface LoginCredentials {
  fullName: string;
  loginEmail: string;
  oneTimePassword: string;
}
