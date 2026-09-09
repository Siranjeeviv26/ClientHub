import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { AuthTokens, ApiError, User, Organization, OrganizationMember, OrganizationInvitation, Client, Lead, Deal, Task, Activity, Notification, DashboardStats, ClientGrowthData, LeadConversionData, PipelineData, RevenueData, UpcomingFollowUp } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            const wasLoggedIn = !!localStorage.getItem('refreshToken');
            this.clearAuth();
            if (wasLoggedIn) {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshTokenPromise = (async () => {
      try {
        const response = await axios.post<{ data: AuthTokens }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        return accessToken;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
  }

  private unwrapResponse<T>(response: any): { success: boolean; data: T; message?: string } {
    const data = response.data;
    if (data && typeof data === 'object' && 'success' in data) {
      return data as { success: boolean; data: T; message?: string };
    }
    return { success: true, data: data as T };
  }

  async get<T>(url: string, params?: Record<string, any>) {
    const response = await this.client.get(url, { params });
    return this.unwrapResponse(response);
  }

  async post<T>(url: string, data?: any) {
    const response = await this.client.post(url, data);
    return this.unwrapResponse(response);
  }

  async patch<T>(url: string, data?: any) {
    const response = await this.client.patch(url, data);
    return this.unwrapResponse(response);
  }

  async put<T>(url: string, data?: any) {
    const response = await this.client.put(url, data);
    return this.unwrapResponse(response);
  }

  async delete<T>(url: string) {
    const response = await this.client.delete(url);
    return this.unwrapResponse(response);
  }

  async upload<T>(url: string, file: File, fieldName = 'file', additionalData?: Record<string, any>) {
    const formData = new FormData();
    formData.append(fieldName, file);
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const response = await this.client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return this.unwrapResponse(response);
  }

  setAuth(tokens: AuthTokens) {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  logout() {
    this.clearAuth();
  }

  async login(credentials: { email: string; password: string }) {
    return this.post<{ data: AuthTokens }>('/auth/login', credentials);
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string; organizationName?: string }) {
    return this.post<{ data: { user: Partial<User>; organizationId: string } }>('/auth/register', data);
  }

  async logoutApi() {
    return this.post('/auth/logout');
  }

  async refresh(refreshToken: string) {
    return this.post<{ data: AuthTokens }>('/auth/refresh', { refreshToken });
  }

  async verifyEmail(token: string) {
    return this.post('/auth/verify-email', { token });
  }

  async resendVerification(email: string) {
    return this.post('/auth/resend-verification', { email });
  }

  async forgotPassword(email: string) {
    return this.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post('/auth/reset-password', { token, password });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.post('/auth/change-password', { currentPassword, newPassword });
  }

  async getProfile() {
    return this.get<{ data: User }>('/auth/me');
  }

  async getOrganizations() {
    return this.get<{ data: Organization[] }>('/organizations');
  }

  async getOrganization(id: string) {
    return this.get<{ data: Organization }>(`/organizations/${id}`);
  }

  async createOrganization(data: { name: string; slug?: string }) {
    return this.post<{ data: Organization }>('/organizations', data);
  }

  async updateOrganization(id: string, data: Partial<Organization>) {
    return this.patch<{ data: Organization }>(`/organizations/${id}`, data);
  }

  async deleteOrganization(id: string) {
    return this.delete(`/organizations/${id}`);
  }

  async getMembers() {
    return this.get<{ data: OrganizationMember[] }>('/organizations/members');
  }

  async inviteMember(data: { email: string; role: string }) {
    return this.post<{ data: OrganizationInvitation }>('/organizations/members/invite', data);
  }

  async updateMember(userId: string, role: string) {
    return this.patch<{ data: OrganizationMember }>(`/organizations/members/${userId}`, { role });
  }

  async updateMemberStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.patch<{ data: OrganizationMember }>(`/organizations/members/${userId}/status`, { status });
  }

  async removeMember(userId: string) {
    return this.delete(`/organizations/members/${userId}`);
  }

  async getInvitations() {
    return this.get<{ data: OrganizationInvitation[] }>('/organizations/invitations');
  }

  async cancelInvitation(invitationId: string) {
    return this.delete(`/organizations/invitations/${invitationId}`);
  }

  async acceptInvitation(token: string) {
    return this.post<{ data: { message: string; organizationId: string } }>('/organizations/invitations/accept', { token });
  }

  async uploadLogo(file: File) {
    return this.upload<{ data: { logo: string } }>('/organizations/logo', file, 'logo');
  }

  async deleteLogo() {
    return this.delete('/organizations/logo');
  }

  async getSettings() {
    return this.get<{ data: any }>('/organizations/settings');
  }

  async getUsers(params?: any) {
    return this.get<{ data: { items: User[]; pagination: any } }>('/users', { params });
  }

  async getUser(id: string) {
    return this.get<{ data: User }>(`/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.patch<{ data: User }>(`/users/${id}`, data);
  }

  async updateUserRole(id: string, role: string) {
    return this.patch<{ data: User }>(`/users/${id}/role`, { role });
  }

  async updateUserStatus(id: string, isActive: boolean) {
    return this.patch<{ data: User }>(`/users/${id}/status`, isActive);
  }

  async removeUser(id: string) {
    return this.delete(`/users/${id}`);
  }

  async updateProfile(data: Partial<User>) {
    return this.patch<{ data: User }>('/users/profile', data);
  }

  async uploadAvatar(file: File) {
    return this.upload<{ data: { avatar: string } }>('/users/profile/avatar', file, 'avatar');
  }

  async getClients(params?: any) {
    return this.get<{ data: { items: Client[]; pagination: any } }>('/clients', { params });
  }

  async getClient(id: string) {
    return this.get<{ data: Client }>(`/clients/${id}`);
  }

  async createClient(data: Partial<Client>) {
    return this.post<{ data: Client }>('/clients', data);
  }

  async updateClient(id: string, data: Partial<Client>) {
    return this.patch<{ data: Client }>(`/clients/${id}`, data);
  }

  async deleteClient(id: string) {
    return this.delete(`/clients/${id}`);
  }

  async getClientDeals(id: string) {
    return this.get<{ data: Deal[] }>(`/clients/${id}/deals`);
  }

  async getClientTasks(id: string) {
    return this.get<{ data: Task[] }>(`/clients/${id}/tasks`);
  }

  async getClientActivities(id: string, params?: any) {
    return this.get<{ data: { items: Activity[]; pagination: any } }>(`/clients/${id}/activities`, { params });
  }

  async addClientNote(id: string, note: string) {
    return this.post<{ data: Client }>(`/clients/${id}/notes`, { note });
  }

  async getLeads(params?: any) {
    return this.get<{ data: { items: Lead[]; pagination: any } }>('/leads', { params });
  }

  async getLeadPipeline() {
    return this.get<{ data: { stage: string; leads: Lead[]; count: number; totalValue: number }[] }>('/leads/pipeline');
  }

  async getLead(id: string) {
    return this.get<{ data: Lead }>(`/leads/${id}`);
  }

  async createLead(data: Partial<Lead>) {
    return this.post<{ data: Lead }>('/leads', data);
  }

  async updateLead(id: string, data: Partial<Lead>) {
    return this.patch<{ data: Lead }>(`/leads/${id}`, data);
  }

  async convertLead(id: string) {
    return this.post<{ data: { lead: Lead; clientId: string } }>(`/leads/${id}/convert`);
  }

  async deleteLead(id: string) {
    return this.delete(`/leads/${id}`);
  }

  async getLeadActivities(id: string, params?: any) {
    return this.get<{ data: { items: Activity[]; pagination: any } }>(`/leads/${id}/activities`, { params });
  }

  async getDeals(params?: any) {
    return this.get<{ data: { items: Deal[]; pagination: any } }>('/deals', { params });
  }

  async getDealPipeline() {
    return this.get<{ data: { stage: string; deals: Deal[]; count: number; totalValue: number; weightedValue: number }[] }>('/deals/pipeline');
  }

  async getDeal(id: string) {
    return this.get<{ data: Deal }>(`/deals/${id}`);
  }

  async createDeal(data: Partial<Deal>) {
    return this.post<{ data: Deal }>('/deals', data);
  }

  async updateDeal(id: string, data: Partial<Deal>) {
    return this.patch<{ data: Deal }>(`/deals/${id}`, data);
  }

  async updateDealStage(id: string, stage: string) {
    return this.patch<{ data: Deal }>(`/deals/${id}/stage`, { stage });
  }

  async deleteDeal(id: string) {
    return this.delete(`/deals/${id}`);
  }

  async getDealActivities(id: string, params?: any) {
    return this.get<{ data: { items: Activity[]; pagination: any } }>(`/deals/${id}/activities`, { params });
  }

  async getTasks(params?: any) {
    return this.get<{ data: { items: Task[]; pagination: any } }>('/tasks', { params });
  }

  async getOverdueTasks() {
    return this.get<{ data: Task[] }>('/tasks/overdue');
  }

  async getUpcomingTasks(days?: number) {
    return this.get<{ data: Task[] }>('/tasks/upcoming', { params: { days } });
  }

  async getTask(id: string) {
    return this.get<{ data: Task }>(`/tasks/${id}`);
  }

  async createTask(data: Partial<Task>) {
    return this.post<{ data: Task }>('/tasks', data);
  }

  async updateTask(id: string, data: Partial<Task>) {
    return this.patch<{ data: Task }>(`/tasks/${id}`, data);
  }

  async deleteTask(id: string) {
    return this.delete(`/tasks/${id}`);
  }

  async getRecentActivities(limit?: number) {
    return this.get<{ data: Activity[] }>('/activities', { params: { limit } });
  }

  async getMyActivities(params?: any) {
    return this.get<{ data: { items: Activity[]; pagination: any } }>('/activities/my', { params });
  }

  async getEntityActivities(relatedType: string, relatedId: string, params?: any) {
    return this.get<{ data: { items: Activity[]; pagination: any } }>(`/activities/${relatedType}/${relatedId}`, { params });
  }

  async logActivity(data: { type: string; title: string; description?: string; relatedType: string; relatedId: string; metadata?: Record<string, any> }) {
    return this.post<{ data: Activity }>('/activities', data);
  }

  async getNotifications(params?: any) {
    return this.get('/notifications', { params });
  }

  async getUnreadCount() {
    return this.get('/notifications/unread-count');
  }

  async markNotificationAsRead(id: string) {
    return this.patch<{ data: Notification }>(`/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.patch('/notifications/read-all');
  }

  async getStats() {
    return this.get<{ data: DashboardStats }>('/dashboard/stats');
  }

  async getClientGrowth(months?: number) {
    return this.get<{ data: ClientGrowthData[] }>('/dashboard/charts/client-growth', { params: { months } });
  }

  async getLeadConversion(months?: number) {
    return this.get<{ data: LeadConversionData[] }>('/dashboard/charts/lead-conversion', { params: { months } });
  }

  async getSalesPipeline() {
    return this.get<{ data: PipelineData[] }>('/dashboard/charts/sales-pipeline');
  }

  async getRevenue(months?: number) {
    return this.get<{ data: RevenueData[] }>('/dashboard/charts/revenue', { params: { months } });
  }

  async getUpcomingFollowUps(limit?: number) {
    return this.get<{ data: UpcomingFollowUp[] }>('/dashboard/upcoming-followups', { params: { limit } });
  }

  async getRoles() {
    return this.get<{ data: { value: string; label: string; permissions: string[] }[] }>('/roles');
  }

  async getRolePermissions(role: string) {
    return this.get<{ data: { role: string; permissions: string[] } }>(`/roles/${role}/permissions`);
  }
}

export const api = new ApiService();
export default api;