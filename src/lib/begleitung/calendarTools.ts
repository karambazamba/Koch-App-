// Lottes Werkzeuge für Termine und Aufgaben (Bereich "alltag"). Wie alle
// Schreib-Werkzeuge ändern sie nichts direkt, sondern merken Änderungen für
// die Vorschau vor ("Übernehmen"). Lese-Werkzeuge antworten aus den
// mitgeschickten Einträgen.

import { createEntry, type Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import { contextLines, showAnswer } from "@/lib/kalender/answers";
import { itemsForDay, REMINDERS, taskOverview, sanitizeEntry, sanitizeRepeat, weekdayIndex, type AufgabeData, type CalendarEntry, type Reminder, type Repeat, type TerminData } from "@/lib/kalender/model";
import { findDate } from "@/lib/kalender/parse";
import { isAboEntry } from "@/lib/kalender/abo/model";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { findPersons, nextId, propose, type ToolContext, type ToolResult } from "@/lib/begleitung/tools";

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
/** Termine aus verbundenen Kalendern sind nur zum Lesen */
const READ_ONLY = "Dieser Termin kommt aus einem verbundenen Kalender und ist nur zum Lesen – ändern geht im Original. Antippen → „In unseren Kalender kopieren“ macht einen eigenen daraus.";

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
    dringend: input.dringend !== undefined ? input.dringend === true || undefined : base?.dringend,
    // An wen (Name) – beim Übernehmen wird daraus das Konto im Haushalt (kalender/abgeben)
    an: input.an !== undefined ? str(input.an) || undefined : base?.an,
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
  dringend: { type: "boolean", description: "Dringend/wichtig ('Dringend: …', '… ist wichtig') – steht dann ganz vorne. Keine zusätzlichen Erinnerungen deswegen." },
  an: { type: "string", description: "Abgeben an jemanden aus dem Haushalt (Name): 'Sag Lisa, sie soll den Turnbeutel waschen' → an 'Lisa', titel 'Turnbeutel waschen'; 'Gib das an Lisa' (aufgabe_aendern). Aufgaben sind sonst persönlich." },
} as const;

export const CALENDAR_TOOLS: BegleitungTool[] = [
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
      if (entry && isAboEntry(entry)) return fail(READ_ONLY);
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
      description: "Ändert eine Aufgabe (nur angegebene Felder: Titel, Tag, Frist, Uhrzeit, Etikett, Raum, Wiederholung, Erinnerung, dringend). Zum Löschen loeschen=true.",
      input_schema: { type: "object", properties: { id: ID_PROP, loeschen: { type: "boolean" }, nur_am: ON_PROP, ...AUFGABE_FIELDS }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      if (input.loeschen === true) return removeTool(ctx, input, "aufgabe");
      const entry = findEntry(ctx, input.id);
      if (entry && isAboEntry(entry)) return fail(READ_ONLY);
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
      if (entry && isAboEntry(entry)) return fail(READ_ONLY);
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
      if (entry && isAboEntry(entry)) return fail(READ_ONLY);
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
  {
    area: "alltag",
    definition: {
      name: "woche_eintragen",
      description:
        "Wochencheck: trägt ALLE Punkte aus einem frei gesprochenen Wochenüberblick auf einmal ein (statt vieler Einzelaufrufe). Füllwörter ignorieren, Korrekturen übernehmen ('Dienstag … nee, Mittwoch' → Mittwoch), Nachträge als eigene Punkte. Unklare Uhrzeit nie raten: ohne start (ganztägig) eintragen – die App fragt mit Knöpfen nach. Sport-Wunsch ('dreimal Sport'): Genanntes eintragen, den Rest als Vorschlag in freie Lücken (vorschlag: kurze Begründung wie 'trocken').",
      input_schema: {
        type: "object",
        properties: {
          punkte: {
            type: "array",
            items: {
              type: "object",
              properties: {
                art: { type: "string", enum: ["termin", "aufgabe", "sport"] },
                titel: { type: "string", description: "Kurz, ohne Füllwörter; mit Person vorne: 'Mathis: Spiel'" },
                datum: DATE_PROP,
                start: { ...TIME_PROP, description: "Uhrzeit HH:MM – weglassen, wenn unklar" },
                dauer_min: { type: "integer", minimum: 5, maximum: 600, description: "Standard: Termin 60, Elternabend 120, Sport 60" },
                raum: { type: "string", enum: ["familie", "arbeit", "privat"], description: "familie (Standard), arbeit (Job, Meeting, Kunde), privat (nur für mich, Arzt, Steuerberater)" },
                personen: { type: "array", items: { type: "string" }, description: "Namen aus dem Haushalt" },
                ort: { type: "string" },
                frist: { ...DATE_PROP, description: "Nur Aufgaben: 'bis Freitag'" },
                vorschlag: { type: "string", description: "Nur Vorschläge von dir (z. B. Sport in freier Lücke): kurze Begründung" },
              },
              required: ["art", "titel"],
              additionalProperties: false,
            },
          },
        },
        required: ["punkte"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const punkte = Array.isArray((raw as Input)?.punkte) ? ((raw as Input).punkte as Input[]) : [];
      const done: string[] = [];
      for (const p of punkte.slice(0, 40)) {
        const title = str(p.titel).slice(0, 120);
        if (!title) continue;
        const privat = p.raum === "privat";
        const raum: Room = p.raum === "arbeit" || privat ? "arbeit" : "familie";
        const who = whoFrom(ctx, p.personen);
        const hint = str(p.vorschlag) || undefined;
        let entry: CalendarEntry;
        if (p.art === "aufgabe") {
          const due = dateFrom(ctx, p.frist) ?? undefined;
          const date = due ? undefined : (dateFrom(ctx, p.datum) ?? undefined);
          const monday = addDays(ctx.today, -weekdayIndex(ctx.today));
          entry = createEntry("aufgabe", { title, reminder: "aus" as Reminder, repeat: null, ...(due ? { due } : date ? { date } : { week: monday }), ...(privat ? { label: "Privat" } : {}) }, { raum }) as CalendarEntry;
        } else {
          const date = dateFrom(ctx, p.datum) ?? ctx.today;
          const start = timeFrom(p.start) ?? "";
          const minutes = typeof p.dauer_min === "number" ? Math.max(5, Math.min(600, Math.round(p.dauer_min))) : /elternabend/i.test(title) ? 120 : 60;
          const end = start ? `${String(Math.min(23, Math.floor((Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + minutes) / 60))).padStart(2, "0")}:${String((Number(start.slice(3)) + minutes) % 60).padStart(2, "0")}` : undefined;
          const label = p.art === "sport" ? "Sport" : privat ? "Privat" : undefined;
          entry = createEntry("termin", { title, date, start, ...(end && end > start ? { end } : {}), reminder: start ? ("30" as Reminder) : ("aus" as Reminder), repeat: null, ...(label ? { label } : {}), ...(who ? { who } : {}), ...(str(p.ort) ? { place: str(p.ort) } : {}) }, { raum }) as CalendarEntry;
        }
        const clean = sanitizeEntry(entry);
        if (!clean) continue;
        propose(ctx, { id: nextId(ctx), type: "upsert_entry", entry: clean, isNew: true, ...(hint ? { hint } : {}) });
        done.push(title);
      }
      return done.length ? { content: `Vorgemerkt (${done.length}): ${done.join(" · ")}. Die App zeigt alles als „Deine Woche“ zum Übernehmen.` } : fail("Keine Punkte erkannt – titel angeben.");
    },
  },
];

function removeTool(ctx: ToolContext, input: Input, typ: "termin" | "aufgabe"): ToolResult {
  const entry = findEntry(ctx, input.id);
  if (entry && isAboEntry(entry)) return fail(READ_ONLY);
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
