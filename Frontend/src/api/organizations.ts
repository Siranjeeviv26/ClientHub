import api from '../services/api';
import { Organization, OrganizationMember, OrganizationInvitation, ApiResponse, InviteMemberDto, UpdateOrganizationDto } from '../types';

export const organizationsApi = {
  // Organizations
  getAll: (): Promise<ApiResponse<Organization[]>> =>
    api.get('/organizations'),

  create: (data: { name: string; slug?: string }): Promise<ApiResponse<Organization>> =>
    api.post('/organizations', data),

  getById: (id: string): Promise<ApiResponse<Organization>> =>
    api.get(`/organizations/${id}`),

  update: (id: string, data: UpdateOrganizationDto): Promise<ApiResponse<Organization>> =>
    api.patch(`/organizations/${id}`, data),

  delete: (id: string, password: string): Promise<{ success: boolean; data: null }> =>
    api.delete(`/organizations/${id}`, { password }),

  // Members
  getMembers: (id: string): Promise<ApiResponse<OrganizationMember[]>> =>
    api.get(`/organizations/${id}/members`),

  inviteMember: (id: string, data: InviteMemberDto): Promise<ApiResponse<OrganizationInvitation>> =>
    api.post(`/organizations/${id}/members/invite`, data),

  updateMember: (id: string, userId: string, role: string): Promise<ApiResponse<OrganizationMember>> =>
    api.patch(`/organizations/${id}/members/${userId}`, { role }),

  updateMemberStatus: (id: string, userId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<ApiResponse<OrganizationMember>> =>
    api.patch(`/organizations/${id}/members/${userId}/status`, { status }),

  removeMember: (id: string, userId: string): Promise<{ success: boolean; data: null }> =>
    api.delete(`/organizations/${id}/members/${userId}`),

  // Invitations
  getInvitations: (id: string): Promise<ApiResponse<OrganizationInvitation[]>> =>
    api.get(`/organizations/${id}/invitations`),

  cancelInvitation: (id: string, invitationId: string): Promise<{ success: boolean; data: null }> =>
    api.delete(`/organizations/${id}/invitations/${invitationId}`),

  acceptInvitation: (token: string): Promise<ApiResponse<{ message: string; organizationId: string }>> =>
    api.post('/organizations/invitations/accept', { token }),

  // Logo
  uploadLogo: (id: string, file: File): Promise<ApiResponse<{ logo: string }>> =>
    api.upload(`/organizations/${id}/logo`, file, 'logo'),

  deleteLogo: (id: string): Promise<{ success: boolean; data: null }> =>
    api.delete(`/organizations/${id}/logo`),

  // Settings
  getSettings: (id: string): Promise<ApiResponse<any>> =>
    api.get(`/organizations/${id}/settings`),

  updateSettings: (id: string, data: Record<string, any>): Promise<ApiResponse<any>> =>
    api.patch(`/organizations/${id}/settings`, data),
};