import { format } from 'date-fns';
import clsx from 'clsx';
import type { HistoryPoint } from '../../types/index.js';

function tone(uptime: number): 'up' | 'degraded' | 'down' {
  if (uptime >= 99) return 'up';
  if (uptime >= 90) return 'degraded';
  return 'down';
}

/**
 * Compact "status bar" uptime visualisation — one cell per time bucket, oldest
 * to newest, coloured by the bucket's uptime percentage.
 */
export function UptimeChart({ points }: { points: HistoryPoint[] }) {
  if (points.length === 0) {
    return <p className="uptime-empty">No checks recorded yet.</p>;
  }

  return (
    <div className="uptime-chart">
      {points.map((p) => (
        <span
          key={p.timestamp}
          className={clsx('uptime-cell', `uptime-cell-${tone(p.uptimePercentage)}`)}
          title={`${p.uptimePercentage.toFixed(2)}% · ${format(new Date(p.timestamp), 'PPpp')}${
            p.avgLatencyMs !== null ? ` · ${p.avgLatencyMs}ms` : ''
          }`}
        />
      ))}
    </div>
  );
}
