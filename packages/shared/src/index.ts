export type CheckStatus = 'up' | 'down' | 'timeout' | 'unknown';
export type ServiceStatus = 'active' | 'paused' | 'silenced';
export type AlertSeverity = 'warning' | 'critical';

export interface ServiceDto {
  id: string;
  name: string;
  url: string;
  checkIntervalSecs: number;
  groupName: string;
  tags: string[];
  expectedStatusCode: number;
  timeoutMs: number;
  status: ServiceStatus;
  lastCheckAt: string | null;
  lastCheckStatus: CheckStatus;
  silencedUntil: string | null;
  createdAt: string;
}

export interface ServiceWithStatsDto extends ServiceDto {
  uptimePercentage24h: number;
  avgLatencyMs24h: number | null;
}

export interface ServiceDetailDto extends ServiceWithStatsDto {
  uptimePercentage7d: number;
  totalChecks24h: number;
  lastError: string | null;
  recentChecks: CheckResultDto[];
}

export interface CheckResultDto {
  id: string;
  serviceId: string;
  status: CheckStatus;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface AlertDto {
  id: string;
  serviceId: string;
  serviceName: string;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export interface DashboardOverviewDto {
  total: number;
  up: number;
  down: number;
  silenced: number;
  openAlerts: number;
}

export interface HistoryPointDto {
  timestamp: string;
  uptimePercentage: number;
  avgLatencyMs: number | null;
}

export interface CheckResultPayload {
  serviceId: string;
  status: CheckStatus;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export type WsMessage =
  | { type: 'CHECK_RESULT'; payload: CheckResultPayload }
  | { type: 'ALERT_CREATED'; payload: AlertDto }
  | { type: 'SERVICE_UPDATED'; payload: ServiceDto }
  | { type: 'PING'; payload: { timestamp: number } };

export interface CreateServiceInput {
  name: string;
  url: string;
  checkIntervalSeconds: number;
  groupName?: string;
  tags?: string[];
  expectedStatusCode?: number;
  timeoutMs?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
