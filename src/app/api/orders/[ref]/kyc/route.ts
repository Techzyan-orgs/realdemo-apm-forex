import { COMPLIANCE } from "@/config/compliance";
import { apiError, clientIp, json } from "@/lib/api";
import { prisma } from "@/lib/db";
import { submitKycForOrder } from "@/lib/kycSubmit";
import { rateLimit } from "@/lib/rateLimit";
import { handleRouteError } from "@/lib/routeErrors";
import { orderToken, verifyOrderToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

/** POST /api/orders/[ref]/kyc (multipart: token, kyc, doc_<CODE>) - late or re-submitted KYC. */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const ip = clientIp(req);
  if (!rateLimit(`orders:${ip}`, COMPLIANCE.rateLimits.orders).ok) return apiError(429, "RATE_LIMITED", "Too many attempts. Please try later.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "VALIDATION", "Expected a multipart form.");
  }
  const order = await prisma.order.findUnique({ where: { ref: ref.toUpperCase() }, select: { id: true, ref: true, mobile: true } });
  const token = form.get("token");
  if (!order || !verifyOrderToken(order.ref, order.mobile, typeof token === "string" ? token : null))
    return apiError(404, "NOT_FOUND", "Order not found.");
  try {
    await submitKycForOrder(order.id, form, { staff: false, actorName: "customer", ip, userAgent: req.headers.get("user-agent") ?? "" });
    return json({ ref: order.ref, redirect: `/order/${order.ref}?t=${orderToken(order.ref, order.mobile)}` });
  } catch (e) {
    return handleRouteError(e);
  }
}
