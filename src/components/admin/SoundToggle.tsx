"use client";
import { useEffect, useState } from "react";
import { BellOff, BellRing, Lock, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/format";
import { sound, type SoundState } from "@/lib/sound";

/**
 * New-order sounds are ON by default. Browsers need one interaction before a page may play audio,
 * so until then the button asks for a click (any click on the page works). Turning sound OFF needs
 * the admin password; turning it back on does not.
 */
export function SoundToggle() {
  const [s, setS] = useState<SoundState>({ preference: true, unlocked: false });
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const off = sound.subscribe(setS);
    sound.init();
    return () => {
      off();
    };
  }, []);

  const on = s.preference && s.unlocked;
  const waiting = s.preference && !s.unlocked;

  return (
    <>
      <button
        type="button"
        onClick={() =>
          s.preference ? (waiting ? void sound.unlock() : setConfirming(true)) : void sound.enable()
        }
        aria-pressed={s.preference}
        data-testid="sound-toggle"
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
          on && "border-accent/30 bg-accent-soft text-accent hover:bg-accent/15",
          waiting && "animate-pulse border-warn/30 bg-warn-soft text-warn",
          !s.preference && "border-line text-ink-muted hover:text-ink",
        )}
        title={
          on
            ? "Order sounds on - turning off needs the admin password"
            : waiting
              ? "Click anywhere on the page to allow sound"
              : "Turn order sounds back on"
        }
      >
        {on ? (
          <Volume2 className="h-4 w-4" />
        ) : waiting ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        )}
        {on ? "Sound on" : waiting ? "Click anywhere to turn on sound" : "Sound off"}
        {on && <Lock className="h-3 w-3 opacity-60" aria-label="(password needed to turn off)" />}
      </button>
      {confirming && <ConfirmMuteDialog onClose={() => setConfirming(false)} />}
    </>
  );
}

function ConfirmMuteDialog({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [required, setRequired] = useState(true);
  useEffect(() => {
    fetch("/api/admin/auth/confirm-password")
      .then((r) => r.json())
      .then((b) => setRequired(b.required !== false))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/confirm-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, purpose: "sound_off" }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      sound.disable();
      onClose();
      return;
    }
    const body = await res?.json().catch(() => null);
    setError(body?.error?.message ?? "Could not check the password. Try again.");
    setPassword("");
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Turn off order sounds?"
      description="You won't hear new or high-value orders arrive."
      size="sm"
      mobileSheet={false}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5" noValidate>
        {!required && (
          <p className="text-sm text-ink-muted">
            Admin login is turned off on this server, so no password is needed.
          </p>
        )}
        {required && (
          <Field label="Admin password" error={error ?? undefined}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                autoFocus
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep sound on
          </Button>
          <Button type="submit" variant="danger" disabled={busy || (required && !password)}>
            <BellOff className="h-4 w-4" aria-hidden="true" /> {busy ? "Checking…" : "Turn off"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
