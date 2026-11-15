"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { sound, type SoundState } from "@/lib/sound";
import { cn } from "@/lib/format";

/** Browsers block autoplay: the admin clicks once per session to unlock audio. Preference is remembered. */
export function SoundToggle() {
  const [s, setS] = useState<SoundState>({ preference: false, unlocked: false });
  useEffect(() => {
    const off = sound.subscribe(setS);
    sound.init();
    return () => {
      off();
    };
  }, []);
  const active = s.preference && s.unlocked;
  const needsClick = s.preference && !s.unlocked;
  return (
    <button
      type="button"
      onClick={() => (active ? sound.disable() : sound.enable())}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
        active ? "border-accent/30 bg-accent-soft text-accent" : needsClick ? "border-warn/30 bg-warn-soft text-warn" : "border-line text-ink-muted hover:text-ink",
      )}
      title={active ? "Sound on - click to mute" : "Enable order sounds"}
    >
      {active ? <Volume2 className="h-4 w-4" /> : needsClick ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" aria-label="Muted" />}
      {active ? "Sound on" : "Enable sound"}
    </button>
  );
}
