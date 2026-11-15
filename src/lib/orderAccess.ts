import { prisma } from "@/lib/db";
import { liveOrderInclude } from "@/lib/orderDto";
import { verifyOrderToken } from "@/lib/tokens";

/** Load an order for a customer page; requires the signed access token (security.order_access). */
export async function loadOrderForCustomer(ref: string, token: string | string[] | undefined) {
  const t = Array.isArray(token) ? token[0] : token;
  if (!t) return null;
  const order = await prisma.order.findUnique({ where: { ref: ref.toUpperCase() }, include: liveOrderInclude });
  if (!order || !verifyOrderToken(order.ref, order.mobile, t)) return null;
  return { order, token: t };
}
