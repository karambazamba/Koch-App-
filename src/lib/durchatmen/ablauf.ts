// Ablauf einer Übung (A-051) – rein und testbar: Wo stehen wir nach `ms`
// Millisekunden (Atem-Phase, Sekunde, Schritt, Rest)? Was ist zwischen zwei
// Zeitpunkten passiert (Phasenwechsel, neuer Schritt, Ende)? `Lauf` treibt das
// mit einer eingespeisten Uhr an (Pause/Weiter), die Oberfläche fragt nur ab.
// Fokus-Übungen: erst das kurze Gespräch (ohne Uhr), dann `atmen` Sekunden
// Atem-Kreis – gezählt wird nur dieser Teil.

import type { Uebung } from "@/lib/durchatmen/uebungen";

export type Stand = {
  ms: number;
  fertig: boolean;
  /** Restzeit in ms */
  rest: number;
  /** 0–1 über die ganze Übung (Fortschrittsbalken) */
  anteil: number;
  /** Atem-Phase (ID der Ansage: „ein“, „halten“, „aus“ …) bzw. null */
  phase: string | null;
  phaseIndex: number;
  /** 0–1 innerhalb der Phase (für Punkt und Kreis) */
  phaseAnteil: number;
  /** Sekunde in der Phase, ab 1 */
  phaseSekunde: number;
  runde: number;
  /** Aktueller Schritt (ID der Ansage) bzw. null */
  schritt: string | null;
  schrittIndex: number;
};

export type Ereignis = { art: "phase"; phase: string; runde: number } | { art: "schritt"; ansage: string } | { art: "ende" };

/** Gezählte Dauer (ms): Fokus nur der Atem-Teil am Ende */
export const laufDauer = (u: Uebung) => (u.atmen ?? u.dauer) * 1000;

const zyklus = (u: Uebung) => u.takt.reduce((s, t) => s + t.s, 0);

export function standBei(u: Uebung, ms: number): Stand {
  const total = laufDauer(u);
  const t = Math.min(Math.max(0, ms), total);
  const fertig = ms >= total;
  let phase: string | null = null;
  let phaseIndex = -1;
  let phaseAnteil = 0;
  let phaseSekunde = 0;
  let runde = 0;
  const z = zyklus(u);
  if (z > 0) {
    const sek = t / 1000;
    runde = Math.floor(sek / z);
    let pos = sek - runde * z;
    phaseIndex = 0;
    while (phaseIndex < u.takt.length - 1 && pos >= u.takt[phaseIndex].s) {
      pos -= u.takt[phaseIndex].s;
      phaseIndex++;
    }
    phase = u.takt[phaseIndex].phase;
    phaseAnteil = Math.min(1, pos / u.takt[phaseIndex].s);
    phaseSekunde = Math.min(u.takt[phaseIndex].s, Math.floor(pos) + 1);
  }
  let schrittIndex = -1;
  u.schritte.forEach((s, i) => {
    if (s.ab * 1000 <= t) schrittIndex = i;
  });
  return {
    ms: t,
    fertig,
    rest: total - t,
    anteil: total ? t / total : 1,
    phase,
    phaseIndex,
    phaseAnteil,
    phaseSekunde,
    runde,
    schritt: schrittIndex >= 0 ? u.schritte[schrittIndex].ansage : null,
    schrittIndex,
  };
}

/** Was zwischen `von` (ausschließlich; < 0 = vor dem Start) und `bis` passiert ist */
export function ereignisse(u: Uebung, von: number, bis: number): Ereignis[] {
  const total = laufDauer(u);
  const out: Ereignis[] = [];
  if (bis <= von) return out;
  const z = zyklus(u) * 1000;
  if (z > 0) {
    // Jeder Phasenbeginn im Zeitraum (vor dem Ende)
    let start = 0;
    for (let runde = 0; start < total; runde++) {
      for (const t of u.takt) {
        if (start >= total) break;
        if (start > von && start <= bis) out.push({ art: "phase", phase: t.phase, runde });
        start += t.s * 1000;
      }
    }
  }
  for (const s of u.schritte) {
    const at = s.ab * 1000;
    if (at > von && at <= bis && at < total) out.push({ art: "schritt", ansage: s.ansage });
  }
  if (total > von && total <= bis) out.push({ art: "ende" });
  return out;
}

/**
 * Eine laufende Übung: Uhr eingespeist (ms, stetig steigend), Pause hält die
 * Zeit an. `tick()` liefert den Stand und meldet Ereignisse seit dem letzten
 * Aufruf genau einmal.
 */
export class Lauf {
  private bisher = 0;
  private seit: number | null = null;
  private gemeldet = -1;

  constructor(
    readonly uebung: Uebung,
    private readonly uhr: () => number,
    private readonly melden: (e: Ereignis) => void = () => {},
  ) {}

  /** Vergangene Übungszeit (ms) */
  zeit(): number {
    return this.bisher + (this.seit === null ? 0 : this.uhr() - this.seit);
  }

  get laeuft() {
    return this.seit !== null;
  }

  start() {
    if (this.seit === null) this.seit = this.uhr();
    return this.tick();
  }

  pause() {
    if (this.seit === null) return;
    this.bisher = this.zeit();
    this.seit = null;
  }

  weiter() {
    if (this.seit === null && !this.fertig) this.seit = this.uhr();
  }

  get fertig() {
    return this.zeit() >= laufDauer(this.uebung);
  }

  tick(): Stand {
    const jetzt = Math.min(this.zeit(), laufDauer(this.uebung));
    for (const e of ereignisse(this.uebung, this.gemeldet, jetzt)) this.melden(e);
    // Erster Aufruf (gemeldet = −1) meldet den Beginn (Zeitpunkt 0) mit
    this.gemeldet = jetzt;
    const stand = standBei(this.uebung, jetzt);
    if (stand.fertig) this.pause();
    return stand;
  }
}
