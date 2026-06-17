import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/academic.models';
import {
  FeePlan,
  CreateFeePlanRequest,
  UpdateFeePlanRequest,
  PaymentRecord,
  CreatePaymentRequest,
  PaymentListResponse,
  BatchCollectionData,
} from '../models/fee.models';

export interface PaymentFilters {
  studentId?: string;
  feePlanId?: string;
  batchId?: string;
  classId?: string;
  academicYearId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class FeeService {
  private http    = inject(HttpClient);
  private planUrl = `${environment.apiBaseUrl}/feeplans`;
  private payUrl  = `${environment.apiBaseUrl}/payments`;

  // ── Fee Plans ───────────────────────────────────────────────────────────────

  getFeePlans(activeOnly?: boolean): Observable<FeePlan[]> {
    let params = new HttpParams();
    if (activeOnly != null) params = params.set('activeOnly', String(activeOnly));

    return this.http.get<ApiResponse<FeePlan[]>>(this.planUrl, { params }).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to load fee plans');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  createFeePlan(request: CreateFeePlanRequest): Observable<FeePlan> {
    return this.http.post<ApiResponse<FeePlan>>(this.planUrl, request).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to create fee plan');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateFeePlan(id: string, request: UpdateFeePlanRequest): Observable<FeePlan> {
    return this.http.put<ApiResponse<FeePlan>>(`${this.planUrl}/${id}`, request).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to update fee plan');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  toggleFeePlanStatus(id: string, isActive: boolean): Observable<void> {
    const status = isActive ? 'ACTIVE' : 'INACTIVE';
    return this.http.patch<ApiResponse<object>>(`${this.planUrl}/${id}/status`, { status }).pipe(
      map(r => {
        if (!r.success) throw new Error(r.error ?? 'Failed to update status');
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteFeePlan(id: string): Observable<void> {
    return this.http.delete<ApiResponse<object>>(`${this.planUrl}/${id}`).pipe(
      map(r => {
        if (!r.success) throw new Error(r.error ?? 'Failed to delete fee plan');
      }),
      catchError(err => throwError(() => err))
    );
  }

  // ── Payments ────────────────────────────────────────────────────────────────

  getPayments(filters: PaymentFilters = {}): Observable<PaymentListResponse> {
    let params = new HttpParams();
    if (filters.studentId)     params = params.set('studentId',     filters.studentId);
    if (filters.feePlanId)     params = params.set('feePlanId',     filters.feePlanId);
    if (filters.batchId)       params = params.set('batchId',       filters.batchId);
    if (filters.classId)       params = params.set('classId',       filters.classId);
    if (filters.academicYearId) params = params.set('academicYearId', filters.academicYearId);
    if (filters.fromDate)      params = params.set('fromDate',      filters.fromDate);
    if (filters.toDate)        params = params.set('toDate',        filters.toDate);
    if (filters.page)      params = params.set('page',      String(filters.page));
    if (filters.pageSize)  params = params.set('pageSize',  String(filters.pageSize));

    return this.http.get<ApiResponse<PaymentListResponse>>(this.payUrl, { params }).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to load payments');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  recordPayment(request: CreatePaymentRequest): Observable<PaymentRecord> {
    return this.http.post<ApiResponse<PaymentRecord>>(this.payUrl, request).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to record payment');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  getBatchCollection(batchId: string): Observable<BatchCollectionData> {
    const params = new HttpParams().set('batchId', batchId);
    return this.http.get<ApiResponse<BatchCollectionData>>(`${this.payUrl}/batch-collection`, { params }).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.error ?? 'Failed to load batch collection');
        return r.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<ApiResponse<object>>(`${this.payUrl}/${id}`).pipe(
      map(r => {
        if (!r.success) throw new Error(r.error ?? 'Failed to delete payment');
      }),
      catchError(err => throwError(() => err))
    );
  }
}
