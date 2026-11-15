"use client";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/format";
import { MOBILE10_RE } from "@/lib/schemas";

type Props = {
  source?: "CALLBACK" | "CONTACT_FORM" | "CAP_EXCEEDED";
  defaultNote?: string;
  showPreferredTime?: boolean;
  noteLabel?: string;
  submitLabel?: string;
  onDone?: () => void;
  className?: string;
};

type Errors = Partial<Record<"name" | "mobile" | "note" | "_", string>>;

/** Shared form for Request a Call (modal) and the Contact enquiry form. Creates a CallbackRequest. */
export function CallbackForm({ source = "CALLBACK", defaultNote = "", showPreferredTime = true, noteLabel = "Anything we should know?", submitLabel = "Request a call", onDone, className }: Props) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState(defaultNote);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Errors = {};
    if (name.trim().length < 2) errs.name = "Enter your name";
    if (!MOBILE10_RE.test(mobile)) errs.mobile = "Enter a valid 10-digit mobile number starting with 6-9";
    if (source === "CONTACT_FORM" && note.trim().length < 3) errs.note = "Tell us briefly how we can help";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mobile, preferred_time: time || undefined, note: note.trim() || undefined, source }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: { message?: string; fields?: Record<string, string> } } | null;
        setErrors({ ...(j?.error?.fields ?? {}), _: j?.error?.message ?? "Something went wrong. Please try again." });
        return;
      }
      setDone(true);
    } catch {
      setErrors({ _: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div role="status" className={cn("flex flex-col items-center gap-3 py-6 text-center", className)}>
        <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
        <p className="font-display text-lg font-semibold">Thank you, {name.split(" ")[0]}.</p>
        <p className="max-w-xs text-sm text-ink-muted">A member of our team will call you on +91 {mobile} during store hours.</p>
        {onDone && (
          <Button variant="secondary" onClick={onDone} className="mt-2">
            Close
          </Button>
        )}
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className={cn("grid gap-4", className)}>
      <Field label="Your name" required error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} aria-invalid={invalid} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </Field>
      <Field label="Mobile number" required error={errors.mobile}>
        {({ id, describedBy, invalid }) => (
          <div className={cn(inputClass, "flex items-center gap-2 p-0 pl-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20", invalid && "border-danger")}>
            <span className="text-sm text-ink-muted">+91</span>
            <input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              className="h-full min-w-0 flex-1 rounded-r-xl bg-transparent pr-3 outline-none"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
        )}
      </Field>
      {showPreferredTime && (
        <Field label="Preferred time" optional>
          {({ id }) => (
            <select id={id} className={inputClass} value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="">Any time</option>
              <option>Morning (10am - 1pm)</option>
              <option>Afternoon (1pm - 4pm)</option>
              <option>Evening (4pm - 7pm)</option>
            </select>
          )}
        </Field>
      )}
      <Field label={noteLabel} optional={source !== "CONTACT_FORM"} required={source === "CONTACT_FORM"} error={errors.note}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            rows={3}
            maxLength={500}
            className={cn(inputClass, "h-auto py-2.5")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <p aria-live="assertive" className={cn("text-sm text-danger", !errors._ && "sr-only")}>
        {errors._ ?? ""}
      </p>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Sending…" : submitLabel}
      </Button>
      <p className="text-xs text-ink-muted">
        We use your number only to call you back. See our{" "}
        <a href="/privacy" className="underline underline-offset-2">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
