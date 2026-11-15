import { apiError, clientIp, json } from "@/lib/api";
import { audit } from "@/lib/audit";
import { guardAdmin } from "@/lib/adminGuard";
import { prisma, num } from "@/lib/db";
import { submitKycForOrder } from "@/lib/kycSubmit";
import { handleRouteError } from "@/lib/routeErrors";

export const dynamic = "force-dynamic";

/** GET: context + current values for the staff-entry KYC form (StaffKycEntry). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await params;
  const o = await prisma.order.findUnique({ where: { id }, include: { kyc: { include: { documents: { where: { superseded: false } } } }, lines: { orderBy: { position: "asc" } } } });
  if (!o) return apiError(404, "NOT_FOUND", "Order not found");
  const stores = await prisma.store.findMany({ select: { id: true, name: true, address: true, hours: true } });
  return json(
    {
      order: {
        id: o.id,
        ref: o.ref,
        side: o.side,
        status: o.status,
        fulfilment: o.fulfilment,
        purpose: o.purpose,
        destinationCountry: o.destinationCountry,
        mobile: o.mobile,
        travelDate: o.travelDate?.toISOString().slice(0, 10) ?? null,
        storeId: o.storeId,
        pickupDate: o.pickupDate?.toISOString().slice(0, 10) ?? null,
        grossInr: num(o.grossInr),
        usdEquivalent: num(o.usdEquivalent),
        totalInr: num(o.totalInr),
        lines: o.lines.map((l) => ({ currency: l.currency, forexAmount: num(l.forexAmount) })),
        kycStatus: o.kyc?.status ?? "NOT_SUBMITTED",
        documents: o.kyc?.documents.map((d) => d.type) ?? [],
      },
      stores,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST: staff-entered KYC at the counter (multipart: kyc, doc_<CODE>). Then Approve via the admin action. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guardAdmin(req);
  if ("response" in g) return g.response;
  const { id } = await params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(400, "VALIDATION", "Expected a multipart form.");
  }
  const ip = clientIp(req);
  try {
    const r = await submitKycForOrder(id, form, { staff: true, actorName: g.admin.name, ip, userAgent: req.headers.get("user-agent") ?? "" });
    await audit(prisma, { actor: g.admin.name, action: "kyc.staff_entered", entity: "Order", entityId: id, after: { enteredBy: "STAFF" }, ip });
    return json({ ok: true, ref: r.ref });
  } catch (e) {
    return handleRouteError(e);
  }
}
