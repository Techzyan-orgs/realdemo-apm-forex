import { COMPLIANCE } from "@/config/compliance";
import { apiError, clientIp, json } from "@/lib/api";
import { prisma } from "@/lib/db";
import { liveOrderInclude, toPublicStatus } from "@/lib/orderDto";
import { rateLimit } from "@/lib/rateLimit";
import { trackSchema } from "@/lib/schemas";
import { orderToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const NOT_FOUND = "We couldn't find an order with that Order ID and mobile number.";

/** POST /api/track {ref, mobile} -> status timeline only (never KYC data). */
export async function POST(req: Request) {
  const rl = rateLimit(`track:${clientIp(req)}`, COMPLIANCE.rateLimits.track);
  if (!rl.ok) return apiError(429, "RATE_LIMITED", "Too many attempts. Please try again in a few minutes.");
  const parsed = trackSchema.safeParse(await req.json().catch(() => null));
  // same generic error for malformed input, unknown ref and mobile mismatch
  if (!parsed.success) return apiError(404, "NOT_FOUND", NOT_FOUND);
  const order = await prisma.order.findUnique({ where: { ref: parsed.data.ref }, include: liveOrderInclude });
  if (!order || order.mobile !== parsed.data.mobile) return apiError(404, "NOT_FOUND", NOT_FOUND);
  return json({ order: toPublicStatus(order), token: orderToken(order.ref, order.mobile) });
}
