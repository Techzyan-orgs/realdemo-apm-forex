import { NextResponse } from "next/server";
import { SESSION_COOKIE, authConfig, readCookie, sessionCookie, verifySessionToken } from "@/lib/adminAuth";
import { clientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/admin/auth/logout -> clears the session cookie (works even if the session already expired). */
export async function POST(req: Request) {
  const cfg = authConfig();
  const session = cfg ? verifySessionToken(readCookie(req.headers.get("cookie"), SESSION_COOKIE), cfg) : null;
  if (session) await audit(prisma, { actor: `Owner (${session.sub})`, action: "admin.logout", entity: "AdminSession", entityId: "owner", ip: clientIp(req) });
  const res = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(sessionCookie("", 0));
  return res;
}
