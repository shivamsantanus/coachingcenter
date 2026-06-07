import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/academic.models';
import {
  AdminDailyTeacherAttendanceItem,
  AdminMarkAttendanceRequest,
  AdminMonthlyReportResponse,
  TeacherAttendanceReportResponse,
  TeacherAttendanceTodayResponse,
  TeacherAttendanceHistoryItem,
} from '../models/teacher-attendance.models';

@Injectable({ providedIn: 'root' })
export class TeacherAttendanceService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/teacher-attendance';

  // ── Teacher endpoints ────────────────────────────────────────────────────

  checkIn(): Observable<ApiResponse<{ checkInTime: string }>> {
    return this.http.post<ApiResponse<{ checkInTime: string }>>(`${this.baseUrl}/check-in`, {}).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Check-in failed.')))
    );
  }

  checkOut(): Observable<ApiResponse<{ checkOutTime: string; workingMinutes: number }>> {
    return this.http.post<ApiResponse<{ checkOutTime: string; workingMinutes: number }>>(
      `${this.baseUrl}/check-out`, {}
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Check-out failed.')))
    );
  }

  getToday(): Observable<ApiResponse<TeacherAttendanceTodayResponse>> {
    return this.http.get<ApiResponse<TeacherAttendanceTodayResponse>>(`${this.baseUrl}/my-today`).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to load today\'s record.')))
    );
  }

  getHistory(from: string, to: string): Observable<ApiResponse<TeacherAttendanceHistoryItem[]>> {
    return this.http.get<ApiResponse<TeacherAttendanceHistoryItem[]>>(
      `${this.baseUrl}/my-history`, { params: { from, to } }
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to load history.')))
    );
  }

  getMyReport(month: number, year: number): Observable<ApiResponse<TeacherAttendanceReportResponse>> {
    return this.http.get<ApiResponse<TeacherAttendanceReportResponse>>(
      `${this.baseUrl}/my-report`, { params: { month, year } }
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to load report.')))
    );
  }

  // ── Admin endpoints ──────────────────────────────────────────────────────

  adminGetDaily(date: string): Observable<ApiResponse<AdminDailyTeacherAttendanceItem[]>> {
    return this.http.get<ApiResponse<AdminDailyTeacherAttendanceItem[]>>(
      `${this.baseUrl}/admin/daily`, { params: { date } }
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to load daily attendance.')))
    );
  }

  adminMark(request: AdminMarkAttendanceRequest): Observable<ApiResponse<{ saved: boolean }>> {
    return this.http.post<ApiResponse<{ saved: boolean }>>(`${this.baseUrl}/admin/mark`, request).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to save attendance.')))
    );
  }

  adminGetMonthlyReport(
    month: number, year: number, teacherId?: string
  ): Observable<ApiResponse<AdminMonthlyReportResponse>> {
    const params: Record<string, string | number> = { month, year };
    if (teacherId) params['teacherId'] = teacherId;
    return this.http.get<ApiResponse<AdminMonthlyReportResponse>>(
      `${this.baseUrl}/admin/monthly-report`, { params }
    ).pipe(
      catchError(err => throwError(() => new Error(err?.error?.error ?? 'Failed to load monthly report.')))
    );
  }
}
