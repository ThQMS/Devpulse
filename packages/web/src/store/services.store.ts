import { create } from 'zustand';
import type { CheckStatus, CheckResultPayload, ServiceWithStats } from '../types/index.js';

export interface LiveStatus {
  status: CheckStatus;
  latencyMs: number | null;
  checkedAt: string;
}

interface ServicesState {
  /** Live, per-service status fed by the WebSocket stream. */
  liveStatus: Map<string, LiveStatus>;
  counts: { up: number; down: number; unknown: number };
  updateFromCheckResult: (payload: CheckResultPayload) => void;
  initFromServices: (services: ServiceWithStats[]) => void;
}

function tally(map: Map<string, LiveStatus>): ServicesState['counts'] {
  const counts = { up: 0, down: 0, unknown: 0 };
  map.forEach((v) => {
    if (v.status === 'up') counts.up++;
    else if (v.status === 'down' || v.status === 'timeout') counts.down++;
    else counts.unknown++;
  });
  return counts;
}

export const useServicesStore = create<ServicesState>((set) => ({
  liveStatus: new Map(),
  counts: { up: 0, down: 0, unknown: 0 },

  updateFromCheckResult: (payload) =>
    set((state) => {
      const newMap = new Map(state.liveStatus);
      newMap.set(payload.serviceId, {
        status: payload.status,
        latencyMs: payload.latencyMs,
        checkedAt: payload.checkedAt,
      });
      return { liveStatus: newMap, counts: tally(newMap) };
    }),

  initFromServices: (services) => {
    const map = new Map<string, LiveStatus>(
      services.map((s) => [
        s.id,
        {
          status: s.lastCheckStatus,
          latencyMs: s.avgLatencyMs24h,
          checkedAt: s.lastCheckAt ?? new Date().toISOString(),
        },
      ]),
    );
    set({ liveStatus: map, counts: tally(map) });
  },
}));
