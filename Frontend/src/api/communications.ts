import api from '../services/api';
import { PaginatedResponse, ApiResponse, QueryParams } from '../types';

export interface Communication {
  _id: string;
  organizationId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'message';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  content: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
  userId: string;
  participants: string[];
  attachments: string[];
  duration?: number;
  metadata?: Record<string, any>;
  user?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationQueryParams extends QueryParams {
  type?: string;
  direction?: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
  startDate?: string;
  endDate?: string;
}

export const communicationsApi = {
  getAll: (params?: CommunicationQueryParams): Promise<ApiResponse<PaginatedResponse<Communication>>> =>
    api.get('/communications', params),

  getTimeline: (type: string, entityId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Communication>>> =>
    api.get(`/communications/timeline/${type}/${entityId}`, params),

  getById: (id: string): Promise<ApiResponse<Communication>> =>
    api.get(`/communications/${id}`),

  create: (data: Partial<Communication>): Promise<ApiResponse<Communication>> =>
    api.post('/communications', data),

  update: (id: string, data: Partial<Communication>): Promise<ApiResponse<Communication>> =>
    api.patch(`/communications/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`/communications/${id}`),
};
