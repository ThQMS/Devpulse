import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BellRing, Activity } from 'lucide-react';
import clsx from 'clsx';
import type { WsStatus } from '../../hooks/useWebSocket.js';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/alerts', label: 'Alertas', icon: BellRing, end: false },
];

const WS_LABEL: Record<WsStatus, string> = {
  connecting: 'Conectando…',
  connected: 'Conectado',
  disconnected: 'Desconectado',
};

export function Sidebar({ wsStatus }: { wsStatus: WsStatus }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Activity size={22} className="sidebar-brand-icon" />
        <span>DevPulse</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'sidebar-link-active')}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={clsx('sidebar-ws', `sidebar-ws--${wsStatus}`)}>
        <span className="sidebar-ws__dot" />
        {WS_LABEL[wsStatus]}
      </div>
    </aside>
  );
}
