import { notFound } from "next/navigation";
import { Harness } from "./Harness";

export const metadata = { robots: { index: false } };

/** Dev-only page used by e2e specs to drive the calculator entry points without the landing page. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Harness />;
}
