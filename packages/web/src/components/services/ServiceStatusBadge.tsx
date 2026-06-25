import clsx from 'clsx';
import type { CheckStatus } from '../../types/index.js';

const LABEL: Record<CheckStatus, string> = {
  up: 'Online',
  down: 'Offline',
  timeout: 'Timeout',
  unknown: 'Desconhecido',
};

interface ServiceStatusBadgeProps {
  status: CheckStatus;
  size?: 'sm' | 'md';
}

export function ServiceStatusBadge({ status, size = 'md' }: ServiceStatusBadgeProps) {
  return (
    <span className={clsx('svc-badge', size === 'sm' && 'svc-badge--sm')} data-status={status}>
      <span className="svc-badge__dot" />
      {LABEL[status]}
    </span>
  );
}
