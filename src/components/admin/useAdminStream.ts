"use client";
import { useEffect, useRef, useState } from "react";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/realtime";

export type StreamStatus = "connecting" | "live" | "polling";

/**
 * Subscribes to GET /api/admin/stream (SSE). EventSource auto-reconnects; if the stream keeps
 * failing we fall back to calling `onPoll` every 10 s until it recovers.
 */
export function useAdminStream(handlers: Partial<Record<RealtimeEventType, (data: unknown) => void>>, onPoll?: () => void) {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const ref = useRef({ handlers, onPoll });
  useEffect(() => {
    ref.current = { handlers, onPoll };
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let failures = 0;
    let closed = false;

    const startPolling = () => {
      if (pollTimer) return;
      setStatus("polling");
      pollTimer = setInterval(() => ref.current.onPoll?.(), 10_000);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };

    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/admin/stream");
      es.onopen = () => {
        failures = 0;
        stopPolling();
        setStatus("live");
        // catch up on anything missed while disconnected
        ref.current.onPoll?.();
      };
      const types: RealtimeEventType[] = ["order.created", "order.updated", "order.handed_over", "callback.created", "settings.updated"];
      for (const t of types)
        es.addEventListener(t, (msg) => {
          try {
            const evt = JSON.parse((msg as MessageEvent).data) as RealtimeEvent;
            ref.current.handlers[t]?.(evt.data);
          } catch {}
        });
      es.onerror = () => {
        failures++;
        if (failures >= 2) startPolling();
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          retryTimer = setTimeout(connect, Math.min(30_000, 2_000 * failures));
        }
      };
    };
    connect();
    return () => {
      closed = true;
      es?.close();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return status;
}
