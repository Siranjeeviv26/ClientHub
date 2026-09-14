import api from '../services/api';

export const superAdminApi = {
  getOrganizations: (params?: Record<string, any>) =>
    api.get('/super-admin/organizations', { params }),

  getOrganization: (id: string) =>
    api.get(`/super-admin/organizations/${id}`),

  suspendOrganization: (id: string) =>
    api.patch(`/super-admin/organizations/${id}/suspend`),

  activateOrganization: (id: string) =>
    api.patch(`/super-admin/organizations/${id}/activate`),

  getUsers: (params?: Record<string, any>) =>
    api.get('/super-admin/users', { params }),

  getUser: (id: string) =>
    api.get(`/super-admin/users/${id}`),

  suspendUser: (id: string) =>
    api.patch(`/super-admin/users/${id}/suspend`),

  activateUser: (id: string) =>
    api.patch(`/super-admin/users/${id}/activate`),

  getSubscriptions: (params?: Record<string, any>) =>
    api.get('/super-admin/subscriptions', { params }),

  getSubscriptionDetails: (orgId: string) =>
    api.get(`/super-admin/subscriptions/${orgId}`),

  getPlatformAnalytics: () =>
    api.get('/super-admin/analytics'),

  createOrganization: (data: { name: string; slug?: string }) =>
    api.post('/super-admin/organizations', data),

  getAuditLogs: (params?: Record<string, any>) =>
    api.get('/super-admin/audit-logs', { params }),

  getPlans: () =>
    api.get('/super-admin/plans'),
};
