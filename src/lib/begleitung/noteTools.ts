// Notizen (nur festhalten) und die Aufgaben-Übersicht für Lotte. Schreib-
// Werkzeuge liefern wie immer nur Vorschläge (Op `upsert_note`/`remove_note`)
// mit "Übernehmen"; Lese-Werkzeuge antworten aus den mitgeschickten Daten.

import type { Room } from "@/lib/core/entries";
import { aufgabeToTermin, taskOverview, terminToAufgabe, TASK_GROUPS } from "@/lib/kalender/model";
import { addListItems, appendLine, createNote, findNote, noteAnswer, setPinned, withoutLines, type Note } from "@/lib/notizen";
import { PIN_MAX } from "@/lib/pinnwand/model";
import { dayAnswer, hoursToday, isRainy, umbrellaAnswer, round } from "@/lib/wetter/forecast";
import { windAnswer } from "@/lib/wetter/wind";
import type { BegleitungTool } from "@/lib/begleitung/registry";
import { nextId, propose, type ToolContext, type ToolResult } from "@/lib/begleitung/tools";

type Input = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const fail = (content: string): ToolResult => ({ content, isError: true });
const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, 50) : []);
const roomFrom = (v: unknown): Room => (v === "arbeit" ? "arbeit" : "familie");

const notesOf = (ctx: ToolContext) => ctx.data.notes ?? [];
/** Notiz über id oder (ungefähr) über den Titel */
const noteBy = (ctx: ToolContext, v: unknown): Note | null => notesOf(ctx).find((n) => n.id === str(v)) ?? findNote(notesOf(ctx), str(v));

const ID_PROP = { type: "string", description: "id der Notiz aus dem Kontext (oder ihr Titel)" } as const;
const ROOM_PROP = { type: "string", enum: ["familie", "arbeit"], description: "familie = gemeinsam (Standard), arbeit = persönlich" } as const;

function proposeNote(ctx: ToolContext, note: Note, isNew: boolean, change?: string) {
  propose(ctx, { id: nextId(ctx), type: "upsert_note", note, isNew, ...(change ? { change } : {}) });
}

const shortList = (lines: string[]) => lines.map((l) => (l.length > 40 ? `${l.slice(0, 38)}…` : l)).join(", ");

const TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "schnellnotiz_schreiben",
      description: "Etwas in die Schnellnotiz (früher Kladde, Schmierzettel) schreiben: 'Schreib in die Schnellnotiz/Kladde: Handwerker Müller 0176 …', 'Notier mir schnell …'. Wird als neue Zeile angehängt.",
      input_schema: { type: "object", properties: { text: { type: "string" }, ersetzen: { type: "boolean", description: "Ganze Schnellnotiz ersetzen statt anhängen (nur wenn ausdrücklich gewünscht)" } }, required: ["text"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const text = str(input.text);
      if (!text) return fail("text angeben.");
      const current = ctx.data.schnellnotiz ?? "";
      const next = input.ersetzen === true ? text : appendLine(current, text);
      propose(ctx, { id: nextId(ctx), type: "set_schnellnotiz", text: next, change: input.ersetzen === true ? `neu: ${shortList([text])}` : `+ ${shortList([text])}` });
      return { content: "Vorgemerkt: steht dann in der Schnellnotiz (Notizen, ganz oben)." };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "schnellnotiz_aufraeumen",
      description:
        "Schnellnotiz aufräumen ('Räum meine Schnellnotiz/Kladde auf'): Zuerst die passenden Zeilen mit termin_anlegen / aufgabe_anlegen / notiz_anlegen bzw. liste_eintrag_hinzufuegen übernehmen, dann hier genau diese Zeilen angeben – sie werden aus der Schnellnotiz genommen. Unklares bleibt stehen.",
      input_schema: { type: "object", properties: { zeilen: { type: "array", items: { type: "string" }, description: "Übernommene Zeilen, wörtlich wie in der Schnellnotiz" } }, required: ["zeilen"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const lines = list((raw as Input | null)?.zeilen);
      const current = ctx.data.schnellnotiz ?? "";
      const present = lines.filter((l) => current.split(/\n/).some((c) => c.trim() === l));
      if (!present.length) return fail("Keine dieser Zeilen steht in der Schnellnotiz – wörtlich angeben.");
      const rest = withoutLines(current, present);
      propose(ctx, { id: nextId(ctx), type: "set_schnellnotiz", text: rest, change: `${present.length} ${present.length === 1 ? "Zeile" : "Zeilen"} übernommen${rest ? " – der Rest bleibt" : ", Schnellnotiz ist leer"}` });
      return { content: `Vorgemerkt: ${present.length} Zeilen aus der Schnellnotiz nehmen.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "termin_in_aufgabe_umwandeln",
      description: "'Das ist kein Termin, sondern eine Aufgabe': Termin (id) wird zur Aufgabe – Tag bleibt als Wunschtag (oder frist angeben), ohne Uhrzeit.",
      input_schema: { type: "object", properties: { id: { type: "string" }, frist: { type: "string", description: "Optional YYYY-MM-DD" } }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const e = (ctx.data.entries ?? []).find((x) => x.id === str(input.id));
      if (!e || e.typ !== "termin") return fail("Termin nicht gefunden – id aus dem Kontext nehmen.");
      const due = /^\d{4}-\d{2}-\d{2}$/.test(str(input.frist)) ? str(input.frist) : undefined;
      propose(ctx, { id: nextId(ctx), type: "upsert_entry", entry: terminToAufgabe(e, `${ctx.today}T12:00:00.000Z`, { due }), isNew: false });
      return { content: `Vorgemerkt: „${e.data.title}“ wird eine Aufgabe.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "aufgabe_in_termin_umwandeln",
      description: "'Das ist eine Aufgabe, aber eigentlich ein Termin um 15 Uhr': Aufgabe (id) wird zum Termin mit Uhrzeit (und optional Datum).",
      input_schema: { type: "object", properties: { id: { type: "string" }, start: { type: "string", description: "HH:MM" }, datum: { type: "string", description: "YYYY-MM-DD (sonst Wunschtag/Frist/heute)" } }, required: ["id", "start"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const e = (ctx.data.entries ?? []).find((x) => x.id === str(input.id));
      if (!e || e.typ !== "aufgabe") return fail("Aufgabe nicht gefunden – id aus dem Kontext nehmen.");
      const m = str(input.start).match(/^(\d{1,2})(?::(\d{2}))?$/);
      if (!m) return fail("start als HH:MM angeben.");
      const start = `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(str(input.datum)) ? str(input.datum) : (e.data.date ?? e.data.due ?? ctx.today);
      propose(ctx, { id: nextId(ctx), type: "upsert_entry", entry: aufgabeToTermin(e, `${ctx.today}T12:00:00.000Z`, start, date), isNew: false });
      return { content: `Vorgemerkt: „${e.data.title}“ wird ein Termin um ${start}.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "notiz_anlegen",
      description:
        "Neue Notiz (nur festhalten – kein Termin, keine Aufgabe): 'Merk dir das WLAN-Passwort: …', 'Notier dir …', 'Idee: …'. Text ODER Liste. Passt es in eine vorhandene Liste (z. B. Geschenkideen, Packliste), stattdessen liste_eintrag_hinzufuegen.",
      input_schema: {
        type: "object",
        properties: {
          titel: { type: "string", description: "Kurzer Titel, z. B. 'WLAN-Passwort', 'Packliste Urlaub'" },
          text: { type: "string", description: "Inhalt bei einer Text-Notiz" },
          liste: { type: "array", items: { type: "string" }, description: "Einträge bei einer Liste (statt text)" },
          emoji: { type: "string", description: "Ein passendes Emoji (optional)" },
          raum: ROOM_PROP,
          angeheftet: { type: "boolean", description: "Oben anheften (nur wenn gewünscht)" },
        },
        required: ["titel"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const title = str(input.titel);
      if (!title) return fail("titel angeben.");
      const items = list(input.liste);
      const note = createNote({ title, ...(Array.isArray(input.liste) ? { items } : { text: str(input.text) }), raum: roomFrom(input.raum), pinned: input.angeheftet === true, emoji: str(input.emoji) || undefined });
      proposeNote(ctx, note, true);
      return { content: `Vorgemerkt: Notiz „${note.data.title}“ (${note.data.kind === "liste" ? `Liste mit ${items.length}` : "Text"}).` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "notiz_aendern",
      description: "Notiz ändern: Titel, Text, Raum oder Emoji. Für Listen-Einträge liste_eintrag_hinzufuegen nutzen.",
      input_schema: {
        type: "object",
        properties: { id: ID_PROP, titel: { type: "string" }, text: { type: "string", description: "Neuer ganzer Text" }, emoji: { type: "string" }, raum: ROOM_PROP },
        required: ["id"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const note = noteBy(ctx, input.id);
      if (!note) return fail("Notiz nicht gefunden – id aus dem Kontext nehmen.");
      const data = {
        ...note.data,
        ...(str(input.titel) ? { title: str(input.titel) } : {}),
        ...(input.text !== undefined && note.data.kind === "text" ? { text: str(input.text) } : {}),
        ...(str(input.emoji) ? { emoji: str(input.emoji) } : {}),
      };
      proposeNote(ctx, { ...note, raum: input.raum !== undefined ? roomFrom(input.raum) : note.raum, data, geaendert: new Date(`${ctx.today}T12:00:00Z`).toISOString() }, false);
      return { content: `Vorgemerkt: „${data.title}“ ändern.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "notiz_loeschen",
      description: "Notiz löschen.",
      input_schema: { type: "object", properties: { id: ID_PROP }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const note = noteBy(ctx, (raw as Input | null)?.id);
      if (!note) return fail("Notiz nicht gefunden.");
      propose(ctx, { id: nextId(ctx), type: "remove_note", noteId: note.id, title: note.data.title });
      return { content: `Vorgemerkt: „${note.data.title}“ löschen.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "liste_eintrag_hinzufuegen",
      description:
        "Einträge an eine Liste hängen ('Sonnencreme auf die Packliste', 'Merk dir: Mathis wünscht sich Torwarthandschuhe' → Liste 'Geschenkideen' mit 'Torwarthandschuhe (für Mathis)'). Gibt es die Liste nicht, wird sie angelegt.",
      input_schema: {
        type: "object",
        properties: {
          liste: { type: "string", description: "Titel oder id der Liste, z. B. 'Geschenkideen', 'Packliste', 'Ideen Café'" },
          eintraege: { type: "array", items: { type: "string" } },
          raum: ROOM_PROP,
        },
        required: ["liste", "eintraege"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const items = list(input.eintraege);
      const name = str(input.liste);
      if (!name || !items.length) return fail("liste und eintraege angeben.");
      const found = noteBy(ctx, name);
      if (!found) {
        const note = createNote({ title: name, items, raum: roomFrom(input.raum) });
        proposeNote(ctx, note, true, `neue Liste: ${items.join(", ")}`);
        return { content: `Vorgemerkt: neue Liste „${note.data.title}“ mit ${items.join(", ")}.` };
      }
      const updated = addListItems([found], found.id, items)[0];
      proposeNote(ctx, updated, false, `+ ${items.join(", ")}`);
      return { content: `Vorgemerkt: ${items.join(", ")} auf „${found.data.title}“.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "notiz_anheften",
      description: "Notiz oben anheften oder lösen ('Häng das WLAN oben an').",
      input_schema: { type: "object", properties: { id: ID_PROP, angeheftet: { type: "boolean" } }, required: ["id"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const input = (raw ?? {}) as Input;
      const note = noteBy(ctx, input.id);
      if (!note) return fail("Notiz nicht gefunden.");
      const on = input.angeheftet !== false;
      proposeNote(ctx, setPinned([note], note.id, on)[0], false, on ? "oben anheften" : "nicht mehr oben");
      return { content: `Vorgemerkt: „${note.data.title}“ ${on ? "oben anheften" : "lösen"}.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "notizen_anzeigen",
      description: "Notizen lesen: eine bestimmte ('Was steht auf der Packliste?', 'Was ist das WLAN-Passwort?') oder alle Titel. Antworte dann kurz mit dem Inhalt.",
      input_schema: { type: "object", properties: { suche: { type: "string", description: "Titel oder Stichwort; leer = alle" } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const q = str((raw as Input | null)?.suche);
      const notes = notesOf(ctx);
      if (!notes.length) return { content: "Es gibt noch keine Notizen." };
      if (q) {
        const n = noteBy(ctx, q);
        return { content: n ? noteAnswer(n) : `Keine Notiz zu „${q}“. Vorhanden: ${notes.map((x) => x.data.title).join(", ")}.` };
      }
      return { content: `Notizen: ${notes.map((n) => `${n.data.title}${n.data.pinned ? " (angeheftet)" : ""}${n.data.kind === "liste" ? ` (Liste, ${n.data.items?.length ?? 0})` : ""}`).join(", ")}. Zu finden in der Woche ganz unten unter „Notizen“.` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "aufgaben_anzeigen",
      description: "Aufgaben-Übersicht lesen ('Was muss ich heute noch erledigen?', 'Zeig mir meine Aufgaben'): Heute dran, Diese Woche, Später, Irgendwann. Antworte ruhig – nie 'offen', 'überfällig' oder 'noch zu erledigen'.",
      input_schema: { type: "object", properties: { gruppe: { type: "string", enum: ["heute", "woche", "alle"] } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const which = str((raw as Input | null)?.gruppe) || "alle";
      const g = taskOverview(ctx.data.entries ?? [], ctx.today);
      const groups = TASK_GROUPS.filter((x) => x.id !== "erledigt" && (which === "alle" || x.id === which || (which === "woche" && x.id === "heute")));
      const lines = groups
        .map((x) => ({ label: x.label, items: g[x.id] }))
        .filter((x) => x.items.length)
        .map((x) => `${x.label}: ${x.items.slice(0, 10).map((i) => `${i.title}${i.carried ? ` (${i.carried})` : i.dueLabel ? ` (${i.dueLabel})` : i.when ? ` (${i.when})` : ""} [id=${i.entry.id}]`).join(", ")}`);
      return { content: lines.length ? `${lines.join("\n")}\nDie ganze Liste steht unter „Aufgaben“.` : "Gerade liegt keine Aufgabe an." };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "pinnwand_schreiben",
      description: "Kurze Nachricht an die Familien-Pinnwand (Zettel am Kühlschrank, bis 140 Zeichen, verschwindet nach 24 Stunden): 'Schreib an die Pinnwand: Bin um 20 Uhr da' → text 'Bin um 20 Uhr da'.",
      input_schema: { type: "object", properties: { text: { type: "string", description: "Die Nachricht, kurz, ohne Anführungszeichen" } }, required: ["text"], additionalProperties: false },
    },
    run: (ctx, raw) => {
      const text = str((raw as Input | null)?.text).slice(0, PIN_MAX);
      if (!text) return fail("text angeben.");
      propose(ctx, { id: nextId(ctx), type: "add_pin", text });
      return { content: "Vorgemerkt: steht dann auf der Pinnwand (Startseite, Kachel Pinnwand)." };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "wetter_abfragen",
      description: "Wetter am Wetter-Ort für einen Tag (Standard heute): Beschreibung, Tief/Hoch, Regenrisiko, Wind (Stärke km/h, Richtung, Böen), bei heute auch ab wann Regen. Für 'Wie wird das Wetter morgen?', 'Brauch ich heute einen Schirm?', 'Ist es windig?', 'Woher kommt der Wind morgen?'. Richtung immer ausgeschrieben sagen („aus Westen“), Böen nur ab 50 km/h nennen.",
      input_schema: { type: "object", properties: { tag: { type: "string", description: "YYYY-MM-DD (aus der Datumsliste), Standard heute" } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const fc = ctx.forecast;
      if (!fc) return { content: "Gerade keine Wetterdaten erreichbar – sag das kurz und freundlich, ohne Technik-Wörter." };
      const day = /^\d{4}-\d{2}-\d{2}$/.test(str((raw as Input | null)?.tag)) ? str((raw as Input | null)?.tag) : ctx.today;
      const d = fc.days.find((x) => x.date === day);
      if (!d) return { content: `Für ${day} gibt es noch keine Vorhersage (nur die nächsten 7 Tage).` };
      const lines = [`${fc.place}, ${day}: ${d.text}, ${round(d.min)} bis ${round(d.max)} °C, Regenrisiko ${d.rain} %, Regenstunden ${d.wet}, ${d.mm} mm, Sonne etwa ${Math.round(d.sun)} Std.`];
      if (d.wind) lines.push(`Wind: ${windAnswer(d.wind, "Tagsüber")}`);
      if (day === ctx.today) {
        const rain = hoursToday(fc, day).filter(isRainy).map((h) => h.hour);
        lines.push(rain.length ? `Regen heute um ${rain.join(", ")} Uhr.` : "Heute trocken.");
        lines.push(`Kurz: ${umbrellaAnswer(fc, day, 0)}`);
      } else {
        const label = dayAnswer(fc, day, "An dem Tag");
        if (label) lines.push(label);
      }
      return { content: lines.join("\n") };
    },
  },
];

export const NOTE_TOOLS: BegleitungTool[] = TOOLS;
