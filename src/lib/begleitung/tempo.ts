// Tempo messen (Auftrag „Mia schneller und flüssiger“): je Gespräch nur Zahlen
// in ms – Sprechende → Abschicken (Stille), Abschicken → Server erhalten
// (Antwort-Kopf da), → erstes Wort, → erster Satz vorgelesen, → fertig; dazu
// die Zeit des Modells auf dem Server bis zum ersten Wort. Kein Text, keine
// Uhrzeit, keine Kennung; nur auf diesem Gerät (`wasgibts.tempo`, nicht in der
// Sicherung, nie an die KI), die letzten 20. Anzeige: Einstellungen → Daten &
// App → Für Entwickler („Tempo: Median der letzten 20“).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

const MAX = 20;

/** Felder in ms; `weg`: Sofort-Weg (ohne KI) oder KI */
export type TempoMessung = {
  weg: "sofort" | "ki";
  sprache: boolean;
  /** Letztes Wort → abgeschickt */
  stille?: number;
  /** Abgeschickt → Server hat geantwortet (Kopf da) */
  server?: number;
  /** Abgeschickt → erstes Wort der Antwort sichtbar */
  token?: number;
  /** Auf dem Server: Eingang → erstes Wort des Modells */
  modell?: number;
  /** Abgeschickt → erster Satz wird vorgelesen */
  satz?: number;
  /** Abgeschickt → Antwort fertig */
  fertig?: number;
};

const TEMPO_FELDER = ["stille", "server", "modell", "token", "satz", "fertig"] as const;
type Feld = (typeof TEMPO_FELDER)[number];

type TempoState = { version: 1; messungen: TempoMessung[] };

const zahl = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 600_000 ? Math.round(v) : undefined);

/** Nur Zahlen und die beiden Merkmale, höchstens die letzten 20 */
export function migrateTempo(raw: unknown): TempoState | null {
  if (!raw || typeof raw !== "object" || (raw as TempoState).version !== 1) return null;
  const list = Array.isArray((raw as TempoState).messungen) ? (raw as TempoState).messungen : [];
  const messungen = list
    .filter((m): m is TempoMessung => Boolean(m) && typeof m === "object")
    .map((m) => {
      const clean: TempoMessung = { weg: m.weg === "sofort" ? "sofort" : "ki", sprache: m.sprache === true };
      for (const f of TEMPO_FELDER) {
        const v = zahl(m[f]);
        if (v !== undefined) clean[f] = v;
      }
      return clean;
    })
    .slice(-MAX);
  return { version: 1, messungen };
}

const store = createLocalStore("wasgibts.tempo", migrateTempo);

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

export type TempoUebersicht = Record<Feld, number | null> & {
  anzahl: number;
  sofort: number;
  /** Letztes Wort → erste Reaktion (Stille + erstes Wort bzw. erster Satz), nur gesprochene */
  reaktion: number | null;
};

/** Median je Schritt über die letzten 20 */
export function tempoUebersicht(messungen: TempoMessung[]): TempoUebersicht {
  const list = messungen.slice(-MAX);
  const werte = (f: Feld) => list.flatMap((m) => (m[f] === undefined ? [] : [m[f]!]));
  const reaktion = list.flatMap((m) => {
    const erste = Math.min(m.token ?? Infinity, m.satz ?? Infinity);
    return m.sprache && m.stille !== undefined && Number.isFinite(erste) ? [m.stille + erste] : [];
  });
  return {
    ...(Object.fromEntries(TEMPO_FELDER.map((f) => [f, median(werte(f))])) as Record<Feld, number | null>),
    anzahl: list.length,
    sofort: list.filter((m) => m.weg === "sofort").length,
    reaktion: median(reaktion),
  };
}

function speichern(m: TempoMessung) {
  try {
    store.save({ version: 1, messungen: [...(store.load()?.messungen ?? []), m].slice(-MAX) });
  } catch {
    // Messen ist nur zum Nachschauen
  }
}

// --- Die laufende Messung (immer nur eine) -------------------------------------------

const uhr = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

type Lauf = { start: number; m: TempoMessung; liest: boolean; fertig: boolean; gespeichert: boolean };
let lauf: Lauf | null = null;

function vielleichtSpeichern(l: Lauf) {
  if (l.gespeichert || !l.fertig || (l.liest && l.m.satz === undefined)) return;
  l.gespeichert = true;
  speichern(l.m);
}

/** Abgeschickt: neue Messung (die vorige wird gespeichert, wenn sie fertig war) */
export function tempoBeginn(opts: { sprache: boolean; letztesWortAm?: number | null; liest?: boolean }, jetzt = uhr()) {
  if (lauf && lauf.fertig && !lauf.gespeichert) {
    lauf.gespeichert = true;
    speichern(lauf.m);
  }
  const m: TempoMessung = { weg: "ki", sprache: opts.sprache };
  if (opts.sprache && typeof opts.letztesWortAm === "number") m.stille = Math.max(0, Math.round(jetzt - opts.letztesWortAm));
  lauf = { start: jetzt, m, liest: Boolean(opts.liest), fertig: false, gespeichert: false };
}

/** Sofort-Weg: die Antwort kam ohne KI */
export function tempoSofort() {
  if (lauf) lauf.m.weg = "sofort";
}

/** Ein Schritt ist erreicht (zählt nur beim ersten Mal) */
export function tempoMarke(schritt: "server" | "token" | "satz" | "fertig", jetzt = uhr()) {
  const l = lauf;
  if (!l || l.gespeichert) return;
  if (l.m[schritt] === undefined) l.m[schritt] = Math.max(0, Math.round(jetzt - l.start));
  if (schritt === "fertig") {
    l.m.token ??= l.m.fertig;
    l.fertig = true;
  }
  vielleichtSpeichern(l);
}

/** Zeit des Modells auf dem Server bis zum ersten Wort */
export function tempoModell(ms: number | null | undefined) {
  if (lauf && typeof ms === "number") lauf.m.modell = Math.round(ms);
}

/** Wird diese Antwort vorgelesen? (dann wartet das Speichern auf den ersten Satz) */
export function tempoLiest(on: boolean) {
  if (!lauf) return;
  lauf.liest = on;
  vielleichtSpeichern(lauf);
}

export function useTempo(): TempoMessung[] {
  return useExternalStore(store.subscribe, () => store.load()?.messungen ?? null, () => null) ?? [];
}

export function clearTempo() {
  store.save({ version: 1, messungen: [] });
}
