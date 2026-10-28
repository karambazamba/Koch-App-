// Kalender = nur Termine (Tafel 74): Punkte je Person unter jedem Tag,
// Tag-Kopf „heute / morgen / in 7 Tagen“ und „Schnell eintragen“ nur für
// Wiederkehrendes (≥ 3× am selben Wochentag in den letzten 8 Wochen, keine
// Serie, an dem Tag noch nicht da). Rein, damit Oberfläche und Tests gleich rechnen.

import { personTone } from "@/lib/pinnwand/model";
import { itemsForDay, weekdayIndex, type CalendarEntry, type DayItem } from "@/lib/kalender/model";

/** Nur Termine eines Tages (Aufgaben und Essen stehen nie im Kalender) */
export const termineOn = (entries: CalendarEntry[], date: string, today: string): DayItem[] => itemsForDay(entries, date, today).filter((i) => i.entry.typ === "termin");

/** Ein Punkt: Person (feste Farbe bzw. „Meine Farbe im Kalender“), Familie ohne Person (Orange), Raum Ich (Grau), Arbeit (Blau) */
export type Dot = { key: string; kind: "ich" } | { key: string; kind: "person"; tone: 0 | 1 | 2 | 3 } | { key: string; kind: "familie" | "nurIch" | "arbeit" };

/** Höchstens 3 Punkte je Tag – je Person bzw. Raum einer */
export function calendarDots(items: DayItem[], persons: { id: string; name: string }[], meId: string | null): Dot[] {
  const dots: Dot[] = [];
  const add = (d: Dot) => !dots.some((x) => x.key === d.key) && dots.push(d);
  for (const i of items) {
    if (i.entry.typ !== "termin") continue;
    if (i.room === "arbeit" || i.room === "ich") {
      add(i.room === "arbeit" ? { key: "arbeit", kind: "arbeit" } : { key: "nurIch", kind: "nurIch" });
      continue;
    }
    const who = (i.entry.data.who ?? []).map((id) => persons.find((p) => p.id === id)).filter((p): p is { id: string; name: string } => Boolean(p));
    if (!who.length) add({ key: "familie", kind: "familie" });
    for (const p of who) add(p.id === meId ? { key: p.id, kind: "ich" } : { key: p.id, kind: "person", tone: personTone(p.name) });
  }
  return dots.slice(0, 3);
}

const DAY_MS = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY_MS);

/** Rechts im Tag-Kopf: „heute“, „morgen“, „gestern“, „in 7 Tagen“, „vor 3 Tagen“ */
export function dayDistance(date: string, today: string): string {
  const n = days(today, date);
  if (n === 0) return "heute";
  if (n === 1) return "morgen";
  if (n === -1) return "gestern";
  return n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;
}

export type Suggestion = { title: string; time: string; room: CalendarEntry["raum"]; label?: string };

const norm = (s: string) => s.trim().toLowerCase();
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * „Schnell eintragen“: Termine, die in den letzten 8 Wochen mindestens 3× am
 * Wochentag von `date` waren (gleicher Titel, ähnliche Uhrzeit ±30 Min), keine
 * Serie sind und an `date` noch nicht stehen – höchstens 3.
 */
export function recurringSuggestions(entries: CalendarEntry[], date: string, today: string): Suggestion[] {
  const wd = weekdayIndex(date);
  const onDay = new Set(termineOn(entries, date, today).map((i) => norm(i.title)));
  const groups = new Map<string, { dates: Set<string>; times: string[]; s: Suggestion }>();
  for (const e of entries) {
    if (e.typ !== "termin" || e.data.repeat || !e.data.start) continue;
    const d = e.data.date;
    const ago = days(d, today);
    if (ago < 1 || ago > 56 || weekdayIndex(d) !== wd) continue;
    const key = norm(e.data.title);
    const g = groups.get(key) ?? { dates: new Set<string>(), times: [], s: { title: e.data.title, time: e.data.start, room: e.raum, ...(e.data.label ? { label: e.data.label } : {}) } };
    g.dates.add(d);
    g.times.push(e.data.start);
    groups.set(key, g);
  }
  const out: Suggestion[] = [];
  for (const [key, g] of groups) {
    if (g.dates.size < 3 || onDay.has(key)) continue;
    // Häufigste Uhrzeit; die anderen höchstens 30 Min daneben
    const time = [...g.times].sort((a, b) => g.times.filter((t) => t === b).length - g.times.filter((t) => t === a).length || a.localeCompare(b))[0];
    if (g.times.some((t) => Math.abs(minutes(t) - minutes(time)) > 30)) continue;
    out.push({ ...g.s, time });
  }
  return out.slice(0, 3);
}
