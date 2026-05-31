import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/academic.models';
import {
  AttendanceRecord,
  AttendanceSummary,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  MonthlyReportData
} from '../models/attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/attendance';

  getAttendance(batchId: string, date: string): Observable<ApiResponse<AttendanceRecord[]>> {
    return this.http.get<ApiResponse<AttendanceRecord[]>>(this.baseUrl, {
      params: { batchId, date }
    }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load attendance.';
        return throwError(() => new Error(message));
      })
    );
  }

  markAttendance(request: MarkAttendanceRequest): Observable<ApiResponse<MarkAttendanceResponse>> {
    return this.http.post<ApiResponse<MarkAttendanceResponse>>(`${this.baseUrl}/mark`, request).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to save attendance.';
        return throwError(() => new Error(message));
      })
    );
  }

  getMonthlyReport(batchId: string, month: number, year: number): Observable<ApiResponse<MonthlyReportData>> {
    return this.http.get<ApiResponse<MonthlyReportData>>(`${this.baseUrl}/monthly-report`, {
      params: { batchId, month: month.toString(), year: year.toString() }
    }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load monthly report.';
        return throwError(() => new Error(message));
      })
    );
  }

  getSummary(params: {
    batchId?: string;
    studentId?: string;
    fromDate?: string;
    toDate?: string;
  }): Observable<ApiResponse<AttendanceSummary[]>> {
    const queryParams: Record<string, string> = {};
    if (params.batchId)   queryParams['batchId']   = params.batchId;
    if (params.studentId) queryParams['studentId'] = params.studentId;
    if (params.fromDate)  queryParams['fromDate']  = params.fromDate;
    if (params.toDate)    queryParams['toDate']    = params.toDate;

    return this.http.get<ApiResponse<AttendanceSummary[]>>(`${this.baseUrl}/summary`, {
      params: queryParams
    }).pipe(
      catchError(err => {
        const message = err?.error?.error ?? err?.message ?? 'Failed to load attendance summary.';
        return throwError(() => new Error(message));
      })
    );
  }
}
