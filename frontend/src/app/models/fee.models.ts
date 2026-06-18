export type FeeCategory  = 'TUITION' | 'ADMISSION' | 'EXAM' | 'TRANSPORT';
export type FeeFrequency = 'MONTHLY' | 'QUARTERLY' | 'ONE_TIME';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK';

export interface FeePlan {
  id: string;
  systemId: string;
  name: string;
  category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  dueDay: number | null;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  batchId: string | null;
  batchName: string | null;
  createdAt: string;
}

export interface CreateFeePlanRequest {
  name: string;
  category: FeeCategory;
  frequency: FeeFrequency;
  amount: number;
  dueDay: number | null;
  branchId: string | null;
  batchId: string | null;
}

export interface UpdateFeePlanRequest {
  name?: string;
  category?: FeeCategory;
  frequency?: FeeFrequency;
  amount?: number;
  dueDay?: number | null;
  branchId?: string | null;
  batchId?: string | null;
}

export interface PaymentRecord {
  id: string;
  systemId: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  feePlanId: string;
  feePlanName: string;
  feePlanCategory: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreatePaymentRequest {
  studentId: string;
  feePlanId: string;
  amountPaid: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNo: string | null;
  notes: string | null;
}

export interface PaymentListResponse {
  payments: PaymentRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BatchCollectionStudentRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  totalPaid: number;
  lastPaymentDate: string | null;
  paymentCount: number;
  /** Monthly due from the linked fee plan. null when no fee plan is attached. */
  dueAmount: number | null;
}

export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface BatchCollectionData {
  batchId: string;
  batchName: string;
  linkedFeePlan: FeePlan | null;
  students: BatchCollectionStudentRow[];
}
