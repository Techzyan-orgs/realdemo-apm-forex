/**
 * Admin auth seam (security.admin_auth_seam). Admin auth is intentionally DEFERRED.
 * While ADMIN_AUTH_ENABLED=false every request is allowed and the admin layout shows a
 * red "Auth disabled - do not deploy publicly" bar. To switch on real auth later, implement
 * the check inside requireAdmin() only - proxy.ts and the routes already call it.
 */
export const adminAuthEnabled = () => process.env.ADMIN_AUTH_ENABLED === "true";

export type AdminIdentity = { id: string; name: string };

/** Returns the admin identity, or null when the request is not authorised. */
export async function requireAdmin(request: Request): Promise<AdminIdentity | null> {
  if (!adminAuthEnabled()) return { id: "admin", name: "Admin (auth disabled)" };
  // TODO(auth): verify a session cookie / bearer token here.
  void request;
  return null;
}

/** Helper for route handlers: returns a 401 Response when not authorised. */
export async function guardAdmin(request: Request): Promise<{ admin: AdminIdentity } | { response: Response }> {
  const admin = await requireAdmin(request);
  if (!admin)
    return { response: Response.json({ error: { code: "UNAUTHORISED", message: "Admin login required" } }, { status: 401 }) };
  return { admin };
}
