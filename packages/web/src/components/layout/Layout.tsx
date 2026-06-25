import { ReactNode } from 'react';
import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { AlertBanner } from '../alerts/AlertBanner.js';
import type { WsStatus } from '../../hooks/useWebSocket.js';

export function Layout({ children, wsStatus }: { children: ReactNode; wsStatus: WsStatus }) {
  return (
    <div className="layout">
      <Sidebar wsStatus={wsStatus} />
      <div className="layout-main">
        <Header />
        <AlertBanner />
        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
}
