import clsx from 'clsx';

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className={clsx('spinner')}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 10) }}
      role="status"
      aria-label="Loading"
    />
  );
}
