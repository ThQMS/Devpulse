import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi, ServiceFilters } from '../api/services.api.js';
import { useServicesStore } from '../store/services.store.js';
import type { CreateServiceInput } from '../types/index.js';

export function useServices(filters?: ServiceFilters) {
  const initFromServices = useServicesStore((s) => s.initFromServices);

  const query = useQuery({
    queryKey: ['services', filters],
    queryFn: () => servicesApi.getServices(filters),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (query.data) initFromServices(query.data);
  }, [query.data, initFromServices]);

  return query;
}

export function useServiceChecks(serviceId: string, limit = 25, offset = 0) {
  return useQuery({
    queryKey: ['service-checks', serviceId, limit, offset],
    queryFn: () => servicesApi.getChecks(serviceId, limit, offset),
    enabled: Boolean(serviceId),
    refetchInterval: 30_000,
  });
}

export function useServiceAlerts(serviceId: string) {
  return useQuery({
    queryKey: ['service-alerts', serviceId],
    queryFn: () => servicesApi.getAlerts(serviceId),
    enabled: Boolean(serviceId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: ['service', id],
    queryFn: () => servicesApi.getService(id),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useServiceHistory(serviceId: string, hours = 24, points = 48) {
  return useQuery({
    queryKey: ['service-history', serviceId, hours, points],
    queryFn: () => servicesApi.getHistory(serviceId, hours, points),
    enabled: Boolean(serviceId),
    refetchInterval: 15_000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) => servicesApi.createService(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useSilenceService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, durationMinutes }: { id: string; durationMinutes: number }) =>
      servicesApi.silenceService(id, durationMinutes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useResumeService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.resumeService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useCheckNow() {
  return useMutation({
    mutationFn: (id: string) => servicesApi.checkNow(id),
  });
}
