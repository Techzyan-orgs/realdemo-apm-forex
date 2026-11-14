"use client";
/* eslint-disable @next/next/no-img-element */
import { CheckCircle2, FileText, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { COMPLIANCE } from "@/config/compliance";
import { cn } from "@/lib/format";

const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

export function clientFileError(f: File): string | null {
  if (f.size > COMPLIANCE.uploads.kycMaxBytes) return "File is larger than 5 MB";
  const okType = COMPLIANCE.uploads.kycMimes.includes(f.type) || /\.(jpe?g|png|webp|pdf)$/i.test(f.name);
  return okType ? null : "Upload a JPG, PNG, WEBP or PDF file";
}

/** Drag-drop upload tile with thumbnail preview, replace and remove. */
export function DocumentTile({
  code,
  label,
  hint,
  required,
  file,
  onFile,
  onRemove,
  error,
  onFileExists,
}: {
  code: string;
  label: string;
  hint?: string;
  required: boolean;
  file: File | null;
  onFile: (f: File) => void;
  onRemove: () => void;
  error?: string;
  /** a copy is already on file (re-submission / staff entry) */
  onFileExists?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      const t = setTimeout(() => setPreview(null), 0);
      return () => clearTimeout(t);
    }
    const url = URL.createObjectURL(file);
    const t = setTimeout(() => setPreview(url), 0);
    return () => {
      clearTimeout(t);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const take = (f: File | undefined) => {
    if (!f) return;
    const err = clientFileError(f);
    setLocalErr(err);
    if (!err) onFile(f);
  };
  const shownError = localErr ?? error;

  return (
    <div data-testid={`doc-${code}`} data-required={required ? "true" : "false"} id={`doc-${code}`}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true" data-required-marker>
              *
            </span>
          ) : (
            <span className="ml-1.5 text-xs font-normal text-ink-muted">(optional)</span>
          )}
        </label>
      </div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex min-h-[112px] items-center gap-3 rounded-2xl border border-dashed p-3 transition",
          drag ? "border-accent bg-accent-soft" : file ? "border-line bg-surface" : "border-line bg-bg hover:border-ink/25",
          shownError && "border-danger/50 bg-danger/5",
        )}
      >
        <input
          ref={input}
          id={id}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          data-testid={`doc-input-${code}`}
          aria-invalid={!!shownError}
          aria-describedby={`${id}-msg`}
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {file ? (
          <>
            <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-bg ring-1 ring-line">
              {preview ? <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" /> : <FileText className="h-8 w-8 text-ink-muted" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-medium text-ink">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> <span className="truncate">{file.name}</span>
              </p>
              <p className="num text-xs text-ink-muted">{(file.size / 1024).toFixed(0)} KB</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium hover:border-ink/30">
                  <RefreshCw className="h-3.5 w-3.5" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalErr(null);
                    onRemove();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10"
                  aria-label={`Remove ${label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="flex w-full items-center gap-3 text-left">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-accent ring-1 ring-line">
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{onFileExists ? "On file - upload to replace" : "Drag & drop or browse"}</span>
              <span className="block text-xs text-ink-muted">JPG, PNG, WEBP or PDF · max 5 MB</span>
            </span>
          </button>
        )}
      </div>
      <p id={`${id}-msg`} aria-live="polite" className={cn("mt-1 text-xs", shownError ? "text-danger" : "text-ink-muted", !shownError && !hint && "sr-only")}>
        {shownError ?? hint ?? ""}
      </p>
    </div>
  );
}
