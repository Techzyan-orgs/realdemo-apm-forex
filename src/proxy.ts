/**
 * Admin auth seam (security.admin_auth_seam). Next.js 16 renamed `middleware.ts` to `proxy.ts`;
 * this file is the spec's "middleware.ts". It applies requireAdmin() to /admin/* and /api/admin/*.
 * Unauthenticated page requests are sent to /admin/login?next=...; API requests get a 401.
 * The login page and the login/logout endpoints stay reachable without a session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/auth/login", "/api/admin/auth/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!PUBLIC_ADMIN_PATHS.has(pathname)) {
    const admin = await requireAdmin(request);
    if (!admin) {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: { code: "UNAUTHORISED", message: "Admin login required" } }, { status: 401 });
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
