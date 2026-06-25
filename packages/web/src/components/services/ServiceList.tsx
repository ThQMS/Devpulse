import { Server } from 'lucide-react';
import { ServiceCard } from './ServiceCard.js';
import { EmptyState } from '../ui/EmptyState.js';
import type { ServiceWithStats } from '../../types/index.js';

interface ServiceListProps {
  services: ServiceWithStats[];
  onAdd?: () => void;
}

export function ServiceList({ services }: ServiceListProps) {
  if (services.length === 0) {
    return (
      <EmptyState
        icon={<Server size={40} />}
        title="No services yet"
        description="Add your first endpoint to start monitoring its uptime and latency."
      />
    );
  }

  return (
    <div className="service-list">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
