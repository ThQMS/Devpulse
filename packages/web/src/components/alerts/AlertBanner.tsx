import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button.js';
import { useAlertsStore } from '../../store/alerts.store.js';

/**
 * Slides down whenever there are unacknowledged critical alerts, and disappears
 * automatically once they're all acknowledged (alerts leave the store on ack).
 */
export function AlertBanner() {
  const navigate = useNavigate();
  const activeAlerts = useAlertsStore((s) => s.activeAlerts);

  const criticalServices = new Set(
    activeAlerts.filter((a) => a.severity === 'critical').map((a) => a.serviceId),
  );
  const count = criticalServices.size;
  if (count === 0) return null;

  return (
    <div className="alert-banner-crit">
      <AlertTriangle size={18} />
      <span className="alert-banner-crit__text">
        {count} serviço{count > 1 ? 's' : ''} com problema crítico
      </span>
      <Button variant="secondary" size="sm" onClick={() => navigate('/alerts')}>
        Ver alertas
      </Button>
    </div>
  );
}
