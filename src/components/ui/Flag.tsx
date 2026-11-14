/* eslint-disable @next/next/no-img-element */
import { flagPath } from "@/data/countries";
import { cn } from "@/lib/format";

/** Flag from /public/flags (downloaded by assets:fetch). "EU" is supported. */
export function Flag({ iso2, className }: { iso2: string; className?: string }) {
  return (
    <img
      src={flagPath(iso2)}
      alt=""
      aria-hidden="true"
      width={20}
      height={15}
      loading="lazy"
      className={cn("inline-block h-[15px] w-5 shrink-0 rounded-[3px] object-cover ring-1 ring-ink/10", className)}
    />
  );
}
