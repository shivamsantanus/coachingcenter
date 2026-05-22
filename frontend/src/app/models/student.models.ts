export interface StudentSummary {
  id: string;
  fullName: string;
  admissionNo: string;
  guardianName: string;
  guardianPhone: string;
  dateOfBirth: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  photoUrl: string | null;
  branchId: string | null;
  createdAt: string;
}

export interface StudentDetail extends StudentSummary {
  address: string;
  userId: string | null;
  updatedAt: string;
}

export interface StudentListResponse {
  total: number;
  page: number;
  pageSize: number;
  data: StudentSummary[];
}

export interface CreateStudentRequest {
  fullName: string;
  admissionNo: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  dateOfBirth: string | null;
  branchId: string | null;
}

export interface UpdateStudentRequest {
  fullName?: string | null;
  admissionNo?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  branchId?: string | null;
}
