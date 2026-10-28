// Erledigte Aufgaben nur 12 Stunden (A-043). EINE Regel für jede Aufgabe –
// egal welcher Raum, wem sie gehört oder wer sie abgehakt hat (später auch
// Familien-Aufgaben mit „erledigt von Lisa“, A-034): Aufgaben-Seite,
// Aufgabe-Kachel, Abgegeben und Mia rechnen alle hier.
//
// - Abhaken merkt sich den Zeitpunkt: einmalige Aufgaben `doneAt`, Serien je
//   Runde `doneTimes[datum]` (setDone in model.ts).
// - Höchstens 12 Stunden danach steht sie unter „Erledigt ⌄“, dann ist sie
//   still weg. Kein Archiv, keine Zahl.
// - Einmalige Aufgaben werden danach gelöscht (`ohneAbgelaufene`, Speicher
//   `erledigteAufraeumen` in store.ts) – der Abgleich macht daraus wie beim
//   Löschen die Lösch-Markierung, damit alle Geräte gleich sind. Nur ohne
//   „Gelöscht · Rückgängig“. Idempotent: räumt ein zweites Gerät dasselbe
//   auf, ändert sich nichts mehr.
// - Serien: nur die erledigte Runde fällt aus „Erledigt“, die Reihe bleibt.
// - Ohne Zeitpunkt (abgehakt vor dem Update, alte Sicherung) gilt eine
//   erledigte Aufgabe als alt und wird beim ersten Start einmal still entfernt.
// - Wieder offen (Häkchen antippen) löscht den Zeitpunkt – dann bleibt sie.
// Rein.

import type { AufgabeData, CalendarEntry } from "@/lib/kalender/model";

/** So lange steht Erledigtes unter „Erledigt“ */
const ERLEDIGT_STUNDEN = 12;
const FENSTER_MS = ERLEDIGT_STUNDEN * 60 * 60 * 1000;

/** Wann diese Runde abgehakt wurde (einmalig `doneAt`, Serie `doneTimes[datum]`) – ohne = alt */
export function abgehaktUm(a: Pick<AufgabeData, "repeat" | "doneOn" | "doneAt" | "doneTimes">, date?: string): string | null {
  if (a.repeat) return (date && a.doneTimes?.[date]) || null;
  return a.doneOn ? (a.doneAt ?? null) : null;
}

/** Noch unter „Erledigt“? Höchstens 12 h nach dem Abhaken; ohne Zeitpunkt nie */
export function nochErledigt(um: string | null | undefined, jetzt: number): boolean {
  const t = um ? Date.parse(um) : NaN;
  return Number.isFinite(t) && jetzt - t < FENSTER_MS;
}

/** Einmalige erledigte Aufgabe, deren 12 Stunden um sind (oder ohne Zeitpunkt) */
export function istAbgelaufen(e: CalendarEntry, jetzt: number): boolean {
  return e.typ === "aufgabe" && !e.data.repeat && Boolean(e.data.doneOn) && !nochErledigt(e.data.doneAt, jetzt);
}

/** Aufräumen (rein, idempotent): ohne abgelaufene Erledigte; nichts zu tun → dieselbe Liste */
export function ohneAbgelaufene<T extends CalendarEntry>(entries: T[], jetzt: number): T[] {
  const keep = entries.filter((e) => !istAbgelaufen(e, jetzt));
  return keep.length === entries.length ? entries : keep;
}

/** Abhak-Zeiten einer Serie: diese Runde setzen bzw. entfernen; was älter als 12 h ist, braucht niemand mehr */
export function serienZeiten(times: Record<string, string> | undefined, date: string, done: boolean, stamp: string): Record<string, string> | undefined {
  const jetzt = Date.parse(stamp);
  const next = Object.fromEntries(Object.entries(times ?? {}).filter(([d, um]) => d !== date && nochErledigt(um, jetzt)));
  if (done) next[date] = stamp;
  return Object.keys(next).length ? next : undefined;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isStamp = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

/** Beim Laden prüfen: `doneAt` nur bei erledigten einmaligen, `doneTimes` nur bei Serien */
export function erledigtFelder(d: { repeat?: unknown; doneOn?: unknown; doneAt?: unknown; doneTimes?: unknown }): Pick<AufgabeData, "doneAt" | "doneTimes"> {
  if (d.repeat) {
    const raw = d.doneTimes && typeof d.doneTimes === "object" && !Array.isArray(d.doneTimes) ? Object.entries(d.doneTimes as Record<string, unknown>) : [];
    const times = Object.fromEntries(raw.filter((x): x is [string, string] => DATE.test(x[0]) && isStamp(x[1])));
    return Object.keys(times).length ? { doneTimes: times } : {};
  }
  return d.doneOn && isStamp(d.doneAt) ? { doneAt: d.doneAt } : {};
}
