/** Display formatting. Indian digit grouping for INR; ISO prefix for foreign amounts. */
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const rate4 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const formatInr = (n: number, decimals: 0 | 2 = 2) => (decimals === 0 ? inr0 : inr2).format(n);
export const formatNumber = (n: number) => num2.format(n);
export const formatForex = (code: string, n: number) => `${code} ${num2.format(n)}`;
export const formatRate = (n: number) => rate4.format(n);
export const formatUsd = (n: number) => `USD ${num2.format(n)}`;

/** Mask PAN/passport etc. in list views: show last 4. */
export const maskId = (v: string | null | undefined) => (v ? `${"•".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : "");

export const formatDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(d));
export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(d));
export const formatTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-IN", { timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(d));

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
