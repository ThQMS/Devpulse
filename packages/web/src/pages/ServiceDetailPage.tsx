import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import {
  useService,
  useServiceHistory,
  useServiceChecks,
  useServiceAlerts,
  useCheckNow,
  useSilenceService,
  useResumeService,
  useDeleteService,
} from '../hooks/useServices.js';
import { useServicesStore } from '../store/services.store.js';
import { useAlertsStore } from '../store/alerts.store.js';
import { ServiceStatusBadge } from '../components/services/ServiceStatusBadge.js';
import { LatencyChart } from '../components/charts/LatencyChart.js';
import { Card, CardHeader, CardBody } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Spinner } from '../components/ui/Spinner.js';
import { AlertItem } from '../components/alerts/AlertItem.js';

const SILENCE_OPTIONS = [
  { label: '15min', minutes: 15 },
  { label: '1h', minutes: 60 },
  { label: '4h', minutes: 240 },
  { label: '24h', minutes: 1440 },
];

const CHECKS_LIMIT = 25;

export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [checksOffset, setChecksOffset] = useState(0);

  const serviceQuery = useService(id);
  const historyQuery = useServiceHistory(id, 24, 48);
  const checksQuery = useServiceChecks(id, CHECKS_LIMIT, checksOffset);
  const alertsQuery = useServiceAlerts(id);
  const live = useServicesStore((s) => s.liveStatus.get(id));
  const liveServiceAlerts = useAlertsStore((s) => s.activeAlerts.filter((a) => a.serviceId === id));

  const checkNow = useCheckNow();
  const silence = useSilenceService();
  const resume = useResumeService();
  const remove = useDeleteService();

  const service = serviceQuery.data;
  const points = historyQuery.data ?? [];
  const checksPage = checksQuery.data;
  const checks = checksPage?.items ?? service?.recentChecks ?? [];
  const serviceAlerts = alertsQuery.data ?? liveServiceAlerts;
  const health = live?.status ?? service?.lastCheckStatus ?? 'unknown';
  const canPageBack = checksOffset > 0;
  const canPageForward = Boolean(checksPage && checksOffset + checksPage.limit < checksPage.total);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} /> Voltar
      </Link>

      {serviceQuery.isLoading || !service ? (
        <div className="page-center">
          <Spinner size={32} />
        </div>
      ) : (
        <>
          <div className="page-header">
            <div className="detail-title">
              <h1 className="page-title">{service.name}</h1>
              <ServiceStatusBadge status={health} />
              <a className="detail-url" href={service.url}>
                {service.url}
              </a>
            </div>
            <div className="filter-group">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => checkNow.mutate(id)}
                disabled={checkNow.isPending}
              >
                <RefreshCw size={14} /> Checar agora
              </Button>
              {service.status === 'silenced' ? (
                <Button variant="secondary" size="sm" onClick={() => resume.mutate(id)}>
                  Retomar
                </Button>
              ) : (
                <select
                  className="silence-select"
                  defaultValue=""
                  onChange={(e) => {
                    const minutes = Number(e.target.value);
                    if (minutes) silence.mutate({ id, durationMinutes: minutes });
                    e.currentTarget.value = '';
                  }}
                >
                  <option value="" disabled>
                    Silenciar...
                  </option>
                  {SILENCE_OPTIONS.map((option) => (
                    <option key={option.minutes} value={option.minutes}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm(`Excluir ${service.name}?`)) {
                    remove.mutate(id, { onSuccess: () => navigate('/') });
                  }
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="stat-grid">
            <StatCard label="Uptime 24h" value={`${service.uptimePercentage24h.toFixed(2)}%`} />
            <StatCard label="Uptime 7d" value={`${service.uptimePercentage7d.toFixed(2)}%`} />
            <StatCard
              label="Latencia media"
              value={service.avgLatencyMs24h !== null ? `${service.avgLatencyMs24h}ms` : '-'}
            />
            <StatCard label="Checks (24h)" value={String(service.totalChecks24h)} />
            <StatCard label="Ultimo erro" value={service.lastError ?? '-'} />
          </div>

          <Card>
            <CardHeader>
              <h3>Latencia (24h)</h3>
            </CardHeader>
            <CardBody>
              <LatencyChart history={points} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="card-header-row">
                <h3>Historico de checks</h3>
                {checksPage && (
                  <span className="table-count">
                    {checksPage.total === 0
                      ? '0 registros'
                      : `${checksOffset + 1}-${Math.min(
                          checksOffset + checksPage.limit,
                          checksPage.total,
                        )} de ${checksPage.total}`}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Codigo</th>
                    <th>Latencia</th>
                    <th>Erro</th>
                    <th>Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr key={check.id}>
                      <td>
                        <span className={clsx('status-dot', `status-dot-${check.status}`)} />{' '}
                        {check.status}
                      </td>
                      <td>{check.statusCode ?? '-'}</td>
                      <td>{check.latencyMs !== null ? `${check.latencyMs}ms` : '-'}</td>
                      <td className="history-error">{check.error ?? '-'}</td>
                      <td title={format(new Date(check.checkedAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(check.checkedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                  {checks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="recent-check-empty">
                        Nenhum check ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="pagination-row">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canPageBack}
                  onClick={() => setChecksOffset(Math.max(0, checksOffset - CHECKS_LIMIT))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canPageForward}
                  onClick={() => setChecksOffset(checksOffset + CHECKS_LIMIT)}
                >
                  Proxima
                </Button>
              </div>
            </CardBody>
          </Card>

          {serviceAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <h3>Historico de alertas</h3>
              </CardHeader>
              <CardBody>
                <div className="alert-list">
                  {serviceAlerts.map((alert) => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="stat-card">
      <span className="stat-card-value">{value}</span>
      <span className="stat-card-label">{label}</span>
    </Card>
  );
}
