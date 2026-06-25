import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useServices } from '../hooks/useServices.js';
import { useServicesStore } from '../store/services.store.js';
import { OverviewCards } from '../components/dashboard/OverviewCards.js';
import { ServiceList } from '../components/services/ServiceList.js';
import { Spinner } from '../components/ui/Spinner.js';
import type { ServiceWithStats } from '../types/index.js';

type Tab = 'all' | 'online' | 'offline' | 'silenced';

export function DashboardPage() {
  const query = useServices();
  const liveStatus = useServicesStore((s) => s.liveStatus);
  const [tab, setTab] = useState<Tab>('all');
  const [groupFilter, setGroupFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const services = useMemo(() => query.data ?? [], [query.data]);
  const groups = useMemo(
    () => Array.from(new Set(services.map((s) => s.groupName))).sort((a, b) => a.localeCompare(b)),
    [services],
  );
  const tags = useMemo(
    () => Array.from(new Set(services.flatMap((s) => s.tags))).sort((a, b) => a.localeCompare(b)),
    [services],
  );

  const filteredServices = useMemo(
    () =>
      services.filter((s) => {
        const groupOk = !groupFilter || s.groupName === groupFilter;
        const tagOk = !tagFilter || s.tags.includes(tagFilter);
        return groupOk && tagOk;
      }),
    [services, groupFilter, tagFilter],
  );

  const health = (s: ServiceWithStats) => liveStatus.get(s.id)?.status ?? s.lastCheckStatus;

  const buckets = useMemo(() => {
    const all = filteredServices;
    const online = filteredServices.filter((s) => health(s) === 'up');
    const offline = filteredServices.filter((s) => ['down', 'timeout'].includes(health(s)));
    const silenced = filteredServices.filter((s) => s.status === 'silenced');
    return { all, online, offline, silenced };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredServices, liveStatus]);

  const TABS: { key: Tab; label: string; items: ServiceWithStats[] }[] = [
    { key: 'all', label: 'Todos', items: buckets.all },
    { key: 'online', label: 'Online', items: buckets.online },
    { key: 'offline', label: 'Offline', items: buckets.offline },
    { key: 'silenced', label: 'Silenciados', items: buckets.silenced },
  ];

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="page">
      <h1 className="page-title">Dashboard</h1>
      <OverviewCards />

      <div className="dashboard-filters">
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Todos os grupos</option>
          {groups.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">Todas as tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={clsx('tab', tab === t.key && 'tab--active')}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({t.items.length})
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="page-center">
          <Spinner size={32} />
        </div>
      ) : (
        <ServiceList services={active.items} />
      )}
    </div>
  );
}
