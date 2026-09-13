import api from '../services/api';

export interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Proposal {
  _id: string;
  proposalNumber: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  dealId?: { _id: string; title: string; value: number };
  clientId?: { _id: string; companyName: string };
  items: ProposalItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  title?: string;
  description?: string;
  notes?: string;
  terms?: string;
  validUntil?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdBy: { _id: string; name: string; email: string };
  attachments: any[];
  createdAt: string;
  updatedAt: string;
}

export interface ProposalQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  dealId?: string;
  clientId?: string;
  search?: string;
}

export interface PaginatedProposals {
  data: Proposal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProposalStats {
  total: number;
  totalValue: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
}

export const proposalsApi = {
  getAll: (params: ProposalQueryParams = {}) =>
    api.get<PaginatedProposals>('/proposals', params),

  getOne: (id: string) =>
    api.get<Proposal>(`/proposals/${id}`),

  getStats: () =>
    api.get<ProposalStats>('/proposals/stats'),

  create: (data: Partial<Proposal>) =>
    api.post<Proposal>('/proposals', data),

  update: (id: string, data: Partial<Proposal>) =>
    api.patch<Proposal>(`/proposals/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/proposals/${id}`),
};
