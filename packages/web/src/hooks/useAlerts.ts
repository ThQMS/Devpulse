import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../api/alerts.api.js';
import { useAlertsStore } from '../store/alerts.store.js';

/** Open alerts — backed by the store so WS-pushed alerts appear in real time. */
export function useAlerts() {
  const initFromAlerts = useAlertsStore((s) => s.initFromAlerts);
  const activeAlerts = useAlertsStore((s) => s.activeAlerts);

  const query = useQuery({
    queryKey: ['alerts', 'open'],
    queryFn: () => alertsApi.getAlerts('open'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (query.data) initFromAlerts(query.data);
  }, [query.data, initFromAlerts]);

  return { activeAlerts, isLoading: query.isLoading, refetch: query.refetch };
}

/** Full alert history (acknowledged + open). */
export function useAllAlerts() {
  return useQuery({
    queryKey: ['alerts', 'all'],
    queryFn: () => alertsApi.getAlerts('all'),
    staleTime: 60_000,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const removeAlert = useAlertsStore((s) => s.removeAlert);
  return useMutation({
    mutationFn: ({ alertId, acknowledgedBy }: { alertId: string; acknowledgedBy: string }) =>
      alertsApi.acknowledge(alertId, acknowledgedBy),
    onSuccess: (alert) => {
      removeAlert(alert.id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
