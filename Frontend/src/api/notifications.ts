import api from '../services/api';
import { Notification, PaginatedResponse, ApiResponse } from '../types';

export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; read?: boolean }): Promise<ApiResponse<PaginatedResponse<Notification>>> =>
    api.get('/notifications', params),

  getUnreadCount: (): Promise<ApiResponse<{ count: number }>> =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string): Promise<ApiResponse<Notification>> =>
    api.patch(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<ApiResponse<{ modifiedCount: number }>> =>
    api.patch('/notifications/read-all'),
};