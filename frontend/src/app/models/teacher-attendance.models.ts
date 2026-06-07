export interface TeacherAttendanceTodayResponse {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingMinutes: number | null;
  status: string | null;
  isAutoClosed: boolean;
  hasUnclosedPrevious: boolean;
  unclosedDate: string | null;
}

export interface TeacherAttendanceHistoryItem {
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingMinutes: number | null;
  status: string | null;
  isAutoClosed: boolean;
}

export interface TeacherAttendanceReportResponse {
  teacherName: string;
  employeeCode: string;
  month: number;
  year: number;
  totalDays: number;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  confirmedWorkingMinutes: number;
  records: TeacherAttendanceHistoryItem[];
}

export interface AdminDailyTeacherAttendanceItem {
  teacherId: string;
  teacherName: string;
  employeeCode: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingMinutes: number | null;
  status: string | null;
  isAutoClosed: boolean;
  note: string | null;
  hasCheckInAttempt: boolean;
  checkInAttemptedAt: string | null;
  originalCheckInTime: string | null;
  originalCheckOutTime: string | null;
}

export interface AdminMarkAttendanceRequest {
  teacherId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  note?: string | null;
}

export interface AdminMonthlyReportResponse {
  month: number;
  year: number;
  teachers: TeacherAttendanceReportResponse[];
}
