import api from '../services/api';

export const healthApi = {
  check: () => api.get('/health'),
  live: () => api.get('/health/live'),
  ready: () => api.get('/health/ready'),
  // Direct fetch without auth wrapper for quick status (bypasses interceptors)
  ping: async () => {
    const base = import.meta.env.VITE_API_URL || '/api/v1';
    try {
      const res = await fetch(`${base}/health`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (e: any) {
      return { ok: false, status: 0, error: e.message };
    }
  },
};
