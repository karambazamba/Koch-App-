// Mini-Kreise oben auf der Startseite (A-050, Tafel 143 – ersetzt Tafel 136/137/1):
// eine Reihe mit bis zu 5 runden Kreisen direkt unter der Kopfzeile (die
// Jetzt-Karte steht darüber), nicht wischbar. Je Kreis EIN Wort darunter, nie
// eine zweite Zeile, nie „…“. 5 Kreise = 56 px, 4 oder weniger = 64 px.
// Keine Schilder, Zahlen oder Plaketten – einziges Zeichen ist der
// Wochen-Ring bei Sport und die Restzeit im Timer-Kreis, solange ein Timer
// läuft (dann rückt er an Position 1, danach zurück an seinen Platz).
// Rein und testbar: welche Kreise in welcher Reihenfolge stehen, gespeichert
// in der Startseiten-Anordnung (`core/homeLayout`, Feld `kreise`).

import { formatLeft, isRunning, leftMs, type Timer } from "@/lib/timer/model";

export type KreisId = "sport" | "pause" | "waslos" | "raetsel" | "timer";

/** Ein Kreis in der gespeicherten Reihenfolge: an oder aus (aus = ausgeblendet, nie gelöscht) */
export type Kreis = { id: KreisId; an: boolean };

/**
 * Alle Kreise in Standard-Reihenfolge (Tafel 143): Wort unter dem Kreis und
 * Kachelfarbe des Bereichs (`data-tone`). Pause = Mint (Durchatmen), Was los?
 * = Blau (Lavendel der Termine), Rätsel = Pfirsich, Timer = Sand.
 */
export const KREISE: { id: KreisId; wort: string; name: string; tone: string }[] = [
  { id: "sport", wort: "Sport", name: "Sport", tone: "sport" },
  { id: "pause", wort: "Pause", name: "Pause (Durchatmen)", tone: "aufgaben" },
  { id: "waslos", wort: "Was los?", name: "Was los?", tone: "termine" },
  { id: "raetsel", wort: "Rätsel", name: "Rätsel", tone: "essen" },
  { id: "timer", wort: "Timer", name: "Timer", tone: "timer" },
];

/** Höchstens so viele Kreise stehen in der Reihe */
export const MAX_KREISE = 5;

export const KREIS_IDS = KREISE.map((k) => k.id);

export const kreisMeta = (id: KreisId) => KREISE.find((k) => k.id === id)!;

/** Standard: alle an, in der Reihenfolge der Tafel */
export const STANDARD_KREISE: Kreis[] = KREIS_IDS.map((id) => ({ id, an: true }));

/** Gespeicherten Wert prüfen: Unbekanntes weg, Doppeltes weg, Fehlendes an seinem Standard-Platz (an) */
export function sanitizeKreise(raw: unknown): Kreis[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<KreisId>();
  const out: Kreis[] = [];
  for (const k of list) {
    const id = (k as Kreis | null)?.id;
    if (!KREIS_IDS.includes(id as KreisId) || seen.has(id as KreisId)) continue;
    seen.add(id as KreisId);
    out.push({ id: id as KreisId, an: (k as Kreis).an !== false });
  }
  for (const id of KREIS_IDS) {
    if (seen.has(id)) continue;
    // Neuer Kreis: hinter den, der laut Standard davor steht
    const vor = KREIS_IDS.slice(0, KREIS_IDS.indexOf(id)).reverse().find((v) => seen.has(v));
    const at = vor ? out.findIndex((k) => k.id === vor) + 1 : 0;
    out.splice(at, 0, { id, an: true });
    seen.add(id);
  }
  return out;
}

export type KreisAktion = "an" | "aus" | "nach_vorn" | "nach_hinten" | "hoch" | "runter";
export type KreisAenderung = { kreis: KreisId; aktion: KreisAktion };

export const KREIS_AKTIONEN: KreisAktion[] = ["an", "aus", "nach_vorn", "nach_hinten", "hoch", "runter"];

/** Eine Änderung anwenden (rein): an/aus, ganz nach vorn/hinten, eins hoch/runter */
export function aendereKreise(kreise: Kreis[], change: KreisAenderung): Kreis[] {
  const list = sanitizeKreise(kreise);
  const i = list.findIndex((k) => k.id === change.kreis);
  if (i < 0) return list;
  const k = list[i];
  const ohne = list.filter((_, n) => n !== i);
  switch (change.aktion) {
    case "an":
    case "aus":
      return list.map((x, n) => (n === i ? { ...x, an: change.aktion === "an" } : x));
    case "nach_vorn":
      return [{ ...k, an: true }, ...ohne];
    case "nach_hinten":
      return [...ohne, k];
    case "hoch":
      ohne.splice(Math.max(0, i - 1), 0, k);
      return ohne;
    case "runter":
      ohne.splice(Math.min(ohne.length, i + 1), 0, k);
      return ohne;
  }
}

/** Neue Reihenfolge (Ziehen im Bearbeiten) – an/aus bleibt */
export function ordneKreise(kreise: Kreis[], order: KreisId[]): Kreis[] {
  const list = sanitizeKreise(kreise);
  return sanitizeKreise([...order.map((id) => list.find((k) => k.id === id)), ...list.filter((k) => !order.includes(k.id))].filter(Boolean));
}

/** Kurze Bestätigung („Rätsel ist oben raus.“) */
export function beschreibeKreis(change: KreisAenderung): string {
  const wort = kreisMeta(change.kreis).wort.replace(/\?$/, "");
  switch (change.aktion) {
    case "an":
      return `${wort} steht wieder oben.`;
    case "aus":
      return `${wort} ist oben raus. In „Startseite bearbeiten“ holst du es zurück.`;
    case "nach_vorn":
      return `${wort} steht jetzt vorn.`;
    case "nach_hinten":
      return `${wort} steht jetzt hinten.`;
    default:
      return `${wort} ist verschoben.`;
  }
}

/** Was gerade da ist: Bausteine an, Quelle für „Was los?“, läuft ein Timer */
export type KreisLage = { sport: boolean; pause: boolean; waslos: boolean; timerLaeuft: boolean };

/**
 * Welche Kreise jetzt stehen, in dieser Reihenfolge: nur eingeschaltete
 * Kreise, deren Baustein an ist (Sport, Pause = Durchatmen) bzw. die etwas
 * haben (Was los?: Einträge in den nächsten 14 Tagen). Timer: wenn an –
 * oder immer, solange einer läuft; läuft einer, steht er vorn. Mehr als
 * `MAX_KREISE`: hinten fällt weg, der laufende Timer nie.
 */
export function sichtbareKreise(kreise: Kreis[], lage: KreisLage): KreisId[] {
  const da = (k: Kreis) => {
    if (k.id === "timer") return k.an || lage.timerLaeuft;
    if (!k.an) return false;
    if (k.id === "raetsel") return true;
    return lage[k.id];
  };
  let ids = sanitizeKreise(kreise).filter(da).map((k) => k.id);
  if (lage.timerLaeuft) ids = ["timer", ...ids.filter((id) => id !== "timer")];
  while (ids.length > MAX_KREISE) {
    const weg = ids.map((id, n) => (id === "timer" && lage.timerLaeuft ? -1 : n)).filter((n) => n >= 0).pop()!;
    ids = ids.filter((_, n) => n !== weg);
  }
  return ids;
}

/** Größe der Kreise: 5 = 56 px (Symbol 23, Wort 12,5 px), 4 oder weniger = 64 px (Symbol 26, Wort 13 px) */
export function kreisMasse(anzahl: number): { kreis: number; symbol: number; wort: number } {
  return anzahl >= 5 ? { kreis: 56, symbol: 23, wort: 12.5 } : { kreis: 64, symbol: 26, wort: 13 };
}

/** Sport-Ring: Stücke = Wochenziel (ohne Ziel 3), gefüllt je Training, geschafft = grün */
export function sportRing(trainings: number, ziel: number | null, ohneZiel = 3): { stuecke: number; voll: number; geschafft: boolean } {
  const stuecke = Math.max(1, Math.min(7, ziel ?? ohneZiel));
  return { stuecke, voll: Math.min(stuecke, Math.max(0, trainings)), geschafft: ziel !== null && trainings >= ziel };
}

/** Bögen eines Rings aus `stuecke` gleichen Teilen mit kleiner Lücke (Grad, oben beginnend, im Uhrzeigersinn) */
export function ringBoegen(stuecke: number, luecke = 10): { von: number; bis: number }[] {
  if (stuecke <= 1) return [{ von: 0, bis: 359.99 }];
  const teil = 360 / stuecke;
  return Array.from({ length: stuecke }, (_, n) => ({ von: n * teil + luecke / 2, bis: (n + 1) * teil - luecke / 2 }));
}

/**
 * „Was los?“ (A-055, Tafel 142 – kommt nach A-050): hat der Kreis etwas zu
 * zeigen (Quelle an und ein Eintrag in den nächsten 14 Tagen)? Bis A-055
 * die Quelle anbindet: nie – der Kreis bleibt ausgeblendet.
 */
export function wasLosVerfuegbar(): boolean {
  return false;
}

/** Timer-Kreis, solange einer läuft: Restzeit des kürzesten („7:42“), Anteil für den Ring (1 = gerade gestartet), Name */
export function timerImKreis(timers: readonly Timer[], nowMs: number): { rest: string; anteil: number; name: string; leftMs: number } | null {
  const laufend = timers.filter((t) => isRunning(t, nowMs)).sort((a, b) => leftMs(a, nowMs) - leftMs(b, nowMs));
  const t = laufend[0];
  if (!t) return null;
  const left = leftMs(t, nowMs);
  return { rest: formatLeft(left), anteil: t.durationMs > 0 ? Math.max(0, Math.min(1, left / t.durationMs)) : 0, name: t.name, leftMs: left };
}
