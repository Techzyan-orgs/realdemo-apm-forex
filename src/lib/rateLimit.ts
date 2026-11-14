/** In-memory token bucket rate limiter (per process). */
type Bucket = { tokens: number; updated: number };
const g = globalThis as unknown as { __apmBuckets?: Map<string, Bucket> };
const buckets = (g.__apmBuckets ??= new Map());

export function rateLimit(key: string, opts: { capacity: number; windowMs: number }) {
  if (process.env.DISABLE_RATE_LIMIT === "true") return { ok: true, remaining: opts.capacity };
  const now = Date.now();
  const refillPerMs = opts.capacity / opts.windowMs;
  const b = buckets.get(key) ?? { tokens: opts.capacity, updated: now };
  b.tokens = Math.min(opts.capacity, b.tokens + (now - b.updated) * refillPerMs);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, remaining: 0, retryAfterMs: Math.ceil((1 - b.tokens) / refillPerMs) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true, remaining: Math.floor(b.tokens) };
}
