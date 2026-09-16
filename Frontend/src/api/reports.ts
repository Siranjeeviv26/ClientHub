import api from '../services/api';

export const reportsApi = {
  getSalesReport: (params?: Record<string, any>) =>
    api.get('/reports/sales', params),

  getRevenueReport: (params?: Record<string, any>) =>
    api.get('/reports/revenue', params),

  getClientReport: (params?: Record<string, any>) =>
    api.get('/reports/clients', params),

  getLeadReport: (params?: Record<string, any>) =>
    api.get('/reports/leads', params),

  getEmployeeReport: (params?: Record<string, any>) =>
    api.get('/reports/employees', params),

  exportReport: async (type: string, format: string, params?: Record<string, any>) => {
    const client = (api as any).client;
    if (client) {
      const response = await client.get(`/reports/export/${type}`, {
        params: { ...params, format },
        responseType: format === 'csv' ? 'blob' : 'json',
      });
      // response.data is Blob for csv, or { data, format } / { success, data } for json
      // Return it directly so caller can handle Blob vs JSON
      return response.data;
    }
    return api.get(`/reports/export/${type}`, { ...params, format });
  },
};
