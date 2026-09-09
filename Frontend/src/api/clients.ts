import api from '../services/api';
import { Client, PaginatedResponse, ApiResponse, QueryParams } from '../types';

export const clientsApi = {
  getAll: (params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Client>>> =>
    api.get('/clients', params),

  getById: (id: string): Promise<ApiResponse<Client>> =>
    api.get(`/clients/${id}`),

  create: (data: Partial<Client>): Promise<ApiResponse<Client>> =>
    api.post('/clients', data),

  update: (id: string, data: Partial<Client>): Promise<ApiResponse<Client>> =>
    api.patch(`/clients/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`/clients/${id}`),

  getDeals: (id: string): Promise<ApiResponse<any[]>> =>
    api.get(`/clients/${id}/deals`),

  getTasks: (id: string): Promise<ApiResponse<any[]>> =>
    api.get(`/clients/${id}/tasks`),

  getActivities: (id: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<any>>> =>
    api.get(`/clients/${id}/activities`, params),

  addNote: (id: string, note: string): Promise<ApiResponse<Client>> =>
    api.post(`/clients/${id}/notes`, { note }),
};