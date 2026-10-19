// Notizen (nur festhalten) und die Aufgaben-Übersicht für Lotte. Schreib-
// Werkzeuge liefern wie immer nur Vorschläge (Op `upsert_note`/`remove_note`)
// mit "Übernehmen"; Lese-Werkzeuge antworten aus den mitgeschickten Daten.

import type { Room } from "../core/entries";
import { taskOverview, TASK_GROUPS } from "../aufgaben/model";
import { addListItems, createNote, findNote, noteAnswer, setPinned, type Note } from "../notizen";
import type { LotteTool } from "./registry";
import { nextId, propose, type ToolContext, type ToolResult } from "./tools";

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

export const NOTE_TOOLS: LotteTool[] = [
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
];
