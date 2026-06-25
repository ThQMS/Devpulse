import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { BarChart2, CheckCircle, XCircle, Bell } from 'lucide-react';
import clsx from 'clsx';
import { useServicesStore } from '../../store/services.store.js';
import { useAlertsStore } from '../../store/alerts.store.js';

/** Real-time overview, driven entirely by the Zustand stores. */
export function OverviewCards() {
  const counts = useServicesStore((s) => s.counts);
  const openAlerts = useAlertsStore((s) => s.activeAlerts.length);
  const total = counts.up + counts.down + counts.unknown;

  return (
    <div className="ov-cards">
      <Card icon={<BarChart2 size={22} />} label="Total" value={total} />
      <Card icon={<CheckCircle size={22} />} label="Online" value={counts.up} tone="up" />
      <Card icon={<XCircle size={22} />} label="Offline" value={counts.down} tone="down" />
      <Card
        icon={<Bell size={22} />}
        label="Alertas"
        value={openAlerts}
        tone={openAlerts > 0 ? 'warn' : undefined}
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: 'up' | 'down' | 'warn';
}) {
  const displayValue = useCountUp(value);

  return (
    <div className="ov-card">
      <div className={clsx('ov-card__icon', tone && `ov-card__icon--${tone}`)}>{icon}</div>
      <div className="ov-card__body">
        <span className={clsx('ov-card__num', tone && `ov-card__num--${tone}`)}>
          {displayValue}
        </span>
        <span className="ov-card__label">{label}</span>
      </div>
    </div>
  );
}

function useCountUp(value: number): number {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;

    const start = previous.current;
    const delta = value - start;
    const duration = 450;
    const startedAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(start + delta * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    previous.current = value;
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return display;
}
