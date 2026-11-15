import { apiError, clientIp, json, validationError } from "@/lib/api";
import { COMPLIANCE } from "@/config/compliance";
import { PricingError } from "@/lib/pricing";
import { buildQuote } from "@/lib/quoteService";
import { rateLimit } from "@/lib/rateLimit";
import { quoteRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** POST /api/quote -> full breakdown + compliance results. The only source of totals for the UI. */
export async function POST(req: Request) {
  const rl = rateLimit(`quote:${clientIp(req)}`, COMPLIANCE.rateLimits.quote);
  if (!rl.ok) return apiError(429, "RATE_LIMITED", "Too many requests. Please wait a moment.");
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  try {
    const { quote, compliance } = await buildQuote(parsed.data);
    return json({ quote, compliance, disclaimer: "Rates are indicative and are locked only on payment / at the counter." });
  } catch (e) {
    if (e instanceof PricingError) return apiError(400, e.code, e.message);
    throw e;
  }
}
