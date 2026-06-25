import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  TooltipProps,
} from 'recharts';
import { format } from 'date-fns';
import type { HistoryPoint } from '../../types/index.js';

const ACCENT = '#6366f1';

interface LatencyChartProps {
  history: HistoryPoint[];
  height?: number;
}

export function LatencyChart({ history, height = 200 }: LatencyChartProps) {
  const data = history.map((p) => ({
    time: new Date(p.timestamp).getTime(),
    latency: p.avgLatencyMs,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="time"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t) => format(new Date(t), 'HH:mm')}
          stroke="#94a3b8"
          fontSize={12}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={12}
          width={48}
          tickFormatter={(v: number) => `${Math.round(v)}`}
        />
        <Tooltip content={<LatencyTooltip />} />
        <Area
          type="monotone"
          dataKey="latency"
          stroke={ACCENT}
          strokeWidth={2}
          fill={ACCENT}
          fillOpacity={0.15}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LatencyTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as { time: number; latency: number | null };
  return (
    <div className="chart-tooltip">
      {point.latency === null || point.latency === undefined
        ? 'Sem dados'
        : `${format(new Date(point.time), 'HH:mm')} — ${point.latency}ms`}
    </div>
  );
}
