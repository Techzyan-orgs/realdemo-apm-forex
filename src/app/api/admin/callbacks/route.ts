import { guardAdmin } from "@/lib/adminGuard";
import { json } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Callback requests. Default: open (unhandled) requests only, oldest first, for the side panel.
 * `?scope=all` adds handled ones (most recent first). Handled requests are kept, never deleted.
 */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const all = new URL(req.url).searchParams.get("scope") === "all";
  const [open, handled] = await Promise.all([
    prisma.callbackRequest.findMany({ where: { handled: false }, orderBy: { createdAt: "asc" } }),
    all
      ? prisma.callbackRequest.findMany({
          where: { handled: true },
          orderBy: { handledAt: "desc" },
          take: 200,
        })
      : [],
  ]);
  return json({ callbacks: [...open, ...handled] });
}
