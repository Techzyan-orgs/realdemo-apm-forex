import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authConfig,
  createSessionToken,
  lockRemaining,
  recordFailure,
  recordSuccess,
  sessionCookie,
  SESSION_TTL_MS,
  verifyPassword,
} from "@/lib/adminAuth";
import { adminAuthEnabled } from "@/lib/adminGuard";
import { apiError, clientIp, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().max(200), password: z.string().min(1).max(500) });

const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60000));

/** POST /api/admin/auth/login {email, password} -> sets the session cookie. */
export async function POST(req: Request) {
  if (!adminAuthEnabled()) return apiError(400, "AUTH_DISABLED", "Admin login is turned off (ADMIN_AUTH_ENABLED=false).");
  const cfg = authConfig();
  if (!cfg) return apiError(503, "AUTH_NOT_CONFIGURED", "Admin login is not set up yet: set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart.");

  const ip = clientIp(req);
  const locked = lockRemaining(ip);
  if (locked) return apiError(429, "LOCKED", `Too many failed attempts. Try again in ${minutes(locked)} minute(s).`);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const { email, password } = parsed.data;

  // always check both, so a wrong email and a wrong password take the same time
  const emailOk = email.toLowerCase() === cfg.email;
  const passwordOk = verifyPassword(password, cfg) && emailOk;

  if (!passwordOk) {
    const lockedFor = recordFailure(ip);
    await audit(prisma, { actor: "anonymous", action: "admin.login_failed", entity: "AdminSession", entityId: "owner", ip, after: { locked: lockedFor > 0 } });
    if (lockedFor) return apiError(429, "LOCKED", `Too many failed attempts. Try again in ${minutes(lockedFor)} minute(s).`);
    return apiError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  recordSuccess(ip);
  await audit(prisma, { actor: `Owner (${cfg.email})`, action: "admin.login", entity: "AdminSession", entityId: "owner", ip });
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(sessionCookie(createSessionToken(cfg), SESSION_TTL_MS));
  return res;
}
