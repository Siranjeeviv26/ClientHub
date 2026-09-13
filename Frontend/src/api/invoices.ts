import api from '../services/api';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  dealId?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  type: 'standard' | 'recurring' | 'proforma' | 'credit';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  clientId: { _id: string; companyName: string };
  dealId?: { _id: string; title: string; value: number };
  proposalId?: { _id: string; proposalNumber: string; title: string };
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  title?: string;
  description?: string;
  notes?: string;
  terms?: string;
  issuedAt?: string;
  dueAt: string;
  paidAt?: string;
  cancelledAt?: string;
  createdBy: { _id: string; name: string; email: string };
  attachments: any[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  dealId?: string;
  search?: string;
}

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvoiceStats {
  total: number;
  totalRevenue: number;
  outstanding: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
}

export const invoicesApi = {
  getAll: (params: InvoiceQueryParams = {}) =>
    api.get<PaginatedInvoices>('/invoices', params),

  getOne: (id: string) =>
    api.get<Invoice>(`/invoices/${id}`),

  getStats: () =>
    api.get<InvoiceStats>('/invoices/stats'),

  create: (data: Partial<Invoice>) =>
    api.post<Invoice>('/invoices', data),

  update: (id: string, data: Partial<Invoice>) =>
    api.patch<Invoice>(`/invoices/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/invoices/${id}`),
};
