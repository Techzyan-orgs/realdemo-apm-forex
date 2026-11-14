import { apiError } from "@/lib/api";
import { IntakeError } from "@/lib/kycIntake";
import { TransitionError } from "@/lib/orderMachine";
import { PricingError } from "@/lib/pricing";

/** Map known domain errors to the API error envelope. Never logs request bodies (PII). */
export function handleRouteError(e: unknown) {
  if (e instanceof IntakeError) return apiError(e.status, e.code, e.message, { fields: e.fields, rule_id: e.ruleId });
  if (e instanceof TransitionError)
    return apiError(e.code === "NOT_FOUND" ? 404 : 409, e.ruleId ? "COMPLIANCE" : e.code, e.message, { rule_id: e.ruleId });
  if (e instanceof PricingError) return apiError(400, e.code, e.message);
  console.error("Unhandled route error:", e instanceof Error ? e.message : "unknown");
  return apiError(500, "INTERNAL", "Something went wrong. Please try again.");
}
