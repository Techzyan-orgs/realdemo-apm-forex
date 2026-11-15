import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof prisma;

/** AML-1: AuditLog row on every admin action. Never put raw KYC field values in before/after. */
export function audit(
  tx: Tx,
  entry: { actor: string; action: string; entity: string; entityId: string; before?: unknown; after?: unknown; ip?: string },
) {
  return tx.auditLog.create({
    data: {
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: (entry.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (entry.after ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: entry.ip,
    },
  });
}
