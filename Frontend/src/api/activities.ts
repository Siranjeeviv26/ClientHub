import api from '../services/api';
import { Activity, ActivityType, PaginatedResponse, ApiResponse } from '../types';

export const activitiesApi = {
  getRecent: (limit?: number): Promise<ApiResponse<Activity[]>> =>
    api.get('/activities', { limit }),

  getMyActivities: (params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Activity>>> =>
    api.get('/activities/my', params),

  getEntityActivities: (
    relatedType: 'client' | 'lead' | 'deal' | 'task',
    relatedId: string,
    params?: { page?: number; limit?: number }
  ): Promise<ApiResponse<PaginatedResponse<Activity>>> =>
    api.get(`/activities/${relatedType}/${relatedId}`, params),

  logActivity: (data: {
    type: ActivityType;
    title: string;
    description?: string;
    relatedType: 'client' | 'lead' | 'deal' | 'task';
    relatedId: string;
    metadata?: Record<string, any>;
  }): Promise<ApiResponse<Activity>> =>
    api.post('/activities', data),
};