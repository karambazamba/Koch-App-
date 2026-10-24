// Wann ist ein Satz zu Ende? (rein, getestet in tests/begleitung/stimmeServer.test.ts)
// Für Mias eigene Aufnahme (Ohr vom Server): Aus dem Pegel des Mikrofons
// (alle ~50 ms) wird entschieden – weiter zuhören, gleich abschicken (Ring),
// abschicken oder leise aufhören, weil niemand etwas gesagt hat. Es gelten
// dieselben Zeiten wie beim Zuhören über den Browser (`mitschrift.ts`).

import { NICHTS_MS, STILLE_MS, WARTEN_AB_MS } from "@/lib/begleitung/mitschrift";
import { STIMME_GRENZEN } from "@/lib/begleitung/stimmeProtokoll";

export type Lauschen = {
  /** Grundrauschen (gleitender Mittelwert der leisen Momente) */
  rauschen: number;
  /** So viele laute Momente am Stück */
  folge: number;
  /** Es wurde schon gesprochen (mindestens ~150 ms am Stück laut) */
  gesprochen: boolean;
  /** Zeit (ms seit Beginn) des letzten lauten Moments */
  letzteLaut: number;
};

export type LauschAktion = "weiter" | "wartet" | "fertig" | "nichts";

/** Leiser als das ist nie Sprache (Effektivwert, 0…1) */
const MIN_LAUT = 0.02;
/** So viele laute Momente am Stück zählen als Sprechen (kein Klappern, kein Husten) */
const FOLGE = 3;

export const neuesLauschen = (): Lauschen => ({ rauschen: 0.008, folge: 0, gesprochen: false, letzteLaut: 0 });

/** Ein Pegel-Wert `pegel` zur Zeit `t` (ms seit Beginn der Aufnahme) */
export function lauschSchritt(s: Lauschen, pegel: number, t: number): { s: Lauschen; aktion: LauschAktion } {
  const laut = pegel > Math.max(MIN_LAUT, s.rauschen * 3);
  const folge = laut ? s.folge + 1 : 0;
  const gesprochen = s.gesprochen || folge >= FOLGE;
  const n: Lauschen = {
    rauschen: laut ? s.rauschen : s.rauschen * 0.95 + pegel * 0.05,
    folge,
    gesprochen,
    letzteLaut: laut && gesprochen ? t : s.letzteLaut,
  };
  if (t >= STIMME_GRENZEN.aufnahmeMs) return { s: n, aktion: gesprochen ? "fertig" : "nichts" };
  if (!gesprochen) return { s: n, aktion: t >= NICHTS_MS ? "nichts" : "weiter" };
  const still = t - n.letzteLaut;
  return { s: n, aktion: still >= STILLE_MS ? "fertig" : still >= WARTEN_AB_MS ? "wartet" : "weiter" };
}

/** Effektivwert eines Ausschnitts (Zeitbereich, −1…1) */
export function pegelVon(werte: ArrayLike<number>): number {
  let summe = 0;
  for (let i = 0; i < werte.length; i++) summe += werte[i] * werte[i];
  return werte.length ? Math.sqrt(summe / werte.length) : 0;
}
