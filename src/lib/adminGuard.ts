/**
 * Admin auth seam (security.admin_auth_seam). proxy.ts applies requireAdmin() to /admin/* and
 * /api/admin/*, and every admin route handler calls guardAdmin() again.
 *
 * ADMIN_AUTH_ENABLED=true  -> owner login required (signed session cookie, see src/lib/adminAuth.ts).
 * ADMIN_AUTH_ENABLED=false -> everything is allowed and the admin layout shows a red
 *                             "Auth disabled - do not deploy publicly" bar (local development only).
 */
import { SESSION_COOKIE, authConfig, readCookie, verifySessionToken } from "@/lib/adminAuth";

export const adminAuthEnabled = () => process.env.ADMIN_AUTH_ENABLED === "true";

export type AdminIdentity = { id: string; name: string };

/** Returns the admin identity, or null when the request is not authorised. */
export async function requireAdmin(request: Request): Promise<AdminIdentity | null> {
  if (!adminAuthEnabled()) return { id: "admin", name: "Admin (auth disabled)" };
  const cfg = authConfig();
  if (!cfg) return null; // enabled but not configured: fail closed
  const session = verifySessionToken(readCookie(request.headers.get("cookie"), SESSION_COOKIE), cfg);
  return session ? { id: "owner", name: `Owner (${session.sub})` } : null;
}

/** Helper for route handlers: returns a 401 Response when not authorised. */
export async function guardAdmin(request: Request): Promise<{ admin: AdminIdentity } | { response: Response }> {
  const admin = await requireAdmin(request);
  if (!admin)
    return { response: Response.json({ error: { code: "UNAUTHORISED", message: "Admin login required" } }, { status: 401 }) };
  return { admin };
}
