import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { AddServiceModal } from '../services/AddServiceModal.js';
import { useServicesStore } from '../../store/services.store.js';

export function Header() {
  const [modalOpen, setModalOpen] = useState(false);
  const offline = useServicesStore((s) => s.counts.down);

  return (
    <header className="header">
      <div className="header-title">Uptime Monitoring</div>

      <div className="header-meta">
        {offline > 0 && <span className="offline-badge">{offline} offline</span>}

        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Adicionar servico
        </Button>
      </div>

      <AddServiceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
