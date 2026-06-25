import { v4 as uuid } from 'uuid';

export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly triggeredAt: Date;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
}

export interface CreateAlertParams {
  serviceId: string;
  serviceName: string;
  severity: AlertSeverity;
  message: string;
  triggeredAt?: Date;
}

export function createAlert(params: CreateAlertParams): Alert {
  return {
    id: uuid(),
    serviceId: params.serviceId,
    serviceName: params.serviceName,
    severity: params.severity,
    message: params.message,
    triggeredAt: params.triggeredAt ?? new Date(),
    acknowledgedAt: null,
    acknowledgedBy: null,
  };
}

export function alertToJSON(alert: Alert) {
  return {
    id: alert.id,
    serviceId: alert.serviceId,
    serviceName: alert.serviceName,
    severity: alert.severity,
    message: alert.message,
    triggeredAt: alert.triggeredAt.toISOString(),
    acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
    acknowledgedBy: alert.acknowledgedBy,
  };
}
