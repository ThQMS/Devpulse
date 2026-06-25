import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ServiceDetailPage } from './pages/ServiceDetailPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { useAlerts } from './hooks/useAlerts.js';
import { useServices } from './hooks/useServices.js';

export function App() {
  // Single live connection feeding all stores.
  const { wsStatus } = useWebSocket();
  // Keep services + open alerts loaded app-wide (header badges, sidebar, etc.).
  useServices();
  useAlerts();

  return (
    <Layout wsStatus={wsStatus}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Routes>
    </Layout>
  );
}
