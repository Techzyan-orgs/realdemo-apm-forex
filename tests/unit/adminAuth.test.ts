import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LOCKOUT,
  SESSION_TTL_MS,
  authConfig,
  createSessionToken,
  lockRemaining,
  readCookie,
  recordFailure,
  recordSuccess,
  resetLockouts,
  verifyPassword,
  verifySessionToken,
} from "@/lib/adminAuth";
import { requireAdmin } from "@/lib/adminGuard";

const ENV = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_AUTH_ENABLED = "true";
  process.env.ADMIN_EMAIL = "Owner@Example.com";
  process.env.ADMIN_PASSWORD = "correct horse battery staple";
  delete process.env.ADMIN_SESSION_SECRET;
  process.env.ORDER_TOKEN_SECRET = "o".repeat(64);
  resetLockouts();
});
afterEach(() => {
  process.env = { ...ENV };
});

describe("config", () => {
  it("reads email + password from env, normalises the email, derives a secret", () => {
    const cfg = authConfig()!;
    expect(cfg.email).toBe("owner@example.com");
    expect(cfg.secret).toHaveLength(64);
    process.env.ADMIN_SESSION_SECRET = "s".repeat(40);
    expect(authConfig()!.secret).toBe("s".repeat(40));
  });
  it("fails closed when email or password is missing", () => {
    process.env.ADMIN_PASSWORD = "";
    expect(authConfig()).toBeNull();
    process.env.ADMIN_PASSWORD = "x";
    delete process.env.ADMIN_EMAIL;
    expect(authConfig()).toBeNull();
  });
});

describe("passwords", () => {
  it("accepts only the configured password", () => {
    const cfg = authConfig()!;
    expect(verifyPassword("correct horse battery staple", cfg)).toBe(true);
    expect(verifyPassword("wrong", cfg)).toBe(false);
    expect(verifyPassword("", cfg)).toBe(false);
  });
});

describe("sessions", () => {
  it("round-trips, expires after 12 h and rejects tampering", () => {
    const cfg = authConfig()!;
    const now = Date.now();
    const t = createSessionToken(cfg, now);
    expect(verifySessionToken(t, cfg, now)?.sub).toBe("owner@example.com");
    expect(verifySessionToken(t, cfg, now + SESSION_TTL_MS + 1)).toBeNull();
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), exp: now + 9e9 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${sig}`, cfg, now)).toBeNull();
    expect(verifySessionToken("garbage", cfg, now)).toBeNull();
  });
  it("the cookie never contains the password", () => {
    const t = createSessionToken(authConfig()!);
    expect(Buffer.from(t.split(".")[0], "base64url").toString()).not.toContain("correct horse");
  });
  it("changing the password or the secret invalidates existing sessions", () => {
    const t = createSessionToken(authConfig()!);
    process.env.ADMIN_PASSWORD = "a new password";
    expect(verifySessionToken(t, authConfig()!)).toBeNull();
    process.env.ADMIN_PASSWORD = "correct horse battery staple";
    expect(verifySessionToken(t, authConfig()!)).not.toBeNull();
    process.env.ADMIN_SESSION_SECRET = "y".repeat(40);
    expect(verifySessionToken(t, authConfig()!)).toBeNull();
  });
  it("reads the cookie from a Cookie header", () => {
    expect(readCookie("a=1; apm_admin_session=abc.def; b=2", "apm_admin_session")).toBe("abc.def");
    expect(readCookie(null, "apm_admin_session")).toBeNull();
  });
});

describe("requireAdmin", () => {
  it("allows a valid session, denies none / invalid, allows all when auth is off", async () => {
    const t = createSessionToken(authConfig()!);
    const req = (cookie?: string) => new Request("http://x/api/admin/orders", { headers: cookie ? { cookie } : {} });
    expect(await requireAdmin(req(`apm_admin_session=${t}`))).toEqual({ id: "owner", name: "Owner (owner@example.com)" });
    expect(await requireAdmin(req())).toBeNull();
    expect(await requireAdmin(req("apm_admin_session=nope.nope"))).toBeNull();
    process.env.ADMIN_AUTH_ENABLED = "false";
    expect(await requireAdmin(req())).not.toBeNull();
  });
  it("fails closed when enabled but not configured", async () => {
    delete process.env.ADMIN_PASSWORD;
    expect(await requireAdmin(new Request("http://x/admin"))).toBeNull();
  });
});

describe("lockout", () => {
  it("locks an IP after 5 failures for 15 minutes; success resets", () => {
    const now = Date.now();
    for (let i = 1; i < LOCKOUT.maxFailures; i++) expect(recordFailure("1.1.1.1", now)).toBe(0);
    expect(recordFailure("1.1.1.1", now)).toBe(LOCKOUT.lockMs);
    expect(lockRemaining("1.1.1.1", now + 60_000)).toBe(LOCKOUT.lockMs - 60_000);
    expect(lockRemaining("1.1.1.1", now + LOCKOUT.lockMs + 1)).toBe(0);
    expect(lockRemaining("2.2.2.2", now)).toBe(0);
    recordFailure("3.3.3.3", now);
    recordSuccess("3.3.3.3");
    expect(lockRemaining("3.3.3.3", now)).toBe(0);
  });
});
