import api from '../services/api';
import { User, PaginatedResponse, ApiResponse, QueryParams } from '../types';

export const usersApi = {
  findAll: (params?: QueryParams): Promise<ApiResponse<PaginatedResponse<User>>> =>
    api.get('/users', params),

  getProfile: (): Promise<ApiResponse<User>> =>
    api.get('/users/profile'),

  updateProfile: (organizationId: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    api.patch('/users/profile', data),

  uploadAvatar: (organizationId: string, userId: string, file: File): Promise<ApiResponse<{ avatar: string }>> =>
    api.upload(`/users/profile/avatar`, file, 'avatar'),

  changePassword: (organizationId: string, userId: string, currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/users/profile/change-password', { currentPassword, newPassword }),

  findById: (id: string): Promise<ApiResponse<User>> =>
    api.get(`/users/${id}`),

  update: (id: string, data: Partial<User>): Promise<ApiResponse<User>> =>
    api.patch(`/users/${id}`, data),

  updateRole: (id: string, role: string): Promise<ApiResponse<User>> =>
    api.patch(`/users/${id}/role`, { role }),

  updateStatus: (id: string, isActive: boolean): Promise<ApiResponse<User>> =>
    api.patch(`/users/${id}/status`, isActive),

  remove: (id: string): Promise<void> =>
    api.delete(`/users/${id}`),
};