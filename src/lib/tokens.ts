/** HMAC order-access tokens (security.order_access): token = HMAC(ref + mobile). */
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => {
  const s = process.env.ORDER_TOKEN_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("ORDER_TOKEN_SECRET must be set (32+ chars)");
    return "dev-only-insecure-order-token-secret-change-me";
  }
  return s;
};

export const orderToken = (ref: string, mobile: string) =>
  createHmac("sha256", secret()).update(`${ref}|${mobile}`).digest("base64url").slice(0, 32);

export function verifyOrderToken(ref: string, mobile: string, token: string | null | undefined) {
  if (!token) return false;
  const a = Buffer.from(orderToken(ref, mobile));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
