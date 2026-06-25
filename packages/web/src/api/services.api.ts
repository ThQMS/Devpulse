import { apiClient, unwrap } from './client.js';
import type {
  Alert,
  Service,
  ServiceWithStats,
  ServiceDetail,
  CheckResult,
  HistoryPoint,
  CreateServiceInput,
  PaginatedResponse,
} from '../types/index.js';

export interface ServiceFilters {
  groupName?: string;
  status?: Service['status'];
  tag?: string;
}

export const servicesApi = {
  async getServices(filters?: ServiceFilters): Promise<ServiceWithStats[]> {
    const res = await apiClient.get<{ data: ServiceWithStats[] }>('/api/v1/services', {
      params: filters,
    });
    return unwrap(res.data);
  },

  async getService(id: string): Promise<ServiceDetail> {
    const res = await apiClient.get<{ data: ServiceDetail }>(`/api/v1/services/${id}`);
    return unwrap(res.data);
  },

  async createService(params: CreateServiceInput): Promise<Service> {
    const res = await apiClient.post<{ data: Service }>('/api/v1/services', params);
    return unwrap(res.data);
  },

  async updateService(id: string, params: Partial<CreateServiceInput>): Promise<Service> {
    const res = await apiClient.put<{ data: Service }>(`/api/v1/services/${id}`, params);
    return unwrap(res.data);
  },

  async deleteService(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/services/${id}`);
  },

  async checkNow(id: string): Promise<CheckResult> {
    const res = await apiClient.post<{ data: CheckResult }>(`/api/v1/services/${id}/check-now`);
    return unwrap(res.data);
  },

  async silenceService(id: string, durationMinutes: number): Promise<Service> {
    const res = await apiClient.post<{ data: Service }>(`/api/v1/services/${id}/silence`, {
      durationMinutes,
    });
    return unwrap(res.data);
  },

  async resumeService(id: string): Promise<Service> {
    const res = await apiClient.post<{ data: Service }>(`/api/v1/services/${id}/resume`);
    return unwrap(res.data);
  },

  async getHistory(id: string, hours: number, points: number): Promise<HistoryPoint[]> {
    const res = await apiClient.get<{ data: HistoryPoint[] }>(`/api/v1/stats/${id}/history`, {
      params: { hours, points },
    });
    return unwrap(res.data);
  },

  async getChecks(
    id: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResponse<CheckResult>> {
    const res = await apiClient.get<{ data: PaginatedResponse<CheckResult> }>(
      `/api/v1/services/${id}/checks`,
      { params: { limit, offset } },
    );
    return unwrap(res.data);
  },

  async getAlerts(id: string): Promise<Alert[]> {
    const res = await apiClient.get<{ data: Alert[] }>(`/api/v1/services/${id}/alerts`);
    return unwrap(res.data);
  },
};
