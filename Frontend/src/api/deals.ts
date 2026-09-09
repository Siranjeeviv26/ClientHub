import api from '../services/api';
import { Deal, PaginatedResponse, ApiResponse, QueryParams, DealStage } from '../types';

export const dealsApi = {
  getAll: (params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Deal>>> =>
    api.get('/deals', params),

  getPipeline: (): Promise<ApiResponse<{ stage: string; deals: Deal[]; count: number; totalValue: number; weightedValue: number }[]>> =>
    api.get('/deals/pipeline'),

  getById: (id: string): Promise<ApiResponse<Deal>> =>
    api.get(`/deals/${id}`),

  create: (data: Partial<Deal>): Promise<ApiResponse<Deal>> =>
    api.post('/deals', data),

  update: (id: string, data: Partial<Deal>): Promise<ApiResponse<Deal>> =>
    api.patch(`/deals/${id}`, data),

  updateStage: (id: string, stage: DealStage): Promise<ApiResponse<Deal>> =>
    api.patch(`/deals/${id}/stage`, { stage }),

  delete: (id: string): Promise<void> =>
    api.delete(`/deals/${id}`),

  getActivities: (id: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<any>>> =>
    api.get(`/deals/${id}/activities`, params),
};