import { guardAdmin } from "@/lib/adminGuard";
import { adminActor, transitionErrorResponse } from "@/lib/adminActions";
import { json, validationError } from "@/lib/api";
import { applyTransition } from "@/lib/orderMachine";
import { rejectSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** Reject / request re-upload. Customer sees the reason in Track Order. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = rejectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const { order } = await applyTransition(id, { type: "REJECT_KYC", reason: parsed.data.reason }, adminActor(g.admin, req), {
      meta: { reason: parsed.data.reason },
    });
    return json({ ok: true, status: order.status });
  } catch (e) {
    return transitionErrorResponse(e);
  }
}
