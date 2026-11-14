import { guardAdmin } from "@/lib/adminGuard";
import { adminActor, transitionErrorResponse } from "@/lib/adminActions";
import { json, validationError } from "@/lib/api";
import { applyTransition } from "@/lib/orderMachine";
import { dispatchSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await ctx.params;
  const parsed = dispatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const { order } = await applyTransition(
      id,
      { type: "DISPATCH", courierName: parsed.data.courier_name, awb: parsed.data.awb },
      adminActor(g.admin, req),
      { meta: { courierName: parsed.data.courier_name, awb: parsed.data.awb } },
    );
    return json({ ok: true, status: order.status });
  } catch (e) {
    return transitionErrorResponse(e);
  }
}
