import { guardAdmin } from "@/lib/adminGuard";
import { subscribe, type RealtimeEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/** SSE: order.created | order.updated | order.handed_over | callback.created | settings.updated; heartbeat every 25s. */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(`retry: 3000\n: connected\n\n`);
      const unsubscribe = subscribe((e: RealtimeEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
      const heartbeat = setInterval(() => send(`event: heartbeat\ndata: ${Date.now()}\n\n`), 25_000);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
