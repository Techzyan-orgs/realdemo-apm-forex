import { PrismaClient, Prisma } from "@prisma/client";

const g = globalThis as unknown as { __prisma?: PrismaClient };
export const prisma = g.__prisma ?? new PrismaClient({ log: ["error"] });
if (process.env.NODE_ENV !== "production") g.__prisma = prisma;

/** Decimal | number | null -> number */
export const num = (v: Prisma.Decimal | number | string | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === "number" ? v : Number(v.toString());

export { Prisma };
