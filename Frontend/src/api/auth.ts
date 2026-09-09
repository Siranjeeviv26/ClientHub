import api from '../services/api';
import { AuthTokens, LoginCredentials, RegisterData, User, ApiResponse } from '../types';

export const authApi = {
  login: (credentials: LoginCredentials): Promise<ApiResponse<AuthTokens>> =>
    api.post('/auth/login', credentials),

  register: (data: RegisterData): Promise<ApiResponse<{ user: Partial<User>; organizationId: string }>> =>
    api.post('/auth/register', data),

  logout: (): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/logout'),

  refresh: (refreshToken: string): Promise<ApiResponse<AuthTokens>> =>
    api.post('/auth/refresh', { refreshToken }),

  verifyEmail: (token: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/verify-email', { token }),

  resendVerification: (email: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/resend-verification', { email }),

  forgotPassword: (email: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  getProfile: (): Promise<ApiResponse<User>> =>
    api.get('/auth/me'),
};