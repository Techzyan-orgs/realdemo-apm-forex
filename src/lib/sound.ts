"use client";
/**
 * Admin notification tones generated with the Web Audio API (no audio files).
 * normal order  : single soft ping 880 Hz, 150 ms
 * high-value    : rising triple chime 660 / 880 / 1175 Hz
 * Sound is ON by default. Browsers only let a page start audio after the user interacts with it,
 * so the first click / key press anywhere on the admin page unlocks it automatically.
 * Turning sound off needs the admin password (see SoundToggle + /api/admin/auth/confirm-password).
 * All calls go through the `sound` object so tests can wrap its methods (window.__apmSound in dev).
 */

// v2: default changed to ON; the old key (default off) is ignored
const PREF_KEY = "apm-admin-sound-v2";

type Listener = (s: SoundState) => void;
export type SoundState = { preference: boolean; unlocked: boolean };

let ctx: AudioContext | null = null;
const listeners = new Set<Listener>();

function tone(ac: AudioContext, freq: number, start: number, duration: number, peak = 0.18) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY) !== "off"; // default on
  } catch {
    return true;
  }
}

export const sound = {
  state: { preference: true, unlocked: false } as SoundState,
  /** counters - handy for debugging and tests */
  calls: { normal: 0, highValue: 0 },

  init() {
    sound.state = { preference: readPref(), unlocked: !!ctx && ctx.state === "running" };
    sound.emit();
    if (sound.state.unlocked) return;
    void sound.unlock(); // succeeds right away if the browser already allows audio
    // otherwise the first interaction anywhere on the page unlocks it
    const onGesture = () => {
      void sound.unlock().then(() => {
        if (sound.state.unlocked) {
          document.removeEventListener("pointerdown", onGesture, true);
          document.removeEventListener("keydown", onGesture, true);
        }
      });
    };
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
  },
  /** Create / resume the AudioContext silently. */
  async unlock() {
    try {
      ctx ??= new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();
      if (ctx.state !== "running")
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 300))]);
    } catch {
      /* audio unavailable */
    }
    const unlocked = !!ctx && ctx.state === "running";
    if (unlocked !== sound.state.unlocked) {
      sound.state = { ...sound.state, unlocked };
      sound.emit();
    }
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit() {
    for (const l of listeners) l({ ...sound.state });
  },
  /** Turn sound back on (from a click); plays a confirmation ping. */
  async enable() {
    await sound.unlock();
    try {
      localStorage.setItem(PREF_KEY, "on");
    } catch {}
    sound.state = { preference: true, unlocked: !!ctx && ctx.state === "running" };
    sound.emit();
    sound.playNormal();
  },
  /** Turn sound off. The UI only calls this after the admin password has been confirmed. */
  disable() {
    try {
      localStorage.setItem(PREF_KEY, "off");
    } catch {}
    sound.state = { ...sound.state, preference: false };
    sound.emit();
  },
  canPlay() {
    return sound.state.preference && !!ctx && ctx.state === "running";
  },
  /** Normal order: single soft ping (880 Hz, 150 ms). */
  playNormal() {
    sound.calls.normal++;
    if (!sound.canPlay() || !ctx) return;
    tone(ctx, 880, ctx.currentTime + 0.01, 0.15, 0.12);
  },
  /** High-value order: distinct triple rising chime (660 / 880 / 1175 Hz). */
  playHighValue() {
    sound.calls.highValue++;
    if (!sound.canPlay() || !ctx) return;
    const t = ctx.currentTime + 0.01;
    [660, 880, 1175].forEach((f, i) => tone(ctx!, f, t + i * 0.16, 0.22, 0.2));
  },
  /** Chooses the tone for a newly created order. */
  notifyOrder(order: { totalInr: number; isHighValue?: boolean }, highValueThresholdInr: number) {
    if (order.isHighValue || order.totalInr > highValueThresholdInr) sound.playHighValue();
    else sound.playNormal();
  },
};

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __apmSound: typeof sound }).__apmSound = sound;
}
