// Ablauf einer Sprachnachricht (rein, ohne Mikrofon): Antippen startet die
// Aufnahme und sie läuft frei weiter („tippen“) – wie bei WhatsApp. Gedrückt
// halten bleibt als Abkürzung: loslassen = senden, beim Halten nach oben
// schieben = frei sprechen (weiter wie Antippen). Höchstens 60 s: dann hält die
// Aufnahme an und wartet auf Senden oder Verwerfen (nie automatisch senden).
// App/Seite verlassen hält ebenfalls an.

import { MEMO_MAX_S } from "@/lib/pinnwand/memo";

type MemoPhase = "bereit" | "fragt" | "nimmt_auf" | "gestoppt";
export type MemoMode = "tippen" | "halten";

export type MemoState = {
  phase: MemoPhase;
  mode: MemoMode | null;
  /** Aufnahmezeit in ms */
  ms: number;
  /** Was zuletzt passiert ist (für die kurze Bestätigung) */
  outcome: "gesendet" | "verworfen" | null;
};

export type MemoEvent =
  | { type: "start"; mode: MemoMode }
  | { type: "ready" }
  | { type: "denied" }
  /** Finger losgelassen: wie lange gedrückt, nach oben geschoben? */
  | { type: "release"; pressMs: number; slideUp: boolean }
  | { type: "tick"; ms: number }
  | { type: "hidden" }
  | { type: "send" }
  | { type: "discard" }
  /** „Verworfen · Rückgängig“ */
  | { type: "undo"; ms: number };

/** Kürzer gedrückt = Antippen (Aufnahme läuft frei weiter) */
const TAP_MS = 300;
/** So weit nach oben schieben = frei sprechen */
export const LOCK_PX = 60;
/** Ab hier Zeit in Akzentfarbe */
const WARN_MS = 50_000;
/** Ab dieser Länge fragt Verwerfen nach (mit Rückgängig) */
const UNDO_FROM_MS = 3_000;

export const MEMO_IDLE: MemoState = { phase: "bereit", mode: null, ms: 0, outcome: null };

const active = (s: MemoState) => s.phase === "fragt" || s.phase === "nimmt_auf" || s.phase === "gestoppt";

export function memoReducer(s: MemoState, e: MemoEvent): MemoState {
  switch (e.type) {
    case "start":
      return s.phase === "bereit" ? { phase: "fragt", mode: e.mode, ms: 0, outcome: null } : s;
    case "ready":
      return s.phase === "fragt" ? { ...s, phase: "nimmt_auf" } : s;
    case "denied":
      return s.phase === "fragt" ? MEMO_IDLE : s;
    case "release":
      if (s.mode !== "halten" || (s.phase !== "nimmt_auf" && s.phase !== "fragt")) return s;
      // Kurz angetippt oder nach oben geschoben: frei weiter sprechen
      if (e.pressMs < TAP_MS || e.slideUp) return { ...s, mode: "tippen" };
      return { ...MEMO_IDLE, outcome: "gesendet" };
    case "tick":
      if (s.phase !== "nimmt_auf") return s;
      return e.ms >= MEMO_MAX_S * 1000 ? { ...s, ms: MEMO_MAX_S * 1000, phase: "gestoppt", mode: "tippen" } : { ...s, ms: e.ms };
    case "hidden":
      return s.phase === "nimmt_auf" ? { ...s, phase: "gestoppt", mode: "tippen" } : s;
    case "send":
      return active(s) ? { ...MEMO_IDLE, outcome: "gesendet" } : s;
    case "discard":
      return active(s) ? { ...MEMO_IDLE, outcome: "verworfen" } : s;
    case "undo":
      return s.phase === "bereit" && s.outcome === "verworfen" ? { phase: "gestoppt", mode: "tippen", ms: e.ms, outcome: null } : s;
  }
}

/** Zeit in Akzentfarbe (bald ist Schluss) */
export const timeWarns = (ms: number) => ms >= WARN_MS;

/** Verwerfen fragt mit „Rückgängig“ nach (kurze Aufnahmen gehen still weg) */
export const discardNeedsUndo = (ms: number) => ms >= UNDO_FROM_MS;

/** Ansage für VoiceOver alle 10 s („10 Sekunden“) – sonst null */
export function timeAnnouncement(ms: number): string | null {
  const s = Math.floor(ms / 1000);
  return s > 0 && s % 10 === 0 ? `${s} Sekunden` : null;
}
