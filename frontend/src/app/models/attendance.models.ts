export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

// ─── GET /api/attendance (per-student record for a date) ─────────────────────
export interface AttendanceRecord {
  readonly studentId: string;
  readonly studentName: string;
  readonly admissionNo: string;
  readonly status: AttendanceStatus | null;
  readonly note: string | null;
  readonly markedByName: string | null;
}

// ─── POST /api/attendance/mark ───────────────────────────────────────────────
export interface AttendanceRecordRequest {
  readonly studentId: string;
  readonly status: AttendanceStatus;
  readonly note?: string | null;
}

export interface MarkAttendanceRequest {
  readonly batchId: string;
  readonly date: string;
  readonly records: AttendanceRecordRequest[];
}

export interface MarkAttendanceResponse {
  readonly saved: number;
  readonly date: string;
}

// ─── GET /api/attendance/monthly-report ──────────────────────────────────────
export interface MonthlyReportStudent {
  readonly studentId: string;
  readonly studentName: string;
  readonly admissionNo: string;
  readonly dailyStatus: Record<string, AttendanceStatus>; // "yyyy-MM-dd" → status
  readonly totalDays: number;
  readonly present: number;
  readonly absent: number;
  readonly late: number;
  readonly excused: number;
  readonly presentPercentage: number;
}

export interface MonthlyReportData {
  readonly batchId: string;
  readonly batchName: string;
  readonly month: number;
  readonly year: number;
  readonly markedDates: string[]; // "yyyy-MM-dd" array, sorted
  readonly students: MonthlyReportStudent[];
}

// ─── GET /api/attendance/summary ─────────────────────────────────────────────
export interface AttendanceSummary {
  readonly studentId: string;
  readonly studentName: string;
  readonly admissionNo: string;
  readonly totalDays: number;
  readonly present: number;
  readonly absent: number;
  readonly late: number;
  readonly excused: number;
  readonly presentPercentage: number;
}
