"use client";
/**
 * Admin notification tones generated with the Web Audio API (no audio files).
 * normal order  : single soft ping 880 Hz, 150 ms
 * high-value    : rising triple chime 660 / 880 / 1175 Hz
 * Browsers block autoplay, so audio must be unlocked by a click once per session.
 * All calls go through the `sound` object so tests can wrap its methods (window.__apmSound in dev).
 */

const PREF_KEY = "apm-admin-sound";

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
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

export const sound = {
  state: { preference: false, unlocked: false } as SoundState,
  /** counters - handy for debugging and tests */
  calls: { normal: 0, highValue: 0 },

  init() {
    sound.state = { preference: readPref(), unlocked: !!ctx && ctx.state === "running" };
    sound.emit();
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  emit() {
    for (const l of listeners) l({ ...sound.state });
  },
  /** Must be called from a user gesture (click). */
  async enable() {
    try {
      ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      await ctx.resume();
    } catch {
      /* audio unavailable */
    }
    try {
      localStorage.setItem(PREF_KEY, "on");
    } catch {}
    sound.state = { preference: true, unlocked: !!ctx && ctx.state === "running" };
    sound.emit();
    sound.playNormal();
  },
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
