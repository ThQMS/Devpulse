import { ReactNode } from 'react';
import clsx from 'clsx';

interface BadgeProps {
  tone?: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={clsx('badge', `badge-${tone}`)}>{children}</span>;
}
