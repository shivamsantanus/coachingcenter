// ─── Branch ──────────────────────────────────────────────────────────────────
export interface BranchSummary {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly address: string | null;
  readonly phone: string | null;
  readonly mapUrl: string | null;
  readonly status: string;
}

export interface CreateBranchRequest {
  readonly name: string;
  readonly code?: string | null;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly mapUrl?: string | null;
}

export interface UpdateBranchRequest {
  readonly name?: string;
  readonly code?: string | null;
  readonly address?: string | null;
  readonly phone?: string | null;
  readonly mapUrl?: string | null;
}

// ─── Generic API envelope ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error: string | null;
}

// ─── Academic Year ───────────────────────────────────────────────────────────
export interface AcademicYearSummary {
  readonly id: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isActive: boolean;
}

export interface CreateAcademicYearRequest {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

export interface UpdateAcademicYearRequest {
  readonly name?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

// ─── Class ───────────────────────────────────────────────────────────────────
export interface ClassSummary {
  readonly id: string;
  readonly name: string;
  readonly academicYearId: string;
  readonly academicYearName: string;
  readonly sortOrder: number | null;
  readonly status: string;
}

export interface CreateClassRequest {
  readonly academicYearId: string;
  readonly name: string;
  readonly sortOrder?: number | null;
  readonly branchId?: string | null;
}

export interface UpdateClassRequest {
  readonly name?: string;
  readonly sortOrder?: number | null;
  readonly branchId?: string | null;
}

// ─── Batch ───────────────────────────────────────────────────────────────────
export interface BatchSummary {
  readonly id: string;
  readonly name: string;
  readonly academicYearId: string;
  readonly academicYearName: string;
  readonly classId: string | null;
  readonly className: string | null;
  readonly branchId: string | null;
  readonly branchName: string | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly status: string;
}

export interface CreateBatchRequest {
  readonly academicYearId: string;
  readonly classId?: string | null;
  readonly branchId?: string | null;
  readonly name: string;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}

export interface UpdateBatchRequest {
  readonly name?: string;
  readonly classId?: string | null;
  readonly branchId?: string | null;
  readonly startDate?: string | null;
  readonly endDate?: string | null;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}

// ─── Subject ─────────────────────────────────────────────────────────────────
export interface SubjectSummary {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
}

export interface CreateSubjectRequest {
  readonly name: string;
  readonly code?: string | null;
}

export interface UpdateSubjectRequest {
  readonly name?: string;
  readonly code?: string | null;
}

// ─── Batch-Subject-Teacher ────────────────────────────────────────────────────
export interface BatchSubjectTeacherSummary {
  readonly id: string;
  readonly batchId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly subjectCode: string | null;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly teacherEmployeeCode: string;
}

export interface CreateBatchSubjectTeacherRequest {
  readonly batchId: string;
  readonly subjectId: string;
  readonly teacherId: string;
}

// ─── Student Enrollment ───────────────────────────────────────────────────────
export interface StudentEnrollmentSummary {
  readonly id: string;
  readonly studentId: string;
  readonly studentName: string;
  readonly admissionNo: string;
  readonly classId: string | null;
  readonly className: string | null;
  readonly batchId: string | null;
  readonly batchName: string | null;
  readonly enrolledOn: string;
  readonly isActive: boolean;
}

export interface CreateStudentEnrollmentRequest {
  readonly studentId: string;
  readonly classId?: string | null;
  readonly batchId?: string | null;
  readonly enrolledOn?: string;
}

export interface BulkEnrollRequest {
  readonly batchId: string;
  readonly studentIds: string[];
  readonly enrolledOn?: string;
}
