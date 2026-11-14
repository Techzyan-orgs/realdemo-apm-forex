import { z } from "zod";
import { guardAdmin } from "@/lib/adminGuard";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ handled: z.boolean() });

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const existing = await prisma.callbackRequest.findUnique({ where: { id } });
  if (!existing) return apiError(404, "NOT_FOUND", "Callback request not found");
  const callback = await prisma.$transaction(async (tx) => {
    const c = await tx.callbackRequest.update({ where: { id }, data: { handled: parsed.data.handled, handledAt: parsed.data.handled ? new Date() : null } });
    await audit(tx, { actor: g.admin.name, action: "callback.handled", entity: "CallbackRequest", entityId: id, before: { handled: existing.handled }, after: { handled: c.handled }, ip: clientIp(req) });
    return c;
  });
  return json({ callback });
}
