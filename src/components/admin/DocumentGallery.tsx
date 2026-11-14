"use client";
/* eslint-disable @next/next/no-img-element -- KYC files are served by a guarded no-store route, not next/image */
import { useState } from "react";
import { Download, FileText, Maximize2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/format";

export type GalleryDoc = { id: string; type: string; label: string; filename: string; mime: string; sizeBytes: number; sha256: string; superseded: boolean; createdAt: string | null };

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Document tiles with inline preview (image or PDF) and individual downloads. */
export function DocumentGallery({ orderId, docs }: { orderId: string; docs: GalleryDoc[] }) {
  const [preview, setPreview] = useState<GalleryDoc | null>(null);
  const url = (d: GalleryDoc, inline: boolean) => `/api/admin/orders/${orderId}/documents/${d.id}${inline ? "?inline=1" : ""}`;
  if (!docs.length) return <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">No documents uploaded.</p>;
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
        {docs.map((d) => (
          <li key={d.id} className={cn("flex flex-col overflow-hidden rounded-xl border border-line bg-surface", d.superseded && "opacity-60")} data-doc-type={d.type}>
            <button type="button" onClick={() => setPreview(d)} className="group relative aspect-[4/3] bg-bg" aria-label={`Preview ${d.label}`}>
              {d.mime.startsWith("image/") ? (
                <img src={url(d, true)} alt={d.label} loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-2 text-ink-muted">
                  <FileText className="h-10 w-10" />
                  <span className="text-xs">PDF document</span>
                </span>
              )}
              <span className="absolute right-2 top-2 rounded-lg bg-surface/90 p-1.5 opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Maximize2 className="h-4 w-4" />
              </span>
            </button>
            <div className="flex items-start gap-2 border-t border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{d.label}</p>
                <p className="truncate text-xs text-ink-muted" title={d.filename}>{d.filename} · {kb(d.sizeBytes)}</p>
                <p className="truncate font-mono text-[10px] text-ink-muted" title={`SHA-256 ${d.sha256}`}>sha256 {d.sha256.slice(0, 16)}…</p>
                {d.superseded && <Badge className="mt-1">Superseded</Badge>}
              </div>
              <a href={url(d, false)} download className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-xs font-medium hover:border-ink/30" aria-label={`Download ${d.label}`}>
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.label ?? ""} description={preview?.filename} size="lg" className="sm:!max-w-4xl">
        {preview && (
          <div className="flex h-[70vh] items-center justify-center bg-bg p-3">
            {preview.mime.startsWith("image/") ? (
              <img src={url(preview, true)} alt={preview.label} className="max-h-full max-w-full object-contain" />
            ) : (
              <iframe src={url(preview, true)} title={preview.label} className="h-full w-full rounded-lg border border-line bg-white" />
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
