import api from '../services/api';

export const reportsApi = {
  getSalesReport: (params?: Record<string, any>) =>
    api.get('/reports/sales', { params }),

  getRevenueReport: (params?: Record<string, any>) =>
    api.get('/reports/revenue', { params }),

  getClientReport: (params?: Record<string, any>) =>
    api.get('/reports/clients', { params }),

  getLeadReport: (params?: Record<string, any>) =>
    api.get('/reports/leads', { params }),

  getEmployeeReport: (params?: Record<string, any>) =>
    api.get('/reports/employees', { params }),

  exportReport: (type: string, format: string, params?: Record<string, any>) =>
    api.get(`/reports/export/${type}`, { params: { ...params, format }, responseType: format === 'csv' ? 'blob' : 'json' }),
};
