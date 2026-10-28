// Lottes Werkzeuge für Termine und Aufgaben (Bereich "alltag"). Wie alle
// Schreib-Werkzeuge ändern sie nichts direkt, sondern merken Änderungen für
// die Vorschau vor ("Übernehmen"). Lese-Werkzeuge antworten aus den
// mitgeschickten Einträgen.

import { createEntry, roomOf, type Room } from "@/lib/core/entries";
import { addDays, now } from "@/lib/core/now";
import { ohneAbgelaufene } from "@/lib/kalender/erledigt";
import { contextLines, mitgewandert, showAnswer } from "@/lib/kalender/answers";
import { itemsForDay, REMINDERS, taskOverview, sanitizeEntry, sanitizeRepeat, weekdayIndex, type AufgabeData, type CalendarEntry, type Reminder, type Repeat, type TerminData } from "@/lib/kalender/model";
import { findDate } from "@/lib/kalender/parse";
import { arbeitsWorte, raumRaten, type RaumArt, type RaumHilfen, type RaumWort } from "@/lib/kalender/raum/raten";
import { isAboEntry } from "@/lib/kalender/abo/model";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { findPersons, nextId, propose, type ToolContext, type ToolResult } from "@/lib/begleitung/tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });

const DATE_PROP = { type: "string", description: "Datum YYYY-MM-DD (aus der Datumsliste im Kontext) oder heute/morgen/Wochentag" } as const;
const TIME_PROP = { type: "string", description: "Uhrzeit HH:MM (24 h)" } as const;
const ROOM_PROP = {
  type: "string",
  enum: ["familie", "ich", "arbeit"],
  description:
    "Drei Räume, für Termine und Aufgaben gleich. familie = alle im Haushalt sehen es (Schule, Kinder, Kita, Oma, Geburtstag, 'für alle'). ich = nur die Person selbst (Arzt, Friseur, Physio, 'nur für mich', 'privat'). arbeit = nur die Person selbst, nach Feierabend weg (Meeting, Kunde, Lieferant, Büro, Tohuus, KARAMBA Eis, Personal, Großhandel; dazu die 'Arbeits-Stichworte' im Kontext). 'Gelernte Räume' im Kontext gehen vor. Weglassen = die App rät (Termine Familie, Aufgaben Ich). Nur wenn wirklich unklar (Arbeit und Familie zugleich, z. B. 'Kinder zum Tohuus bringen'): kurz 'Familie oder Arbeit?' mit antwort_knoepfe ['Familie', 'Arbeit'], noch nichts anlegen.",
} as const;
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
/** Hilfen fürs Raten: gelernte Stichworte (vom Gerät mitgeschickt) und Arbeits-Stichworte */
const raumHilfen = (ctx: ToolContext): RaumHilfen => ({ gelernt: ctx.data.raumWorte ?? [], arbeitWorte: arbeitsWorte(ctx.data.entries ?? []) });
/** Raum aus dem Werkzeug („privat“ = Ich, „geschäftlich“ = Arbeit); fehlt er, rät die App wie überall (A-034) */
function roomFrom(ctx: ToolContext, v: unknown, art: RaumArt, titel: string): Room {
  if (v === "privat") return "ich";
  if (v === "geschaeftlich" || v === "geschäftlich") return "arbeit";
  if (v === "familie" || v === "ich" || v === "arbeit") return roomOf(v);
  return raumRaten(titel, art, raumHilfen(ctx)).raum;
}
const reminderFrom = (v: unknown, fallback: Reminder = "aus"): Reminder => (REMINDERS.some((r) => r.value === v) ? (v as Reminder) : fallback);
function repeatFrom(v: unknown, start: string): Repeat | null {
  if (!v || typeof v !== "object") return null;
  const r = v as { art?: string; tage?: unknown };
  if (r.art === "wochentage" && (!Array.isArray(r.tage) || !r.tage.length)) return { kind: "wochentage", days: [weekdayIndex(start)] };
  return sanitizeRepeat({ kind: r.art, days: r.tage });
}

const entriesOf = (ctx: ToolContext) => ctx.data.entries ?? [];
/** Zum Vorlesen: Erledigtes nur die letzten 12 Stunden (A-043) */
const sichtbar = (ctx: ToolContext) => ohneAbgelaufene(entriesOf(ctx), ctx.jetzt ?? now().getTime());
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
  const when = clean.typ === "termin" ? `${shortDate(clean.data.date)} ${clean.data.start}` : clean.data.due ? `bis ${shortDate(clean.data.due)}` : clean.data.date && clean.data.date > ctx.today ? `ab ${shortDate(clean.data.date)}` : "heute";
  return { content: `Vorgemerkt (${clean.typ}, ${isNew ? "neu" : "geändert"}): ${clean.data.title}, ${when}.` };
}

function terminInput(ctx: ToolContext, input: Input, base?: TerminData): TerminData | string {
  const date = input.datum !== undefined ? dateFrom(ctx, input.datum) : (base?.date ?? null);
  const start = input.start !== undefined ? timeFrom(input.start) : base?.start;
  const title = input.titel !== undefined ? str(input.titel) : (base?.title ?? "");
  if (!title) return "titel angeben.";
  if (!date) return "datum nicht erkannt – YYYY-MM-DD aus der Datumsliste nehmen.";
  // Mehrtägig („vom 9. bis 13. November“): ein ganztägiger Eintrag über alle Tage
  const until = input.bis_datum !== undefined ? dateFrom(ctx, input.bis_datum) : null;
  const endDate = until && until > date ? until : base?.endDate;
  if (!start && !endDate) return "start als HH:MM angeben (ohne feste Uhrzeit ist es eine Aufgabe; mehrtägig: bis_datum).";
  return {
    ...(base ?? { reminder: "aus" as Reminder }),
    title,
    date,
    start: start ?? "",
    ...(endDate ? { endDate } : {}),
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
  // Alt: „nächste Woche“ ohne Tag = ab Montag; sonst gibt es keinen Zeitraum mehr (Tafel 103)
  const nextMonday = input.zeitraum === "naechste_woche" ? addDays(ctx.today, 7 - weekdayIndex(ctx.today)) : undefined;
  const repeat = input.wiederholung !== undefined ? repeatFrom(input.wiederholung, repeatStart) : (base?.repeat ?? null);
  return {
    ...(base ?? { reminder: "aus" as Reminder }),
    title,
    // Alles ist heute: ohne genannten Tag ab heute; wiederkehrend ab dem nächsten passenden Tag
    date: date ?? nextMonday ?? (base ? base.date : repeat ? firstOccurrence(repeat, ctx.today) : ctx.today),
    due,
    week: undefined,
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
  bis_datum: { ...DATE_PROP, description: "Letzter Tag bei mehrtägigen Terminen ('Klassenfahrt vom 9. bis 13. November') – dann start weglassen (ganztägig über alle Tage, EIN Eintrag)" },
  ort: { type: "string", description: "Ort oder Notiz" },
  etikett: LABEL_PROP,
  raum: ROOM_PROP,
  wiederholung: REPEAT_PROP,
  erinnerung: REMINDER_PROP,
  personen: { type: "array", items: { type: "string" }, description: "Namen aus dem Haushalt, die es betrifft (optional)" },
} as const;

const AUFGABE_FIELDS = {
  titel: { type: "string" },
  tag: { ...DATE_PROP, description: "Nur wenn ausdrücklich ein Tag genannt ist ('Freitag KFZ-Steuer') – dann erscheint sie ab diesem Tag. Sonst weglassen: ohne Tag gehört jede Aufgabe zu heute." },
  frist: { ...DATE_PROP, description: "Frist ('bis Mittwoch'), optional – die Aufgabe steht trotzdem ab heute in der Liste" },
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
        "Legt einen Termin an (feste Uhrzeit an einem Tag, optional wiederkehrend): 'Morgen um 9 Steuerberater, erinner mich 30 Minuten vorher'. Mehrtägig ('Klassenfahrt vom 9. bis 13. November'): datum + bis_datum ohne start = EIN ganztägiger Eintrag. Ohne feste Uhrzeit (und nicht mehrtägig) ist es eine Aufgabe (aufgabe_anlegen). Erinnerung nur, wenn gesagt: 'erinner mich 30 Minuten vorher' → erinnerung '30', 'am Abend vorher' → 'vorabend'.",
      input_schema: { type: "object", properties: TERMIN_FIELDS, required: ["titel", "datum"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const data = terminInput(ctx, input);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, createEntry("termin", data, { raum: roomFrom(ctx, input.raum, "termin", data.title) }) as CalendarEntry, true);
    },
  },
  {
    area: "alltag",
    definition: {
      name: "termin_aendern",
      description:
        "Ändert einen Termin (nur angegebene Felder), z. B. 'Verschieb den Steuerberater auf Donnerstag' → datum. Bei wiederkehrenden Terminen mit nur_am nur dieses eine Vorkommen verschieben (datum/start = neuer Tag/neue Zeit). Die id steht in der Liste im Kontext; Ändern ist ein Vorschlag mit „Übernehmen“.",
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
      return proposeEntry(ctx, { ...entry, raum: input.raum !== undefined ? roomFrom(ctx, input.raum, entry.typ, data.title) : entry.raum, data }, false);
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
        "Legt eine Aufgabe an. Alles ist heute: ohne genannten Tag ('Irgendwann mal Keller', 'Diese Woche noch Reifen') immer für heute, tag weglassen. Nur bei ausdrücklich genanntem Tag tag setzen ('Freitag KFZ-Steuer' → ab Freitag, bis dahin unter 'Geplant'). 'Bis Mittwoch Kita-Formular' (frist), 'Jeden Dienstag Müll rausbringen' (wiederholung wochentage [1]).",
      input_schema: { type: "object", properties: AUFGABE_FIELDS, required: ["titel"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const data = aufgabeInput(ctx, input);
      if (typeof data === "string") return fail(data);
      return proposeEntry(ctx, createEntry("aufgabe", data, { raum: roomFrom(ctx, input.raum, "aufgabe", data.title) }) as CalendarEntry, true);
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
      return proposeEntry(ctx, { ...entry, raum: input.raum !== undefined ? roomFrom(ctx, input.raum, entry.typ, data.title) : entry.raum, data }, false);
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
      return { content: contextLines(sichtbar(ctx), ctx.today, 1, date).replace(/^- /, "") + `\nKurz: ${showAnswer(sichtbar(ctx), ctx.today, date, 1, date === ctx.today ? "heute" : shortDate(date), ctx.abends, ctx.feierabend)}` };
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
      return { content: contextLines(sichtbar(ctx), ctx.today, days, from) };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "woche_eintragen",
      description:
        "Wochencheck: trägt ALLE Punkte aus einem frei gesprochenen Wochenüberblick auf einmal ein (statt vieler Einzelaufrufe). Füllwörter ignorieren, Korrekturen übernehmen ('Dienstag … nee, Mittwoch' → Mittwoch), Nachträge als eigene Punkte. Unklare Uhrzeit nie raten: ohne start (ganztägig) eintragen – die App fragt mit Knöpfen nach. Sport-Wunsch ('dreimal Sport'): Genanntes eintragen, den Rest als Vorschlag in freie Lücken (vorschlag: kurze Begründung wie 'trocken'). Nachricht beginnt mit '[Wochencheck]' → genau EINMAL aufrufen, alle Punkte (Termin/Aufgabe/Sport, Raum familie/ich/arbeit, Personen aus dem Haushalt, Standarddauer). 'Dienstag' = der nächste Dienstag ab heute, 'nächste Woche Dienstag' = Woche danach, schon vorbei = nächste Woche; 'halb acht' bei Abendterminen = 19:30, 'nach der Arbeit' = nach dem Feierabend im Tagesablauf. Sport-Vorschläge nicht neben Arbeit, Tage verteilt, trocken. Danach nur 1 Satz.",
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
                raum: { type: "string", enum: ["familie", "ich", "arbeit"], description: "familie (Kinder, Kita, Schule, Oma, Geburtstag), ich (Arzt, Friseur, nur für mich, privat) oder arbeit (Meeting, Kunde, Lieferant, Büro, Tohuus, KARAMBA Eis). Weglassen = Termine familie, Aufgaben ich" },
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
        // „privat“ = Ich; ohne Angabe rät die App (Termine Familie, Aufgaben Ich)
        const raum: Room = roomFrom(ctx, p.raum, str(p.art) === "aufgabe" ? "aufgabe" : "termin", title);
        const who = whoFrom(ctx, p.personen);
        const hint = str(p.vorschlag) || undefined;
        let entry: CalendarEntry;
        if (p.art === "aufgabe") {
          const due = dateFrom(ctx, p.frist) ?? undefined;
          // Alles ist heute: ohne genannten Tag ab heute (auch mit Frist)
          const date = dateFrom(ctx, p.datum) ?? ctx.today;
          entry = createEntry("aufgabe", { title, reminder: "aus" as Reminder, repeat: null, date: due && date > due ? ctx.today : date, ...(due ? { due } : {}) }, { raum }) as CalendarEntry;
        } else {
          const date = dateFrom(ctx, p.datum) ?? ctx.today;
          const start = timeFrom(p.start) ?? "";
          const minutes = typeof p.dauer_min === "number" ? Math.max(5, Math.min(600, Math.round(p.dauer_min))) : /elternabend/i.test(title) ? 120 : 60;
          const end = start ? `${String(Math.min(23, Math.floor((Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + minutes) / 60))).padStart(2, "0")}:${String((Number(start.slice(3)) + minutes) % 60).padStart(2, "0")}` : undefined;
          const label = p.art === "sport" ? "Sport" : undefined;
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

/** Für den Kontext: Einträge der nächsten 7 Tage (heute zuerst, alle Aufgaben stehen heute); abends, was still mit auf morgen wandert; Geschafftes nur die letzten 12 Stunden (A-043) */
export function calendarContext(all: CalendarEntry[], today: string, abends = false, feierabend = false, jetzt = now().getTime(), raumWorte: readonly RaumWort[] = []): string {
  const entries = ohneAbgelaufene(all, jetzt);
  const upcoming = itemsForDay(entries, today, today);
  const geschafft = taskOverview(entries, today, today, jetzt).erledigt.map((i) => i.title);
  const geschafftLine = `\nGeschafft in den letzten 12 Stunden (nur das nennen, wenn jemand fragt, was er geschafft hat; Älteres gibt es nicht mehr): ${geschafft.length ? geschafft.join(" | ") : "noch nichts abgehakt"}`;
  // Geplant (ab einem genannten Tag) jenseits der 7 Tage
  const later = taskOverview(entries, today).geplant.filter((i) => i.date >= addDays(today, 7)).slice(0, 20);
  const laterLines = later.map((i) => `${i.title} [id=${i.entry.id}; aufgabe, ${i.room}, ab ${i.when}${i.label ? `, Etikett ${i.label}` : ""}]`);
  const mit = mitgewandert(entries, today, abends);
  const mitLine = mit.length ? `\nAbends: Die Startseite zeigt schon morgen. Still mit auf morgen gewandert (nichts verschoben): ${mit.map((i) => i.title).join(" | ")}` : "";
  const ruhe = feierabend ? "\nFeierabend: Arbeitsaufgaben ruhen bis morgen – nur nennen, wenn jemand nach der Arbeit fragt." : "";
  // Gelernt aus früheren Entscheidungen: Wörter, die hier Arbeit meinen (Laden, Café …)
  const worte = arbeitsWorte(entries);
  const arbeit = worte.length ? `\nArbeits-Stichworte (→ raum arbeit): ${worte.join(", ")}` : "";
  // Selbst korrigiert (Mia lernt, A-034): gehen vor
  const gelernt = raumWorte.length ? `\nGelernte Räume: ${raumWorte.slice(0, 30).map((w) => `${w.wort} → ${w.raum}`).join(", ")}` : "";
  return `Termine und Aufgaben der nächsten 7 Tage (ids nur für Werkzeuge, nie nennen; alle Aufgaben ohne genannten Tag stehen heute in EINER Liste)${upcoming.length || entries.length ? "" : " – noch nichts eingetragen"}:\n${contextLines(entries, today, 7)}${laterLines.length ? `\nSpäter geplant: ${laterLines.join(" | ")}` : ""}${geschafftLine}${mitLine}${ruhe}${arbeit}${gelernt}`;
}
