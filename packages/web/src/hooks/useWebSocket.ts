import { useState, useRef, useEffect, useCallback } from 'react';
import { useServicesStore } from '../store/services.store.js';
import { useAlertsStore } from '../store/alerts.store.js';
import type { WsMessage } from '../types/index.js';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

const MAX_BACKOFF_MS = 30_000;

/**
 * Single resilient WebSocket connection. Routes incoming events into the
 * stores, answers PINGs, and reconnects with exponential backoff. Mount once,
 * near the app root.
 */
export function useWebSocket(): { wsStatus: WsStatus } {
  const updateService = useServicesStore((s) => s.updateFromCheckResult);
  const addAlert = useAlertsStore((s) => s.addAlert);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const closedByUs = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const url = import.meta.env.VITE_WS_URL ?? '/ws';
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWsStatus('connecting');

    ws.onopen = () => {
      setWsStatus('connected');
      retryCount.current = 0;
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      if (closedByUs.current) return;
      // Exponential backoff: 1s, 2s, 4s, 8s … capped at 30s.
      const delay = Math.min(1000 * 2 ** retryCount.current, MAX_BACKOFF_MS);
      retryCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        switch (msg.type) {
          case 'CHECK_RESULT':
            updateService(msg.payload);
            break;
          case 'ALERT_CREATED':
            addAlert(msg.payload);
            break;
          case 'PING':
            ws.send(JSON.stringify({ type: 'PONG' }));
            break;
          default:
            break;
        }
      } catch {
        /* ignore malformed messages */
      }
    };
  }, [updateService, addAlert]);

  useEffect(() => {
    closedByUs.current = false;
    connect();
    return () => {
      closedByUs.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { wsStatus };
}
