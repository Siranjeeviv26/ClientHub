import api from '../services/api';

export interface Payment {
  _id: string;
  paymentNumber: string;
  invoiceId: { _id: string; invoiceNumber: string; total: number };
  clientId: { _id: string; companyName: string };
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'stripe' | 'cash' | 'check' | 'other';
  transactionId?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  invoiceId?: string;
  clientId?: string;
  search?: string;
}

export interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentStats {
  total: number;
  totalPaid: number;
  totalRefunded: number;
  pending: number;
  completed: number;
  failed: number;
  refunded: number;
}

export const paymentsApi = {
  getAll: (params: PaymentQueryParams = {}) =>
    api.get<PaginatedPayments>('/payments', params),

  getOne: (id: string) =>
    api.get<Payment>(`/payments/${id}`),

  getStats: () =>
    api.get<PaymentStats>('/payments/stats'),

  create: (data: Partial<Payment>) =>
    api.post<Payment>('/payments', data),

  update: (id: string, data: Partial<Payment>) =>
    api.patch<Payment>(`/payments/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/payments/${id}`),
};
