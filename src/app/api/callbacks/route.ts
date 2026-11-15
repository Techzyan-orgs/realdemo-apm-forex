import { COMPLIANCE } from "@/config/compliance";
import { apiError, clientIp, json, validationError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { publish } from "@/lib/realtime";
import { callbackSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** POST /api/callbacks -> creates a CallbackRequest (Request a Call, contact form, cap exceeded). */
export async function POST(req: Request) {
  const rl = rateLimit(`callbacks:${clientIp(req)}`, COMPLIANCE.rateLimits.callbacks);
  if (!rl.ok) return apiError(429, "RATE_LIMITED", "Too many requests. Please try again in a few minutes.");
  const parsed = callbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  const d = parsed.data;
  const cb = await prisma.callbackRequest.create({
    data: {
      name: d.name,
      mobile: d.mobile,
      preferredTime: d.preferred_time || null,
      note: d.note || null,
      source: d.source ?? "CALLBACK",
    },
  });
  publish("callback.created", {
    id: cb.id,
    name: cb.name,
    mobile: cb.mobile,
    preferredTime: cb.preferredTime,
    note: cb.note,
    source: cb.source,
    handled: cb.handled,
    createdAt: cb.createdAt.toISOString(),
  });
  return json({ ok: true, id: cb.id }, { status: 201 });
}
