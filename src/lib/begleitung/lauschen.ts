// Wann ist ein Satz zu Ende? (rein, getestet in tests/begleitung/stimmeServer.test.ts
// und tests/begleitung/ohrLive.test.ts – Café-Rauschen)
// Für Mias eigene Aufnahme (letzter Ersatz, wenn live und Browser fehlen): Aus dem Pegel des Mikrofons
// (alle ~50 ms) wird entschieden – weiter zuhören, gleich abschicken (Ring),
// abschicken oder leise aufhören, weil niemand etwas gesagt hat. Es gelten
// dieselben Zeiten wie beim Zuhören über den Browser (`mitschrift.ts`).

import { NICHTS_MS, STILLE_MS, WARTEN_AB_MS } from "@/lib/begleitung/mitschrift";
import { STIMME_GRENZEN } from "@/lib/begleitung/stimmeProtokoll";

export type Lauschen = {
  /** Grundrauschen – wird immer mitgeführt, auch während gesprochen wird (dann nur langsam); -1 = noch nicht gemessen */
  rauschen: number;
  /** Sprech-Pegel (gleitender Mittelwert der lauten Momente) */
  sprech: number;
  /** So viele laute Momente am Stück */
  folge: number;
  /** Es wurde schon gesprochen (mindestens ~150 ms am Stück laut) */
  gesprochen: boolean;
  /** Zeit (ms seit Beginn) des letzten Moments, der nach Sprechen klang */
  letzteLaut: number;
  /** Seit wann es ohne jede Pause nach Sprechen klingt (-1 = gerade nicht) */
  lautSeit: number;
};

export type LauschAktion = "weiter" | "wartet" | "fertig" | "nichts";

/** Leiser als das ist nie Sprache (Effektivwert, 0…1) */
const MIN_LAUT = 0.02;
/** So viele laute Momente am Stück zählen als Sprechen (kein Klappern, kein Husten) */
const FOLGE = 3;
/** Sprechen beginnt erst deutlich über dem Grundrauschen */
const START_FAKTOR = 3;
/** Satz läuft noch, solange der Pegel über diesem Anteil zwischen Rauschen und Sprech-Pegel liegt */
const SPRECH_ANTEIL = 0.4;
/** … und mindestens so weit über dem Rauschen */
const WEITER_FAKTOR = 1.5;
/** Höchstens so lange ohne jede Pause „laut“ (Café, Kinder, Küche) – dann wird abgeschickt */
export const LAUT_MAX_MS = 20_000;

export const neuesLauschen = (): Lauschen => ({ rauschen: -1, sprech: 0, folge: 0, gesprochen: false, letzteLaut: 0, lautSeit: -1 });

/** Grundrauschen mitführen: runter schnell, rauf langsam – während Sprechen sehr langsam */
function rauschenNeu(r: number, pegel: number, laut: boolean): number {
  if (pegel <= r) return r * 0.7 + pegel * 0.3;
  return laut ? r * 0.997 + pegel * 0.003 : r * 0.95 + pegel * 0.05;
}

/**
 * Ein Pegel-Wert `pegel` zur Zeit `t` (ms seit Beginn der Aufnahme). Das Ende
 * ist relativ: der Pegel fällt deutlich unter den Sprech-Pegel (nicht unter
 * einen festen Wert) – so endet ein Satz auch im Café von selbst.
 */
export function lauschSchritt(s: Lauschen, pegel: number, t: number): { s: Lauschen; aktion: LauschAktion } {
  // Erster Wert: höchstens leises Zimmer annehmen (wer sofort spricht, wird trotzdem erkannt)
  const r = s.rauschen < 0 ? Math.max(0.002, Math.min(pegel, MIN_LAUT)) : s.rauschen;
  const laut = pegel > Math.max(MIN_LAUT, r * START_FAKTOR);
  const folge = laut ? s.folge + 1 : 0;
  const gesprochen = s.gesprochen || folge >= FOLGE;
  const sprech = laut ? (s.sprech ? s.sprech * 0.9 + pegel * 0.1 : pegel) : s.sprech;
  // Nach dem ersten Sprechen zählt der Pegel relativ zum Sprech-Pegel
  const schwelle = Math.max(MIN_LAUT, r * WEITER_FAKTOR, r + (sprech - r) * SPRECH_ANTEIL);
  const klingt = gesprochen && (laut || pegel > schwelle);
  const n: Lauschen = {
    rauschen: rauschenNeu(r, pegel, klingt || laut),
    sprech,
    folge,
    gesprochen,
    letzteLaut: klingt ? t : s.letzteLaut,
    lautSeit: klingt ? (s.lautSeit < 0 ? t : s.lautSeit) : -1,
  };
  if (t >= STIMME_GRENZEN.aufnahmeMs) return { s: n, aktion: gesprochen ? "fertig" : "nichts" };
  if (!gesprochen) return { s: n, aktion: t >= NICHTS_MS ? "nichts" : "weiter" };
  if (n.lautSeit >= 0 && t - n.lautSeit >= LAUT_MAX_MS) return { s: n, aktion: "fertig" };
  const still = t - n.letzteLaut;
  return { s: n, aktion: still >= STILLE_MS ? "fertig" : still >= WARTEN_AB_MS ? "wartet" : "weiter" };
}

/** Effektivwert eines Ausschnitts (Zeitbereich, −1…1) */
export function pegelVon(werte: ArrayLike<number>): number {
  let summe = 0;
  for (let i = 0; i < werte.length; i++) summe += werte[i] * werte[i];
  return werte.length ? Math.sqrt(summe / werte.length) : 0;
}
