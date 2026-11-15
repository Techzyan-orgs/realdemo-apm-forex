import { guardAdmin } from "@/lib/adminGuard";
import { json } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Callback requests for the admin side panel (unhandled first, then the most recent handled). */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const [open, handled] = await Promise.all([
    prisma.callbackRequest.findMany({ where: { handled: false }, orderBy: { createdAt: "asc" } }),
    prisma.callbackRequest.findMany({ where: { handled: true }, orderBy: { handledAt: "desc" }, take: 10 }),
  ]);
  return json({ callbacks: [...open, ...handled] });
}
