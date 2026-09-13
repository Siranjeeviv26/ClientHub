import api from '../services/api';
import { ApiResponse } from '../types';

export interface RoleInfo {
  _id?: string;
  value: string;
  label: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
}

export const rolesApi = {
  getAll: (): Promise<ApiResponse<RoleInfo[]>> =>
    api.get('/roles'),

  getPermissions: (role: string): Promise<ApiResponse<{ role: string; permissions: string[] }>> =>
    api.get(`/roles/${role}/permissions`),

  create: (data: { name: string; label: string; description?: string; permissions: string[] }): Promise<ApiResponse<RoleInfo>> =>
    api.post('/roles', data),

  update: (role: string, data: { label?: string; description?: string; permissions?: string[] }): Promise<ApiResponse<RoleInfo>> =>
    api.patch(`/roles/${role}`, data),

  delete: (role: string): Promise<ApiResponse<{ message: string }>> =>
    api.delete(`/roles/${role}`),
};
