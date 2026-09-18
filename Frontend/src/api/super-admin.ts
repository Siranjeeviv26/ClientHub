import api from '../services/api';

export const superAdminApi = {
  getOrganizations: (params?: Record<string, any>) =>
    api.get('/super-admin/organizations', params),

  getOrganization: (id: string) =>
    api.get(`/super-admin/organizations/${id}`),

  createOrganization: (data: { name: string; slug?: string; adminEmail: string; adminFirstName: string; adminLastName: string; adminPassword: string; planSlug?: string }) =>
    api.post('/super-admin/organizations', data),

  suspendOrganization: (id: string) =>
    api.patch(`/super-admin/organizations/${id}/suspend`),

  activateOrganization: (id: string) =>
    api.patch(`/super-admin/organizations/${id}/activate`),

  getUsers: (params?: Record<string, any>) =>
    api.get('/super-admin/users', params),

  getUser: (id: string) =>
    api.get(`/super-admin/users/${id}`),

  getRoles: () =>
    api.get('/super-admin/roles'),

  createRole: (data: { name: string; label: string; description?: string; permissions: string[] }) =>
    api.post('/super-admin/roles', data),

  updateRole: (name: string, data: { label?: string; description?: string; permissions?: string[] }) =>
    api.patch(`/super-admin/roles/${name}`, data),

  deleteRole: (name: string) =>
    api.delete(`/super-admin/roles/${name}`),

  suspendUser: (id: string) =>
    api.patch(`/super-admin/users/${id}/suspend`),

  activateUser: (id: string) =>
    api.patch(`/super-admin/users/${id}/activate`),

  getSubscriptions: (params?: Record<string, any>) =>
    api.get('/super-admin/subscriptions', params),

  getSubscriptionDetails: (orgId: string) =>
    api.get(`/super-admin/subscriptions/${orgId}`),

  getPlatformAnalytics: () =>
    api.get('/super-admin/analytics'),

  getAuditLogs: (params?: Record<string, any>) =>
    api.get('/super-admin/audit-logs', params),

  getPlans: () =>
    api.get('/super-admin/plans'),

  createPlan: (data: Record<string, any>) =>
    api.post('/super-admin/plans', data),

  updatePlan: (id: string, data: Record<string, any>) =>
    api.patch(`/super-admin/plans/${id}`, data),

  deletePlan: (id: string) =>
    api.delete(`/super-admin/plans/${id}`),

  assignPlanToOrg: (planId: string, orgId: string) =>
    api.post(`/super-admin/plans/${planId}/assign/${orgId}`),

  getPayments: (params?: Record<string, any>) =>
    api.get('/super-admin/payments', params),

  getPlanPayments: (params?: Record<string, any>) =>
    api.get('/super-admin/payments/plans', params),

  getSystemSettings: () =>
    api.get('/super-admin/settings'),

  updateSystemSettings: (data: Record<string, any>) =>
    api.patch('/super-admin/settings', data),

  getPublicPlans: () =>
    api.get('/public/plans'),
};
