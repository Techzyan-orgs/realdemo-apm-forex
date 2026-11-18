"use client";
import { ArrowRight, Eye, EyeOff, Lock, Mail, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/format";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.assign(next); // full load so the proxy sees the new cookie
      return;
    }
    const body = await res?.json().catch(() => null);
    setError(body?.error?.message ?? "Could not sign in. Check your connection and try again.");
    setPassword("");
    setBusy(false);
  }

  const caps = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5" data-testid="admin-login">
      <Field label="Email">
        {({ id }) => (
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id={id}
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(inputClass, "h-12 pl-10")}
            />
          </div>
        )}
      </Field>
      <Field
        label="Password"
        hint={
          capsLock ? (
            <span className="inline-flex items-center gap-1 font-medium text-warn">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Caps Lock is on
            </span>
          ) : undefined
        }
      >
        {({ id, describedBy }) => (
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id={id}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              aria-describedby={describedBy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={caps}
              onKeyUp={caps}
              className={cn(inputClass, "h-12 pl-10 pr-12")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
      </Field>

      <p
        role="alert"
        aria-live="assertive"
        className={
          error
            ? "flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
            : "sr-only"
        }
      >
        {error && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        {error ?? ""}
      </p>

      <button
        type="submit"
        disabled={busy}
        className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-ink transition-colors hover:bg-[#0c625b] disabled:opacity-70"
      >
        {busy ? "Signing in…" : "Sign in"}
        {!busy && (
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        )}
      </button>

      <p className="text-center text-xs leading-5 text-ink-muted">
        Sessions last 12 hours. After 5 wrong attempts, sign-in is paused for 15 minutes.
      </p>
    </form>
  );
}
