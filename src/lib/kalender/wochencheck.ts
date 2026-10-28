// Wochencheck (Tafel 36), rein: unordentliches Reden („Also, ähm, diese
// Woche … Dienstag haben wir Elternabend, halb acht glaub ich …“) in einzelne
// Punkte zerlegen – Füllwörter weg, Korrekturen übernehmen („Dienstag … nee,
// Mittwoch“), Nachträge als eigene Punkte, Tag/Uhrzeit über `readSentence`,
// Raum (Familie/Arbeit/Privat), Personen aus dem Haushalt, Standarddauer.
// Unklares wird nie geraten: ohne Uhrzeit ein ganztägiger Termin mit Frage.
// Ohne KI ist das die ganze Erkennung; mit KI liefert das Werkzeug
// `woche_eintragen` dieselben Punkte (Mock nutzt diesen Parser).

import { readSentence } from "@/lib/kalender/sentence";
import { guessRoom } from "@/lib/kalender/parse";
import type { Room } from "@/lib/core/entries";
import { itemsForDay, type CalendarEntry } from "@/lib/kalender/model";
import { addDays } from "@/lib/core/now";
import { guessSport } from "@/lib/sport/model";

/** Familie · Ich (nur für mich, früher „Privat“) · Arbeit */
export type WeekRoom = Room;
export type WeekItem = {
  id: string;
  art: "termin" | "aufgabe" | "sport";
  raum: WeekRoom;
  title: string;
  /** YYYY-MM-DD; Aufgaben ohne Tag = „diese Woche“ */
  date?: string;
  /** Frist („bis Freitag“) – nur Aufgaben */
  due?: string;
  time?: string;
  minutes?: number;
  /** Personen-IDs aus dem Haushalt */
  who: string[];
  /** Uhrzeit unklar → Knöpfe (z. B. 10:00 · 14:00 · „weiß noch nicht“) */
  question?: string[];
  /** Vorschlag von Mia (z. B. Sport in freier Lücke) mit kurzer Begründung */
  suggestion?: string;
  /** Schon im Kalender (ausgegraut) */
  already?: boolean;
};

type Person = { id: string; name: string };

/** Füllwörter (live grau, beim Verstehen weg) */
const FILLERS = ["ähm", "ähh", "äh", "öhm", "hm", "hmm", "also", "glaub ich", "glaube ich", "ach ja", "ach so", "sozusagen", "quasi", "halt", "irgendwie", "und so", "na ja", "naja", "genau", "okay", "ok"];
const FILLER_RE = new RegExp(`(?<![a-zäöüß])(${FILLERS.map((f) => f.replace(/ /g, "\\s+")).join("|")})(?![a-zäöüß])[,.]?`, "gi");
const UNKNOWN_TIME = /keine\s+ahnung(\s+wann)?|weiß\s+(ich\s+)?(noch\s+)?nicht(\s+wann)?|wann\s+genau\s+weiß\s+ich\s+nicht/i;
const WEEKDAYS = "montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag";
const TASK = /(?<![a-zäöüß])(muss|müssen|erledigen|besorgen|kaufen|anrufen|abgeben|bezahlen|überweisen|kündigen|beantragen|zurückschicken|abholen|bringen|ausfüllen|bis\s+(?:zum\s+)?(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|ende))(?![a-zäöüß])/i;
const PRIVATE = /(?<![a-zäöüß])(privat|nur\s+für\s+mich|arzt|ärztin|zahnarzt|physio\w*|therapie|steuerberater\w*|bank)(?![a-zäöüß])/i;
const SPORT_WISH = /(?<![a-zäöüß])(\d|ein|zwei|drei|vier|fünf)\s*(?:mal|×|x)\s+sport/i;

/** Wörter, die live orange markiert werden (Tage, Uhrzeiten, Tätigkeiten erkennt `readSentence`) */
export const fillerSpans = (text: string) => [...text.matchAll(FILLER_RE)].map((m) => ({ start: m.index!, end: m.index! + m[1].length }));

/** Korrekturen übernehmen: „Dienstag … nee, Mittwoch“ → Mittwoch; „halb acht, oder acht? – acht“ → acht */
export function applyCorrections(text: string): string {
  let t = text;
  // Tag: erster Wochentag wird durch den nach „nee/nein/ne, …“ ersetzt
  t = t.replace(new RegExp(`(${WEEKDAYS})([^.!?]*?)[,\\s]*(?:nee|nein|ne|äh|doch)[,\\s]+(?:lieber\\s+|eher\\s+)?(${WEEKDAYS})`, "gi"), (_, _a, mid, b) => `${b}${mid}`);
  // Uhrzeit: „X, oder Y? – Y“ / „X … nee, Y“ → nur die letzte bleibt
  t = t.replace(/((?:halb\s+)?\w+|\d{1,2}(?:[:.]\d{2})?)\s*(?:uhr)?\s*,?\s*oder\s+((?:halb\s+)?\w+|\d{1,2}(?:[:.]\d{2})?)\s*(?:uhr)?\s*\??\s*[–-]\s*/gi, "");
  t = t.replace(/(?:um\s+)?((?:halb\s+)?[a-zäöüß]+|\d{1,2}(?:[:.]\d{2})?)(\s*uhr)?[,\s]+(?:nee|nein)[,\s]+(?=(?:um\s+)?(?:halb\s+)?(?:\d|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf))/gi, "");
  return t;
}

/** In einzelne Punkte zerlegen: Sätze und Nachträge („ach so, und …“, „außerdem …“) */
export function splitPoints(text: string): string[] {
  return text
    .replace(/(?<![a-zäöüß])(ach\s+so|ach\s+ja|außerdem|und\s+dann|dann\s+noch|und\s+noch)(?![a-zäöüß])[,]?/gi, ".")
    .split(/[.!?;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(FILLER_RE, "").replace(/[\s,–-]/g, "").length > 2);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Titel aus dem Rest: Füllwörter und Satzbau („haben wir“, „hat … noch ein“) weg */
function cleanTitle(rest: string, who: Person[]): string {
  let t = rest.replace(FILLER_RE, " ").replace(UNKNOWN_TIME, " ");
  for (const p of who) t = t.replace(new RegExp(`(?<![a-zäöüß])${p.name}(?![a-zäöüß])`, "gi"), " ");
  t = t
    .replace(/(?<![a-zäöüß])(diese\s+woche|nächste\s+woche|haben\s+wir|habe\s+ich|hab\s+ich|ich\s+hab|ich\s+habe|wir\s+haben|hat|haben|ist|sind|muss\s+ich|müssen\s+wir|muss|noch|ein|eine|einen|der|die|das|den|dem|zum|zur|wir|ich|dann|und|auch|wieder|mal|so|bitte|gehen?|machen)(?![a-zäöüß])/gi, " ")
    .replace(/[,–…-]+|\.{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cap(t);
}

/** Standarddauer je Art (Elternabend 2 h, Sport 60, sonst 60) */
const defaultMinutes = (art: WeekItem["art"], title: string) => (art === "termin" && /elternabend|versammlung|konzert|theater/i.test(title) ? 120 : 60);

/**
 * Punkte aus dem Gesprochenen. „Dienstag“ = der nächste Dienstag ab heute;
 * Sonntag/Montag gesprochen meint „diese Woche“ die kommende.
 */
export function parseWeekTalk(text: string, today: string, persons: Person[] = [], entries: CalendarEntry[] = []): { items: WeekItem[]; sportWish: number | null } {
  const corrected = applyCorrections(text);
  const wish = corrected.match(SPORT_WISH);
  const nums: Record<string, number> = { ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5 };
  const sportWish = wish ? Number(wish[1]) || nums[wish[1].toLowerCase()] || null : null;
  const items: WeekItem[] = [];
  for (const [i, raw] of splitPoints(corrected).entries()) {
    if (SPORT_WISH.test(raw) && !guessSport(raw.replace(SPORT_WISH, ""))) continue;
    const s = readSentence(raw.replace(FILLER_RE, " "), today);
    const who = persons.filter((p) => p.name.length > 1 && new RegExp(`(?<![a-zäöüß])${p.name}(?![a-zäöüß])`, "i").test(raw));
    const sport = guessSport(raw);
    const task = !s.time && TASK.test(raw);
    const art: WeekItem["art"] = task ? "aufgabe" : sport && s.time ? "sport" : "termin";
    let title = cleanTitle(s.title, who);
    if (!title) continue;
    if (who.length === 1 && art !== "aufgabe") title = `${who[0].name}: ${title}`;
    const raum: WeekRoom = PRIVATE.test(raw) ? "ich" : guessRoom(raw);
    const due = task && /bis\s/i.test(raw) ? s.date : undefined;
    const item: WeekItem = {
      id: `w${i}`,
      art,
      raum,
      title,
      ...(art === "aufgabe" ? (due ? { due } : s.date ? { date: s.date } : {}) : { date: s.date ?? today }),
      ...(s.time ? { time: s.time, minutes: art === "sport" ? 60 : defaultMinutes(art, title) } : {}),
      who: who.map((p) => p.id),
      ...(art === "termin" && !s.time ? { question: ["10:00", "14:00", "weiß noch nicht"] } : {}),
    };
    item.already = alreadyThere(item, entries, today);
    items.push(item);
  }
  return { items, sportWish };
}

/** Schon im Kalender? (gleicher Titel am gleichen Tag) */
function alreadyThere(item: WeekItem, entries: CalendarEntry[], today: string): boolean {
  if (!item.date) return false;
  const t = item.title.toLowerCase().replace(/^[^:]+:\s*/, "");
  return itemsForDay(entries, item.date, today).some((x) => x.title.toLowerCase().includes(t) || t.includes(x.title.toLowerCase()));
}

/** Sortiert: nach Tag/Uhrzeit, Aufgaben am Ende */
export function sortWeek(items: WeekItem[]): WeekItem[] {
  const key = (x: WeekItem) => (x.art === "aufgabe" ? `9${x.due ?? x.date ?? "9999"}` : `0${x.date ?? ""}${x.time ?? "99"}`);
  return [...items].sort((a, b) => key(a).localeCompare(key(b)));
}

/** Kurzer Tag für die Zeile: „Di 27“, „Woche“, „bis Fr“ */
export function weekDayLabel(item: WeekItem, today: string): string {
  const short = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const wd = (iso: string) => short[(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7];
  if (item.due) return `bis ${wd(item.due)}`;
  if (!item.date) return "Woche";
  return item.date === today ? "Heute" : `${wd(item.date)} ${Number(item.date.slice(8))}`;
}

/** Montag der gemeinten Woche: So/Mo gesprochen = die kommende Mo–So */
/** Jetzt-Karte „Kurzer Wochencheck?“: Montag ganztags, Sonntag ab 17 Uhr (für die neue Woche) – sonst null */
export function weekCheckKey(today: string, minutes: number): string | null {
  const wd = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  if (wd === 0) return today;
  if (wd === 6 && minutes >= 17 * 60) return addDays(today, 1);
  return null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const plus = (start: string, minutes: number) => {
  const m = Math.min(23 * 60 + 59, Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + minutes);
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
};

/** Punkte → Einträge (Ich = nur für mich, Raum „ich“; Sport = Etikett „Sport“) */
export function weekEntries(items: WeekItem[], today: string, make: (typ: "termin" | "aufgabe", data: Record<string, unknown>, raum: Room) => CalendarEntry | null): CalendarEntry[] {
  return items.flatMap((i) => {
    if (i.already) return [];
    const raum = i.raum;
    const label = i.art === "sport" ? "Sport" : undefined;
    const base = { title: i.title.slice(0, 120), repeat: null, ...(label ? { label } : {}), ...(i.who.length ? { who: i.who } : {}) };
    const e =
      i.art === "aufgabe"
        ? make("aufgabe", { ...base, reminder: "aus", date: i.date ?? today, ...(i.due ? { due: i.due } : {}) }, raum)
        : make("termin", { ...base, date: i.date ?? today, start: i.time ?? "", ...(i.time ? { end: plus(i.time, i.minutes ?? 60), reminder: "30" } : { reminder: "aus" }) }, raum);
    return e ? [e] : [];
  });
}

/** Einträge aus der KI (Werkzeug woche_eintragen) → Punkte für „Deine Woche“ */
export function itemFromEntry(e: CalendarEntry, id: string, hint?: string): WeekItem {
  const label = e.data.label;
  // Früher: „Privat“ = Arbeit mit Etikett – zeigt sich jetzt als „Ich“
  const raum: WeekRoom = label === "Privat" ? "ich" : e.raum;
  if (e.typ === "aufgabe") return { id, art: "aufgabe", raum, title: e.data.title, ...(e.data.due ? { due: e.data.due } : e.data.date ? { date: e.data.date } : {}), who: [] };
  const d = e.data;
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const minutes = d.start && d.end ? toMin(d.end) - toMin(d.start) : undefined;
  return {
    id,
    art: label === "Sport" ? "sport" : "termin",
    raum,
    title: d.title,
    date: d.date,
    ...(d.start ? { time: d.start, ...(minutes && minutes > 0 ? { minutes } : {}) } : { question: ["10:00", "14:00", "weiß noch nicht"] }),
    who: d.who ?? [],
    ...(hint ? { suggestion: hint } : {}),
  };
}

/** „Wochencheck“, „Lass uns die Woche durchgehen“, „Ich lese dir den Kalender vor“ */
export const isWeekCheckRequest = (t: string) => /wochen-?check|(?:lass|lasst)\s+uns\s+(?:die|unsere)\s+woche\s+durch|woche\s+durchgehen|lese?\s+dir\s+(?:den|meinen|unseren)\s+kalender\s+vor/i.test(t);
