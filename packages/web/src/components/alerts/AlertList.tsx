import { BellRing } from 'lucide-react';
import { AlertItem } from './AlertItem.js';
import { EmptyState } from '../ui/EmptyState.js';
import type { Alert } from '../../types/index.js';

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<BellRing size={40} />}
        title="All clear"
        description="No alerts to show. Everything looks healthy."
      />
    );
  }

  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
