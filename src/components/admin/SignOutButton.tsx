"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload so the proxy sees the cookie change
    window.location.assign("/admin/login");
  }
  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-white/90 ring-1 ring-inset ring-white/25 hover:bg-white/10 disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
