import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(status: number, code: string, message: string, extra: { fields?: Record<string, string>; rule_id?: string } = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status, headers: { "Cache-Control": "no-store" } });
}

export function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".") || "_";
    if (!fields[k]) fields[k] = issue.message;
  }
  return fields;
}

export const validationError = (err: ZodError) => apiError(400, "VALIDATION", "Please check the highlighted fields.", { fields: zodFields(err) });
export const complianceError = (ruleId: string, message: string) => apiError(422, "COMPLIANCE", message, { rule_id: ruleId });

export function clientIp(req: Request) {
  const h = req.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export const json = (data: unknown, init: ResponseInit = {}) =>
  NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers ?? {}) } });
