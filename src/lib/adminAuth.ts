/**
 * Owner login for /admin (single account, read from env - demo setup):
 *   ADMIN_EMAIL           the owner's email (login name)
 *   ADMIN_PASSWORD        the owner's password (plain text in .env: fine for this demo, use a
 *                         secrets manager / hashed password before a real deployment)
 *   ADMIN_SESSION_SECRET  optional; signs the session cookie. If unset, a key is derived from
 *                         ADMIN_PASSWORD + ORDER_TOKEN_SECRET.
 * Sessions are a signed, HTTP-only cookie (no server-side store). Changing the password
 * invalidates every existing session. Fails closed: if auth is enabled but ADMIN_EMAIL or
 * ADMIN_PASSWORD is missing, nobody can sign in.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "apm_admin_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const LOCKOUT = { maxFailures: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 };

/* ------------------------------------------------------------------- config */

export type AuthConfig = { email: string; password: string; secret: string };

/** null when the owner login is not configured (callers must then deny access). */
export function authConfig(): AuthConfig | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim();
  const secret =
    explicit && explicit.length >= 32
      ? explicit
      : createHash("sha256").update(`apm-admin-session|${password}|${process.env.ORDER_TOKEN_SECRET ?? ""}`).digest("hex");
  return { email, password, secret };
}

/** Constant-time password check (compares SHA-256 digests so lengths never leak). */
export function verifyPassword(input: string, cfg: AuthConfig): boolean {
  const a = createHash("sha256").update(input.normalize("NFKC")).digest();
  const b = createHash("sha256").update(cfg.password.normalize("NFKC")).digest();
  return timingSafeEqual(a, b);
}

/** Keyed fingerprint of the password: changing it logs every session out, and reveals nothing. */
const passwordVersion = (cfg: AuthConfig) => createHmac("sha256", cfg.secret).update(`pv|${cfg.password}`).digest("base64url").slice(0, 12);

/* ------------------------------------------------------------------ sessions */

export type Session = { sub: string; iat: number; exp: number; pv: string };

const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function createSessionToken(cfg: AuthConfig, now = Date.now()): string {
  const payload: Session = { sub: cfg.email, iat: now, exp: now + SESSION_TTL_MS, pv: passwordVersion(cfg) };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, cfg.secret)}`;
}

export function verifySessionToken(token: string | undefined | null, cfg: AuthConfig, now = Date.now()): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body, cfg.secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (s.sub !== cfg.email || s.pv !== passwordVersion(cfg)) return null;
    if (typeof s.exp !== "number" || s.exp <= now) return null;
    return s;
  } catch {
    return null;
  }
}

/** Read one cookie from a raw Cookie header. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

export function sessionCookie(value: string, maxAgeMs: number) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, // not sent on cross-site POSTs: blocks CSRF on admin APIs
    path: "/",
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/* ------------------------------------------------------------------- lockout */

type Attempts = { failures: number; first: number; lockedUntil: number };
const g = globalThis as unknown as { __apmLogin?: Map<string, Attempts> };
const attempts = (g.__apmLogin ??= new Map());

/** ms remaining on a lock for this key (IP), or 0. */
export function lockRemaining(key: string, now = Date.now()) {
  const a = attempts.get(key);
  return a && a.lockedUntil > now ? a.lockedUntil - now : 0;
}

/** Record a failed attempt; returns ms locked (0 if not locked yet). */
export function recordFailure(key: string, now = Date.now()) {
  const a = attempts.get(key);
  const fresh = !a || now - a.first > LOCKOUT.windowMs || a.lockedUntil > 0 && a.lockedUntil <= now;
  const next: Attempts = fresh ? { failures: 1, first: now, lockedUntil: 0 } : { ...a!, failures: a!.failures + 1 };
  if (next.failures >= LOCKOUT.maxFailures) next.lockedUntil = now + LOCKOUT.lockMs;
  attempts.set(key, next);
  return next.lockedUntil > now ? next.lockedUntil - now : 0;
}

export function recordSuccess(key: string) {
  attempts.delete(key);
}

/** test helper */
export function resetLockouts() {
  attempts.clear();
}
