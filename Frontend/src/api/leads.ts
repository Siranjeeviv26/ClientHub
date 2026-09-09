import api from '../services/api';
import { Lead, PaginatedResponse, ApiResponse, QueryParams, LeadStage } from '../types';

export const leadsApi = {
  getAll: (params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Lead>>> =>
    api.get('/leads', params),

  getPipeline: (): Promise<ApiResponse<{ stage: string; leads: Lead[]; count: number; totalValue: number }[]>> =>
    api.get('/leads/pipeline'),

  getById: (id: string): Promise<ApiResponse<Lead>> =>
    api.get(`/leads/${id}`),

  create: (data: Partial<Lead>): Promise<ApiResponse<Lead>> =>
    api.post('/leads', data),

  update: (id: string, data: Partial<Lead>): Promise<ApiResponse<Lead>> =>
    api.patch(`/leads/${id}`, data),

  convert: (id: string): Promise<ApiResponse<{ lead: Lead; clientId: string }>> =>
    api.post(`/leads/${id}/convert`),

  delete: (id: string): Promise<void> =>
    api.delete(`/leads/${id}`),

  getActivities: (id: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<any>>> =>
    api.get(`/leads/${id}/activities`, params),
};