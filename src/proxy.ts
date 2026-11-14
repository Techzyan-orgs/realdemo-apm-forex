/**
 * Admin auth seam (security.admin_auth_seam). Next.js 16 renamed `middleware.ts` to `proxy.ts`;
 * this file is the spec's "middleware.ts". It applies requireAdmin() to /admin/* and /api/admin/*.
 * While ADMIN_AUTH_ENABLED=false requireAdmin() allows everything (see src/lib/adminGuard.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";

export async function proxy(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) {
    if (request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json({ error: { code: "UNAUTHORISED", message: "Admin login required" } }, { status: 401 });
    return new NextResponse("Admin login required", { status: 401 });
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
