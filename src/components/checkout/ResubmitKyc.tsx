"use client";
import { useRouter } from "next/navigation";
import type { KycValues } from "@/lib/kycValidation";
import { KycForm, type KycFormOrder, type StoreOpt, type SubmitResult } from "./KycForm";

/** Late / re-submitted KYC for an existing order (token-gated). */
export function ResubmitKyc({
  orderRef,
  token,
  order,
  stores,
  existingDocs,
  initialValues,
}: {
  orderRef: string;
  token: string;
  order: KycFormOrder;
  stores: StoreOpt[];
  existingDocs: string[];
  initialValues: Partial<KycValues>;
}) {
  const router = useRouter();
  const submit = async (fd: FormData): Promise<SubmitResult> => {
    fd.set("token", token);
    try {
      const res = await fetch(`/api/orders/${orderRef}/kyc`, { method: "POST", body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, message: j?.error?.message ?? "Could not submit KYC.", fields: j?.error?.fields };
      router.push(j.redirect);
      router.refresh();
      return { ok: true };
    } catch {
      return { ok: false, message: "Network error - please try again." };
    }
  };
  return <KycForm mode="resubmit" order={order} stores={stores} existingDocs={existingDocs} initialValues={initialValues} submit={submit} />;
}
