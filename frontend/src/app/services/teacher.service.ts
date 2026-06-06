import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  TeacherListResponse,
  TeacherDetail,
  CreateTeacherRequest,
  UpdateTeacherRequest,
  TeacherCreatedResult,
  TeacherPhotoResult,
} from '../models/teacher.models';
import { TeacherDashboardData, TeacherProfileData } from '../models/teacher-dashboard.models';
import { ApiResponse } from '../models/academic.models';

interface MessageResult  { message: string; }
interface StatusResult   { message: string; status: string; }

export interface TeacherListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/teachers`;

  listTeachers(filters: TeacherListFilters): Observable<TeacherListResponse> {
    let params = new HttpParams()
      .set('page',     String(filters.page     ?? 1))
      .set('pageSize', String(filters.pageSize ?? 20));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);

    return this.http.get<TeacherListResponse>(this.baseUrl, { params }).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to load teachers.')))
    );
  }

  getTeacher(teacherId: string): Observable<TeacherDetail> {
    return this.http.get<TeacherDetail>(`${this.baseUrl}/${teacherId}`).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to load teacher.')))
    );
  }

  createTeacher(request: CreateTeacherRequest): Observable<TeacherCreatedResult> {
    return this.http.post<{ success: boolean; data: TeacherCreatedResult; error: string | null }>(this.baseUrl, request).pipe(
      map(response => response.data),
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to create teacher.')))
    );
  }

  updateTeacher(teacherId: string, request: UpdateTeacherRequest): Observable<MessageResult> {
    return this.http.put<MessageResult>(`${this.baseUrl}/${teacherId}`, request).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to update teacher.')))
    );
  }

  updateStatus(teacherId: string, status: 'ACTIVE' | 'INACTIVE'): Observable<StatusResult> {
    return this.http.patch<StatusResult>(`${this.baseUrl}/${teacherId}/status`, { status }).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to update status.')))
    );
  }

  uploadPhoto(teacherId: string, file: File): Observable<TeacherPhotoResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<TeacherPhotoResult>(`${this.baseUrl}/${teacherId}/photo`, formData).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to upload photo.')))
    );
  }

  getMyDashboard(): Observable<ApiResponse<TeacherDashboardData>> {
    return this.http.get<ApiResponse<TeacherDashboardData>>(`${this.baseUrl}/my-dashboard`).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to load dashboard.')))
    );
  }

  getMyProfile(): Observable<ApiResponse<TeacherProfileData>> {
    return this.http.get<ApiResponse<TeacherProfileData>>(`${this.baseUrl}/my-profile`).pipe(
      catchError(err => throwError(() =>
        new Error(err?.error?.error ?? err?.message ?? 'Failed to load profile.')))
    );
  }
}
