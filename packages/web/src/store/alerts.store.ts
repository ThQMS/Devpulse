import { create } from 'zustand';
import type { Alert } from '../types/index.js';

interface AlertsState {
  activeAlerts: Alert[];
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;
  initFromAlerts: (alerts: Alert[]) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  activeAlerts: [],

  // Prepend newest-first; de-dupe so a WS push and the initial fetch don't double up.
  addAlert: (alert) =>
    set((state) => ({
      activeAlerts: [alert, ...state.activeAlerts.filter((a) => a.id !== alert.id)],
    })),

  removeAlert: (id) =>
    set((state) => ({ activeAlerts: state.activeAlerts.filter((a) => a.id !== id) })),

  initFromAlerts: (alerts) => set({ activeAlerts: alerts }),
}));
