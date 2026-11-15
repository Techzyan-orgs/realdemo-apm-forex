import type { Prisma } from "@prisma/client";

/** APM-YYMMDD-NNNN (Asia/Kolkata date + daily sequence). Call inside a transaction. */
export async function nextOrderRef(tx: Prisma.TransactionClient, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "2-digit", month: "2-digit", day: "2-digit" })
    .formatToParts(now)
    .reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  const day = `${parts.year}${parts.month}${parts.day}`;
  const seq = await tx.orderSequence.upsert({
    where: { day },
    create: { day, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `APM-${day}-${String(seq.value).padStart(4, "0")}`;
}
