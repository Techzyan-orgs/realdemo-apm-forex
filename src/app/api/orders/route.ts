import { COMPLIANCE } from "@/config/compliance";
import { apiError, clientIp, json } from "@/lib/api";
import { createOrder } from "@/lib/orderService";
import { rateLimit } from "@/lib/rateLimit";
import { handleRouteError } from "@/lib/routeErrors";

export const dynamic = "force-dynamic";

/** POST /api/orders (multipart: draft, kyc, mode=FULL|SKIP, doc_<CODE> files) -> {ref, token} */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`orders:${ip}`, COMPLIANCE.rateLimits.orders);
  if (!rl.ok) return apiError(429, "RATE_LIMITED", "Too many orders from this network. Please try again later.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "VALIDATION", "Expected a multipart form.");
  }
  try {
    const { ref, token } = await createOrder(form, { ip, userAgent: req.headers.get("user-agent") ?? "" });
    return json({ ref, token, redirect: `/order/${ref}?t=${token}` }, { status: 201 });
  } catch (e) {
    return handleRouteError(e);
  }
}
