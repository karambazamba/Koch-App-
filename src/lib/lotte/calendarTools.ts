// Lottes Werkzeuge für Termine und Aufgaben (Bereich "alltag"). Wie alle
// Schreib-Werkzeuge ändern sie nichts direkt, sondern merken Änderungen für
// die Vorschau vor ("Übernehmen"). Lese-Werkzeuge antworten aus den
// mitgeschickten Einträgen.

import { createEntry, type Room } from "../core/entries";
import { addDays } from "../core/now";
import { contextLines, showAnswer } from "../aufgaben/answers";
import { itemsForDay, REMINDERS, taskOverview, sanitizeEntry, sanitizeRepeat, weekdayIndex, type AufgabeData, type CalendarEntry, type Reminder, type Repeat, type TerminData } from "../aufgaben/model";
import { findDate } from "../aufgaben/parse";
import type { LotteTool } from "./registry";
import { findPersons, nextId, propose, type ToolContext, type ToolResult } from "./tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });

const DATE_PROP = { type: "string", description: "Datum YYYY-MM-DD (aus der Datumsliste im Kontext) oder heute/morgen/Wochentag" } as const;
const TIME_PROP = { type: "string", description: "Uhrzeit HH:MM (24 h)" } as const;
const ROOM_PROP = { type: "string", enum: ["familie", "arbeit"], description: "familie = gemeinsam (Standard), arbeit = persönlich (Job, Büro, Kunden)" } as const;
const LABEL_PROP = { type: "string", description: "Kurzes Etikett, z. B. Kita, Schule, Arzt, Café, Sport, Steuern – nur wenn naheliegend" } as const;
const REMINDER_PROP = { type: "string", enum: REMINDERS.map((r) => r.value), description: "Erinnerung: aus, 15/30/60 Minuten vorher oder vorabend (19 Uhr am Tag davor)" } as const;
const REPEAT_PROP = {
  type: "object",
  description: "Wiederholung: taeglich, woechentlich (wie der erste Tag), monatlich, oder wochentage mit tage (0 = Montag … 6 = Sonntag)",
  properties: { art: { type: "string", enum: ["taeglich", "woechentlich", "monatlich", "wochentage"] }, tage: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } } },
  required: ["art"],
  additionalProperties: false,
} as const;
const ID_PROP = { type: "string", description: "id des Eintrags aus der Liste im Kontext" } as const;
const ON_PROP = { type: "string", description: "Nur bei wiederkehrenden Einträgen: das Datum (YYYY-MM-DD) des einen Vorkommens, um das es geht" } as const;

function dateFrom(ctx: ToolContext, v: unknown): string | null {
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s ? (findDate(s, ctx.today)?.date ?? null) : null;
}
function timeFrom(v: unknown): string | undefined {
  const m = str(v).match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m || Number(m[1]) > 23 || Number(m[2] ?? 0) > 59) return undefined;
  return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
}
const roomFrom = (v: unknown): Room => (v === "arbeit" ? "arbeit" : "familie");
const reminderFrom = (v: unknown, fallback: Reminder = "aus"): Reminder => (REMINDERS.some((r) => r.value === v) ? (v as Reminder) : fallback);
function repeatFrom(v: unknown, start: string): Repeat | null {
  if (!v || typeof v !== "object") return null;
  const r = v as { art?: string; tage?: unknown };
  if (r.art === "wochentage" && (!Array.isArray(r.tage) || !r.tage.length)) return { kind: "wochentage", days: [weekdayIndex(start)] };
  return sanitizeRepeat({ kind: r.art, days: r.tage });
}

const entriesOf = (ctx: ToolContext) => ctx.data.entries ?? [];
const findEntry = (ctx: ToolContext, id: unknown) => entriesOf(ctx).find((e) => e.id === str(id));

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.`;
};

function whoFrom(ctx: ToolContext, v: unknown): string[] | undefined {
  const names = Array.isArray(v) ? v.map(str).filter(Boolean) : [];
  const ids = names.flatMap((n) => {
    const found = findPersons(ctx.data.profile.persons, n);
    return found.length === 1 ? [found[0].id] : [];
  });
  return ids.length ? ids : undefined;
}

/** Eintrag vormerken (neu oder geändert) – geprüft wie beim Laden */
function proposeEntry(ctx: ToolContext, entry: CalendarEntry, isNew: boolean): ToolResult {
  const clean = sanitizeEntry(entry);
  if (!clean) return fail("Eintrag unvollständig (Titel, Datum und bei Terminen die Startzeit angeben).");
  propose(ctx, { id: nextId(ctx), type: "upsert_entry", entry: clean, isNew });
  const when = clean.typ === "termin" ? `${shortDate(clean.data.date)} ${clean.data.start}` : clean.data.due ? `bis ${shortDate(clean.data.due)}` : clean.data.date ? shortDate(clean.data.date) : clean.data.week ? `Woche ab ${shortDate(clean.data.week)}` : "irgendwann";
  return { content: `Vorgemerkt (${clean.typ}, ${isNew ? "neu" : "geändert"}): ${clean.data.title}, ${when}.` };
}

function terminInput(ctx: ToolContext, input: Input, base?: TerminData): TerminData | string {
  const date = input.datum !== undefined ? dateFrom(ctx, input.datum) : (base?.date ?? null);
  const start = input.start !== undefined ? timeFrom(input.start) : base?.start;
  const title = input.titel !== undefined ? str(input.titel) : (base?.title ?? "");
  if (!title) return "titel angeben.";
  if (!date) return "datum nicht erkannt – YYYY-MM-DD aus der Datumsliste nehmen.";
  if (!start) return "start als HH:MM angeben (ohne feste Uhrzeit ist es eine Aufgabe).";
  return {
    ...(base ?? { reminder: "aus" as Reminder }),
    title,
    date,
    start,
    end: input.ende !== undefined ? timeFrom(input.ende) : base?.end,
    place: input.ort !== undefined ? str(input.ort) || undefined : base?.place,
    label: input.etikett !== undefined ? str(input.etikett) || undefined : base?.label,
    repeat: input.wiederholung !== undefined ? repeatFrom(input.wiederholung, date) : (base?.repeat ?? null),
    reminder: input.erinnerung !== undefined ? reminderFrom(input.erinnerung) : (base?.reminder ?? "aus"),
    who: input.personen !== undefined ? whoFrom(ctx, input.personen) : base?.who,
  };
}

function aufgabeInput(ctx: ToolContext, input: Input, base?: AufgabeData): AufgabeData | string {
  const title = input.titel !== undefined ? str(input.titel) : (base?.title ?? "");
  if (!title) return "titel angeben.";
  const date = input.tag !== undefined ? dateFrom(ctx, input.tag) ?? undefined : base?.date;
  const due = input.frist !== undefined ? dateFrom(ctx, input.frist) ?? undefined : base?.due;
  const repeatStart = date ?? ctx.today;
  const monday = addDays(ctx.today, -weekdayIndex(ctx.today));
  const week =
    input.zeitraum === "diese_woche" ? monday : input.zeitraum === "naechste_woche" ? addDays(monday, 7) : input.zeitraum === "irgendwann" ? undefined : base?.week;
  const repeat = input.wiederholung !== undefined ? repeatFrom(input.wiederholung, repeatStart) : (base?.repeat ?? null);
  return {
    ...(base ?? { reminder: "aus" as Reminder }),
    title,
    // Wiederkehrend ohne Tag: ab dem nächsten passenden Tag
    date: date ?? (repeat && !base ? firstOccurrence(repeat, ctx.today) : undefined),
    due,
    // Zeitraum nur ohne Tag und Frist
    week: date || due ? undefined : week,
    time: input.uhrzeit !== undefined ? timeFrom(input.uhrzeit) : base?.time,
    label: input.etikett !== undefined ? str(input.etikett) || undefined : base?.label,
    repeat,
    reminder: input.erinnerung !== undefined ? reminderFrom(input.erinnerung) : (base?.reminder ?? "aus"),
  };
}

function firstOccurrence(repeat: Repeat, today: string): string {
  if (repeat.kind !== "wochentage") return today;
  for (let i = 0; i < 7; i++) if (repeat.days.includes(weekdayIndex(addDays(today, i)))) return addDays(today, i);
  return today;
}

const TERMIN_FIELDS = {
  titel: { type: "string" },
  datum: DATE_PROP,
  start: TIME_PROP,
  ende: TIME_PROP,
  ort: { type: "string", description: "Ort oder Notiz" },
  etikett: LABEL_PROP,
  raum: ROOM_PROP,
  wiederholung: REPEAT_PROP,
  erinnerung: REMINDER_PROP,
  personen: { type: "array", items: { type: "string" }, description: "Namen aus dem Haushalt, die es betrifft (optional)" },
} as const;

const AUFGABE_FIELDS = {
  titel: { type: "string" },
  tag: { ...DATE_PROP, description: "Wunschtag (optional). Ohne Tag, Frist und Zeitraum steht die Aufgabe unter 'Irgendwann'." },
  frist: { ...DATE_PROP, description: "Frist ('bis Mittwoch'), optional" },
  zeitraum: { type: "string", enum: ["diese_woche", "naechste_woche", "irgendwann"], description: "Ohne festen Tag: 'diese Woche', 'nächste Woche' oder irgendwann" },
  uhrzeit: TIME_PROP,
  etikett: LABEL_PROP,
  raum: ROOM_PROP,
  wiederholung: REPEAT_PROP,
  erinnerung: REMINDER_PROP,
} as const;

export const CALENDAR_TOOLS: LotteTool[] = [
  {
    area: "alltag",
    definition: {
      name: "termin_anlegen",
      description:
        "Legt einen Termin an (feste Uhrzeit an einem Tag, optional wiederkehrend): 'Morgen um 9 Steuerberater, erinner mich 30 Minuten vorher'. Ohne feste Uhrzeit ist es eine Aufgabe (aufgabe_anlegen).",
      input_schema: { type: "object", properties: TERMIN_FIELDS, required: ["titel", "datum", "start"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const data = terminInput(ctx, input);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, createEntry("termin", data, { raum: roomFrom(input.raum) }) as CalendarEntry, true);
    },
  },
  {
    area: "alltag",
    definition: {
      name: "termin_aendern",
      description:
        "Ändert einen Termin (nur angegebene Felder), z. B. 'Verschieb den Steuerberater auf Donnerstag' → datum. Bei wiederkehrenden Terminen mit nur_am nur dieses eine Vorkommen verschieben (datum/start = neuer Tag/neue Zeit).",
      input_schema: { type: "object", properties: { id: ID_PROP, nur_am: ON_PROP, ...TERMIN_FIELDS }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const entry = findEntry(ctx, input.id);
      if (!entry || entry.typ !== "termin") return fail("Termin mit dieser id nicht gefunden – id aus der Liste im Kontext nehmen.");
      const only = dateFrom(ctx, input.nur_am);
      if (only && entry.data.repeat) {
        const to = dateFrom(ctx, input.datum) ?? only;
        propose(ctx, { id: nextId(ctx), type: "move_entry", entryId: entry.id, title: entry.data.title, date: only, to, time: timeFrom(input.start) });
        return { content: `Vorgemerkt: ${entry.data.title} am ${shortDate(only)} → ${shortDate(to)}.` };
      }
      const data = terminInput(ctx, input, entry.data);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, { ...entry, raum: input.raum !== undefined ? roomFrom(input.raum) : entry.raum, data }, false);
    },
  },
  {
    area: "alltag",
    definition: {
      name: "termin_loeschen",
      description: "Löscht einen Termin. Bei wiederkehrenden Terminen mit nur_am nur dieses eine Vorkommen, sonst die ganze Serie.",
      input_schema: { type: "object", properties: { id: ID_PROP, nur_am: ON_PROP }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => removeTool(ctx, (raw ?? {}) as Input, "termin"),
  },
  {
    area: "alltag",
    definition: {
      name: "aufgabe_anlegen",
      description:
        "Legt eine Aufgabe an (irgendwann, an einem Wunschtag oder bis zu einer Frist, optional wiederkehrend): 'Bis Mittwoch Kita-Formular' (frist), 'Jeden Dienstag Müll rausbringen' (wiederholung wochentage [1]).",
      input_schema: { type: "object", properties: AUFGABE_FIELDS, required: ["titel"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const data = aufgabeInput(ctx, input);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, createEntry("aufgabe", data, { raum: roomFrom(input.raum) }) as CalendarEntry, true);
    },
  },
  {
    area: "alltag",
    definition: {
      name: "aufgabe_aendern",
      description: "Ändert eine Aufgabe (nur angegebene Felder: Titel, Tag, Frist, Uhrzeit, Etikett, Raum, Wiederholung, Erinnerung). Zum Löschen loeschen=true.",
      input_schema: { type: "object", properties: { id: ID_PROP, loeschen: { type: "boolean" }, nur_am: ON_PROP, ...AUFGABE_FIELDS }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      if (input.loeschen === true) return removeTool(ctx, input, "aufgabe");
      const entry = findEntry(ctx, input.id);
      if (!entry || entry.typ !== "aufgabe") return fail("Aufgabe mit dieser id nicht gefunden.");
      const data = aufgabeInput(ctx, input, entry.data);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, { ...entry, raum: input.raum !== undefined ? roomFrom(input.raum) : entry.raum, data }, false);
    },
  },
  {
    area: "alltag",
    definition: {
      name: "aufgabe_erledigen",
      description: "Hakt eine Aufgabe (oder einen Termin) als erledigt ab – bei wiederkehrenden für das Vorkommen am (Standard: heute).",
      input_schema: { type: "object", properties: { id: ID_PROP, am: ON_PROP }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const entry = findEntry(ctx, input.id);
      if (!entry) return fail("Eintrag mit dieser id nicht gefunden.");
      const date = dateFrom(ctx, input.am) ?? ctx.today;
      propose(ctx, { id: nextId(ctx), type: "done_entry", entryId: entry.id, title: entry.data.title, date });
      return { content: `Vorgemerkt: ${entry.data.title} erledigt.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "aufgabe_verschieben",
      description: "Verschiebt eine Aufgabe (oder ein Vorkommen eines Termins) auf einen anderen Tag, z. B. 'auf morgen'. Bei wiederkehrenden Einträgen nur das Vorkommen am (Standard: heute).",
      input_schema: { type: "object", properties: { id: ID_PROP, auf: DATE_PROP, uhrzeit: TIME_PROP, am: ON_PROP }, required: ["id", "auf"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const entry = findEntry(ctx, input.id);
      if (!entry) return fail("Eintrag mit dieser id nicht gefunden.");
      const to = dateFrom(ctx, input.auf);
      if (!to) return fail("auf: Datum nicht erkannt.");
      const date = dateFrom(ctx, input.am) ?? (entry.data.repeat ? ctx.today : (entry.data.date ?? ctx.today));
      propose(ctx, { id: nextId(ctx), type: "move_entry", entryId: entry.id, title: entry.data.title, date, to, time: timeFrom(input.uhrzeit) });
      return { content: `Vorgemerkt: ${entry.data.title} → ${shortDate(to)}.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "tag_anzeigen",
      description: "Liest Termine und Aufgaben eines Tages (mit ids). Für Fragen wie 'Was hab ich am Freitag?' oder 'Hab ich morgen Nachmittag Zeit?'.",
      input_schema: { type: "object", properties: { datum: DATE_PROP }, required: ["datum"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const date = dateFrom(ctx, (raw as Input | null)?.datum);
      if (!date) return fail("datum nicht erkannt.");
      return { content: contextLines(entriesOf(ctx), ctx.today, 1, date).replace(/^- /, "") + `\nKurz: ${showAnswer(entriesOf(ctx), ctx.today, date, 1, shortDate(date))}` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "woche_anzeigen",
      description: "Liest Termine und Aufgaben mehrerer Tage ab einem Datum (Standard: ab heute, 7 Tage), z. B. für 'Was steht nächste Woche an?'.",
      input_schema: { type: "object", properties: { ab: DATE_PROP, tage: { type: "integer", minimum: 1, maximum: 31 } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const from = dateFrom(ctx, input.ab) ?? ctx.today;
      const days = typeof input.tage === "number" ? Math.max(1, Math.min(31, Math.round(input.tage))) : 7;
      return { content: contextLines(entriesOf(ctx), ctx.today, days, from) };
    },
  },
];

function removeTool(ctx: ToolContext, input: Input, typ: "termin" | "aufgabe"): ToolResult {
  const entry = findEntry(ctx, input.id);
  if (!entry || entry.typ !== typ) return fail(`${typ === "termin" ? "Termin" : "Aufgabe"} mit dieser id nicht gefunden.`);
  const only = entry.data.repeat ? (dateFrom(ctx, input.nur_am) ?? undefined) : undefined;
  propose(ctx, { id: nextId(ctx), type: "remove_entry", entryId: entry.id, title: entry.data.title, onlyDate: only });
  return { content: `Vorgemerkt: ${entry.data.title}${only ? ` am ${shortDate(only)}` : ""} löschen.` };
}

/** Für den Kontext: Einträge der nächsten 7 Tage (heute zuerst) */
export function calendarContext(entries: CalendarEntry[], today: string): string {
  const upcoming = itemsForDay(entries, today, today);
  // Aufgaben ohne Tag in den nächsten 7 Tagen: diese Woche (Zeitraum), später, irgendwann
  const g = taskOverview(entries, today);
  const loose = [...g.woche.filter((i) => i.when === "diese Woche"), ...g.spaeter, ...g.irgendwann].slice(0, 40);
  const looseLines = loose.map((i) => `${i.title} [id=${i.entry.id}; aufgabe, ${i.room}${i.when ? `, ${i.when}` : ", irgendwann"}${i.label ? `, Etikett ${i.label}` : ""}]`);
  return `Termine und Aufgaben der nächsten 7 Tage (ids nur für Werkzeuge, nie nennen)${upcoming.length || entries.length ? "" : " – noch nichts eingetragen"}:\n${contextLines(entries, today, 7)}${looseLines.length ? `\nAufgaben ohne festen Tag: ${looseLines.join(" | ")}` : ""}`;
}
