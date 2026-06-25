import { useState, KeyboardEvent } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check } from 'lucide-react';
import { Badge } from '../ui/Badge.js';
import { Button } from '../ui/Button.js';
import { useAcknowledgeAlert } from '../../hooks/useAlerts.js';
import type { Alert, AlertSeverity } from '../../types/index.js';

const TONE: Record<AlertSeverity, 'danger' | 'warning'> = {
  critical: 'danger',
  warning: 'warning',
};

export function AlertItem({ alert }: { alert: Alert }) {
  const acknowledge = useAcknowledgeAlert();
  const acknowledged = alert.acknowledgedAt !== null;
  const [acking, setAcking] = useState(false);
  const [by, setBy] = useState('');

  const confirm = () => {
    acknowledge.mutate(
      { alertId: alert.id, acknowledgedBy: by.trim() || 'operator' },
      { onSuccess: () => setAcking(false) },
    );
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') confirm();
    if (e.key === 'Escape') setAcking(false);
  };

  return (
    <div className="alert-item">
      <div className="alert-item-info">
        <div className="alert-item-head">
          <Badge tone={TONE[alert.severity]}>{alert.severity}</Badge>
          <span className="alert-item-service">{alert.serviceName}</span>
        </div>
        <p className="alert-item-message">{alert.message}</p>
        <span className="alert-item-time">
          {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
          {acknowledged && alert.acknowledgedBy && ` · reconhecido por ${alert.acknowledgedBy}`}
        </span>
      </div>

      {!acknowledged &&
        (acking ? (
          <input
            className="ack-input"
            placeholder="Reconhecido por:"
            value={by}
            onChange={(e) => setBy(e.target.value)}
            onKeyDown={onKey}
            disabled={acknowledge.isPending}
            autoFocus
          />
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setAcking(true)}>
            <Check size={14} /> Reconhecer
          </Button>
        ))}
    </div>
  );
}
