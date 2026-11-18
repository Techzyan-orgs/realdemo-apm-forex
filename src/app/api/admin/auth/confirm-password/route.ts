import { z } from "zod";
import {
  authConfig,
  lockRemaining,
  recordFailure,
  recordSuccess,
  verifyPassword,
} from "@/lib/adminAuth";
import { adminAuthEnabled, guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().max(500), purpose: z.enum(["sound_off"]) });
const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60000));

/**
 * POST /api/admin/auth/confirm-password {password, purpose}
 * Re-checks the owner password for sensitive toggles (e.g. muting new-order sounds) while signed in.
 * Wrong passwords count towards the same per-IP lockout as the login form.
 * With ADMIN_AUTH_ENABLED=false (local development) there is no password, so it always succeeds.
 */
export async function POST(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const ip = clientIp(req);

  if (adminAuthEnabled()) {
    const cfg = authConfig();
    if (!cfg) return apiError(503, "AUTH_NOT_CONFIGURED", "Admin login is not set up.");
    const locked = lockRemaining(ip);
    if (locked)
      return apiError(
        429,
        "LOCKED",
        `Too many failed attempts. Try again in ${minutes(locked)} minute(s).`,
      );
    if (!verifyPassword(parsed.data.password, cfg)) {
      const lockedFor = recordFailure(ip);
      await audit(prisma, {
        actor: g.admin.name,
        action: "admin.confirm_password_failed",
        entity: "AdminSession",
        entityId: "owner",
        ip,
        after: { purpose: parsed.data.purpose },
      });
      if (lockedFor)
        return apiError(
          429,
          "LOCKED",
          `Too many failed attempts. Try again in ${minutes(lockedFor)} minute(s).`,
        );
      return apiError(401, "WRONG_PASSWORD", "That password isn't right.");
    }
    recordSuccess(ip);
  }
  await audit(prisma, {
    actor: g.admin.name,
    action: "admin.sound_off",
    entity: "AdminSession",
    entityId: "owner",
    ip,
  });
  return json({ ok: true });
}

/** GET -> {required}: whether confirming needs a password (false when admin login is turned off). */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  return json({ required: adminAuthEnabled() });
}
