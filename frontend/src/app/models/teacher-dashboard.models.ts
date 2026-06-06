export interface TeacherBatchCard {
  readonly batchId: string;
  readonly batchName: string;
  readonly className: string | null;
  readonly academicYearName: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly studentCount: number;
  readonly attendanceMarkedToday: boolean;
}

export interface TeacherDashboardStats {
  readonly totalBatches: number;
  readonly totalStudents: number;
  readonly totalSubjects: number;
}

export interface TeacherSubjectRow {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly batchName: string;
}

export interface TeacherDashboardData {
  readonly teacherName: string;
  readonly employeeCode: string;
  readonly systemId: string | null;
  readonly photoUrl: string | null;
  readonly todaysBatches: TeacherBatchCard[];
  readonly stats: TeacherDashboardStats;
  readonly subjects: TeacherSubjectRow[];
}

export interface TeacherProfileAssignment {
  readonly batchId: string;
  readonly batchName: string;
  readonly className: string | null;
  readonly academicYearName: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly status: string;
}

export interface TeacherProfileInfo {
  readonly id: string;
  readonly fullName: string;
  readonly employeeCode: string;
  readonly email: string | null;
  readonly qualification: string | null;
  readonly salaryType: string | null;
  readonly status: string;
  readonly photoUrl: string | null;
  readonly systemId: string | null;
  readonly branchName: string | null;
  readonly createdAt: string;
}

export interface TeacherProfileData {
  readonly teacher: TeacherProfileInfo;
  readonly assignments: TeacherProfileAssignment[];
}
