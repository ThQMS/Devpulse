import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAlerts, useAllAlerts } from '../hooks/useAlerts.js';
import { AlertList } from '../components/alerts/AlertList.js';
import { Spinner } from '../components/ui/Spinner.js';
import type { Alert, AlertSeverity } from '../types/index.js';

type Tab = 'open' | 'history';

export function AlertsPage() {
  const [tab, setTab] = useState<Tab>('open');
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
  const [serviceId, setServiceId] = useState<string>('all');

  const open = useAlerts();
  const history = useAllAlerts();

  const source: Alert[] = useMemo(
    () => (tab === 'open' ? open.activeAlerts : (history.data ?? [])),
    [history.data, open.activeAlerts, tab],
  );
  const isLoading = tab === 'open' ? open.isLoading : history.isLoading;

  const services = useMemo(() => {
    const map = new Map<string, string>();
    source.forEach((alert) => map.set(alert.serviceId, alert.serviceName));
    return [...map.entries()];
  }, [source]);

  const filtered = source.filter(
    (alert) =>
      (severity === 'all' || alert.severity === severity) &&
      (serviceId === 'all' || alert.serviceId === serviceId),
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Alertas</h1>
      </div>

      <div className="tabs">
        <button
          className={clsx('tab', tab === 'open' && 'tab--active')}
          onClick={() => setTab('open')}
        >
          Abertos ({open.activeAlerts.length})
        </button>
        <button
          className={clsx('tab', tab === 'history' && 'tab--active')}
          onClick={() => setTab('history')}
        >
          Historico
        </button>
      </div>

      <div className="filter-group">
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as AlertSeverity | 'all')}
        >
          <option value="all">Toda severidade</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
        </select>
        <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
          <option value="all">Todos os servicos</option>
          {services.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="page-center">
          <Spinner size={32} />
        </div>
      ) : (
        <AlertList alerts={filtered} />
      )}
    </div>
  );
}
