export interface StudentMonthlyAttendance {
  readonly totalDays: number;
  readonly presentDays: number;
  readonly percentage: number;
}

export interface StudentBatchCard {
  readonly batchId: string;
  readonly batchName: string;
  readonly className: string | null;
  readonly academicYearName: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly attendanceThisMonth: StudentMonthlyAttendance;
}

export interface StudentDashboardStats {
  readonly totalBatches: number;
  readonly overallPercent: number;
}

export interface StudentDashboardData {
  readonly fullName: string;
  readonly admissionNo: string;
  readonly systemId: string | null;
  readonly photoUrl: string | null;
  readonly email: string | null;
  readonly branchName: string | null;
  readonly enrolledBatches: StudentBatchCard[];
  readonly stats: StudentDashboardStats;
}

export interface StudentEnrollmentInfo {
  readonly batchId: string;
  readonly batchName: string;
  readonly className: string | null;
  readonly academicYearId: string;
  readonly academicYearName: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly status: string;
}
