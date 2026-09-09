import api from '../services/api';
import { Task, PaginatedResponse, ApiResponse, QueryParams } from '../types';

export const tasksApi = {
  getAll: (params?: QueryParams): Promise<ApiResponse<PaginatedResponse<Task>>> =>
    api.get('/tasks', params),

  getOverdue: (): Promise<ApiResponse<Task[]>> =>
    api.get('/tasks/overdue'),

  getUpcoming: (days?: number): Promise<ApiResponse<Task[]>> =>
    api.get('/tasks/upcoming', { days }),

  getById: (id: string): Promise<ApiResponse<Task>> =>
    api.get(`/tasks/${id}`),

  create: (data: Partial<Task>): Promise<ApiResponse<Task>> =>
    api.post('/tasks', data),

  update: (id: string, data: Partial<Task>): Promise<ApiResponse<Task>> =>
    api.patch(`/tasks/${id}`, data),

  delete: (id: string): Promise<void> =>
    api.delete(`/tasks/${id}`),
};