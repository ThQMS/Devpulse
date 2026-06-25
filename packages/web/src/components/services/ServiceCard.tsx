import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { Button } from '../ui/Button.js';
import { ServiceStatusBadge } from './ServiceStatusBadge.js';
import { useServicesStore } from '../../store/services.store.js';
import type { ServiceWithStats } from '../../types/index.js';

export function ServiceCard({ service }: { service: ServiceWithStats }) {
  const navigate = useNavigate();
  const live = useServicesStore((s) => s.liveStatus.get(service.id));

  const health = live?.status ?? service.lastCheckStatus;
  const latencyMs = live?.latencyMs ?? service.avgLatencyMs24h;
  const lastCheckAt = live?.checkedAt ?? service.lastCheckAt;

  // Flash the card background for 500ms whenever the live status changes.
  const [flash, setFlash] = useState(false);
  const prevStatus = useRef(health);
  useEffect(() => {
    if (prevStatus.current !== health) {
      prevStatus.current = health;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 500);
      return () => clearTimeout(t);
    }
  }, [health]);

  return (
    <div className={clsx('svc-card', flash && 'svc-card--flash')} data-status={health}>
      <div className="svc-card__head">
        <h3 className="svc-card__name">{service.name}</h3>
        <ServiceStatusBadge status={health} size="sm" />
      </div>

      <a
        className="svc-card__url"
        href={service.url}
        target="_blank"
        rel="noreferrer"
        title={service.url}
      >
        {service.url}
      </a>

      <div className="svc-grid">
        <Metric label="Uptime 24h" value={`${service.uptimePercentage24h.toFixed(2)}%`} />
        <Metric label="Latência" value={latencyMs !== null ? `${latencyMs}ms` : '—'} />
        <Metric
          label="Último check"
          value={
            lastCheckAt ? formatDistanceToNow(new Date(lastCheckAt), { addSuffix: true }) : '—'
          }
        />
        <Metric label="Intervalo" value={`${service.checkIntervalSecs}s`} />
      </div>

      <div className="svc-card__footer">
        <div className="svc-tags">
          {service.tags.map((tag) => (
            <span key={tag} className="svc-tag">
              {tag}
            </span>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate(`/services/${service.id}`)}>
          Detalhes
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="svc-metric">
      <span className="svc-metric__label">{label}</span>
      <span className="svc-metric__value">{value}</span>
    </div>
  );
}
