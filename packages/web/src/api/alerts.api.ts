import { apiClient, unwrap } from './client.js';
import type { Alert } from '../types/index.js';

export const alertsApi = {
  async getAlerts(status: 'open' | 'all' = 'open'): Promise<Alert[]> {
    const res = await apiClient.get<{ data: Alert[] }>('/api/v1/alerts', { params: { status } });
    return unwrap(res.data);
  },

  async acknowledge(alertId: string, acknowledgedBy: string): Promise<Alert> {
    const res = await apiClient.post<{ data: Alert }>(`/api/v1/alerts/${alertId}/acknowledge`, {
      acknowledgedBy,
    });
    return unwrap(res.data);
  },
};
