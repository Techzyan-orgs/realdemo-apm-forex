/** In-process realtime bus backing GET /api/admin/stream (SSE). */
import { EventEmitter } from "node:events";

export type RealtimeEventType = "order.created" | "order.updated" | "order.handed_over" | "callback.created" | "settings.updated";
export type RealtimeEvent = { type: RealtimeEventType; data: unknown; at: string };

const g = globalThis as unknown as { __apmBus?: EventEmitter };
export const bus: EventEmitter = g.__apmBus ?? new EventEmitter();
bus.setMaxListeners(200);
g.__apmBus = bus;

export function publish(type: RealtimeEventType, data: unknown) {
  const evt: RealtimeEvent = { type, data, at: new Date().toISOString() };
  bus.emit("event", evt);
}

export function subscribe(fn: (e: RealtimeEvent) => void) {
  bus.on("event", fn);
  return () => bus.off("event", fn);
}
