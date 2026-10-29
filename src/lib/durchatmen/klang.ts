"use client";

// Klang fürs Durchatmen (A-051, Tafel 139) per Web Audio: ein weicher
// Sinus-Ton, sanft an und aus – steigt beim Einatmen, fällt beim Ausatmen,
// hält beim Halten. Leises Klingen beim Phasen- bzw. Schrittwechsel, ein tiefer
// Gong am Ende. Nie laut (Gesamtlautstärke klein). Der AudioContext entsteht
// erst nach einer Berührung (iPhone): `klangFreischalten()` im Tipp aufrufen.
// Ohne Web Audio passiert einfach nichts.

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let ton: { osc: OscillatorNode; gain: GainNode } | null = null;

/** Gesamtlautstärke – bewusst leise */
const LAUT = 0.22;
const GRUND = 196; // G3
const OBEN = 262; // C4
const UNTEN = 165; // E3

/** Im Tipp aufrufen (iPhone): Ton darf danach spielen */
export function klangFreischalten() {
  if (typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = LAUT;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

const bereit = () => (ctx && master && ctx.state !== "closed" ? { c: ctx, m: master } : null);

/** Atem-Ton starten (leise, sanft an) */
function tonAn() {
  const b = bereit();
  if (!b || ton) return;
  const osc = b.c.createOscillator();
  const gain = b.c.createGain();
  osc.type = "sine";
  osc.frequency.value = GRUND;
  gain.gain.value = 0.0001;
  osc.connect(gain).connect(b.m);
  osc.start();
  ton = { osc, gain };
}

/** Phase: „ein“ steigt, „aus“ fällt, „halten“ bleibt; Dauer in Sekunden */
export function atemPhase(phase: string, sekunden: number) {
  const b = bereit();
  if (!b) return;
  tonAn();
  if (!ton) return;
  const t = b.c.currentTime;
  const f = ton.osc.frequency;
  const g = ton.gain.gain;
  f.cancelScheduledValues(t);
  g.cancelScheduledValues(t);
  f.setValueAtTime(f.value, t);
  g.setValueAtTime(Math.max(0.0001, g.value), t);
  const ein = phase === "ein" || phase === "nochmal-ein";
  const aus = phase === "aus" || phase === "lang-aus";
  if (ein) {
    f.linearRampToValueAtTime(OBEN, t + sekunden);
    g.linearRampToValueAtTime(0.5, t + Math.min(1.2, sekunden));
  } else if (aus) {
    f.linearRampToValueAtTime(UNTEN, t + sekunden);
    g.linearRampToValueAtTime(0.18, t + sekunden);
  } else {
    g.linearRampToValueAtTime(0.3, t + Math.min(1, sekunden));
  }
}

/** Leises Klingen (Phasen- bzw. Schrittwechsel) */
export function klingen() {
  const b = bereit();
  if (!b) return;
  const t = b.c.currentTime;
  const osc = b.c.createOscillator();
  const gain = b.c.createGain();
  osc.type = "sine";
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  osc.connect(gain).connect(b.m);
  osc.start(t);
  osc.stop(t + 1.5);
}

/** Tiefer, weicher Gong am Ende */
export function gong() {
  tonAus();
  const b = bereit();
  if (!b) return;
  const t = b.c.currentTime;
  for (const [freq, laut] of [
    [110, 0.7],
    [220, 0.3],
    [331, 0.15],
  ] as const) {
    const osc = b.c.createOscillator();
    const gain = b.c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(laut, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    osc.connect(gain).connect(b.m);
    osc.start(t);
    osc.stop(t + 4.6);
  }
}

/** Atem-Ton sanft aus (Pause, Ende, Schließen) */
export function tonAus() {
  const b = bereit();
  const t0 = ton;
  ton = null;
  if (!b || !t0) return;
  const t = b.c.currentTime;
  try {
    t0.gain.gain.cancelScheduledValues(t);
    t0.gain.gain.setValueAtTime(Math.max(0.0001, t0.gain.gain.value), t);
    t0.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    t0.osc.stop(t + 0.9);
  } catch {
    // schon aus
  }
}

/** Kurz vibrieren (wo es geht; iPhone kann das im Browser nicht) */
export function vibrieren(ms = 25) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // nichts zu tun
  }
}
