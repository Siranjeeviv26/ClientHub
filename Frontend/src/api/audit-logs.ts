import api from '../services/api';

export const auditLogsApi = {
  getLogs: (params?: Record<string, any>) =>
    api.get('/audit-logs', { params }),

  getLog: (id: string) =>
    api.get(`/audit-logs/${id}`),
};
