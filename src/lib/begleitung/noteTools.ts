// Notizen (nur festhalten) und die Aufgaben-Übersicht für Lotte. Schreib-
// Werkzeuge liefern wie immer nur Vorschläge (Op `upsert_note`/`remove_note`)
// mit "Übernehmen"; Lese-Werkzeuge antworten aus den mitgeschickten Daten.

import type { Room } from "@/lib/core/entries";
import { aufgabeToTermin, taskOverview, terminToAufgabe } from "@/lib/kalender/model";
import { aufgabenSatz } from "@/lib/kalender/aufgaben";
import { listenAnsicht } from "@/lib/kalender/liste/ordnung";
import { addListItems, createNote, findNote, noteAnswer, setPinned, type Note } from "@/lib/notizen";
import { PIN_MAX } from "@/lib/pinnwand/model";
import { dayAnswer, hoursToday, isRainy, umbrellaAnswer, round } from "@/lib/wetter/forecast";
import { windWords } from "@/lib/wetter/wind";
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

const TOOLS: BegleitungTool[] = [
  {
    area: "alltag",
    definition: {
      name: "termin_in_aufgabe_umwandeln",
      description: "'Das ist kein Termin, sondern eine Aufgabe': Termin (id) wird zur Aufgabe – Tag bleibt als Wunschtag (oder frist angeben), ohne Uhrzeit. Gemeint ist meist der zuletzt besprochene Eintrag.",
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
        "Neue Notiz (nur festhalten – kein Termin, keine Aufgabe): 'Merk dir das WLAN-Passwort: …', 'Notier dir …', 'Schreib auf …', 'Schreib in die Schnellnotiz …', 'Idee: …'. Jede Notiz ist eigen; bei mehreren Zeilen ist die erste der Titel. Text ODER Liste, Absätze im text mit \\n. Kein Emoji im Titel. Passt es in eine vorhandene Liste (z. B. Geschenkideen, Packliste), stattdessen liste_eintrag_hinzufuegen. Auch 'Schreib in die Kladde …'. Notizen gehören zu 1.0: ist der Baustein aus, schaltet das Anlegen ihn wieder ein. Essenswünsche ('Mathis wünscht sich Pfannkuchen') sind wunsch_merken.",
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
      description: "Aufgaben lesen ('Was muss ich heute noch erledigen?', 'Was ist noch bei der Arbeit?' → raum arbeit). Alles ist heute: EINE Liste, dazu Geplantes ab einem genannten Tag. Erste Zeile ist die fertige kurze Antwort (Zahl und die ersten drei) – so übernehmen. Nach Feierabend ohne Arbeit, außer raum arbeit. Nie 'offen', 'überfällig' oder 'noch zu erledigen'. 'Zeig mir meine Aufgaben' öffnet stattdessen die Seite (app_befehl).",
      input_schema: { type: "object", properties: { raum: { type: "string", enum: ["familie", "arbeit"], description: "Nur ein Raum: familie oder arbeit (= Geschäftlich)" } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const raum = str((raw as Input | null)?.raum);
      const g = taskOverview(ctx.data.entries ?? [], ctx.today);
      const alle = listenAnsicht(g.heute).jetzt;
      const items = raum === "arbeit" || raum === "familie" ? alle.filter((i) => i.room === raum) : ctx.feierabend ? alle.filter((i) => i.room !== "arbeit") : alle;
      const ruht = !raum && ctx.feierabend ? alle.length - items.length : 0;
      const lines = [
        aufgabenSatz(items, raum === "arbeit" ? "bei der Arbeit" : ""),
        items.length ? `Liste: ${items.slice(0, 10).map((i) => `${i.title}${i.room === "arbeit" ? " (Geschäftlich)" : ""} [id=${i.entry.id}]`).join(", ")}` : "",
        ruht ? `Feierabend: ${ruht} Arbeitsaufgaben ruhen bis morgen – nur nennen, wenn gefragt.` : "",
        g.geplant.length ? `Geplant: ${g.geplant.slice(0, 5).map((i) => `${i.title} (ab ${i.when}) [id=${i.entry.id}]`).join(", ")}` : "",
      ];
      return { content: lines.filter(Boolean).join("\n") };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "pinnwand_schreiben",
      description: "Zettel an die Pinnwand hängen (Kühlschranktür für alle im Haushalt, bis 140 Zeichen, in der Farbe der Person; abgehakt geht er gleich ins Archiv „Ältere“, sonst nach 7 Tagen; im Archiv nach 30 Tagen weg): 'Schreib an die Pinnwand: Bin um 20 Uhr da' → text 'Bin um 20 Uhr da'. bleibt_haengen nur, wenn er dauerhaft hängen soll ('…, das soll hängen bleiben', Gäste-WLAN) – dann heißt es in der App „Bleibt hängen“ und er geht nie von selbst. Was nur für mich ist (Passwort, WLAN, Liste zum Merken) gehört in die Notizen (notiz_anlegen). Erledigte Zettel stehen nicht im Kontext. Sprachnachrichten ([Sprachnachricht 0:12]) nimmt die Familie selbst auf; ihren Inhalt kennst du nicht und du schreibst nie welche ('Spiel das Memo von Lisa ab' → app_befehl).",
      input_schema: {
        type: "object",
        properties: { text: { type: "string", description: "Die Nachricht, kurz, ohne Anführungszeichen" }, bleibt_haengen: { type: "boolean", description: "„Bleibt hängen“: nie von selbst ins Archiv (nur wenn gewünscht)" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
    run: (ctx, raw) => {
      const input = raw as Input | null;
      const text = str(input?.text).slice(0, PIN_MAX);
      if (!text) return fail("text angeben.");
      const pinned = input?.bleibt_haengen === true;
      propose(ctx, { id: nextId(ctx), type: "add_pin", text, ...(pinned ? { pinned } : {}) });
      return { content: `Vorgemerkt: hängt dann an der Pinnwand${pinned ? " und bleibt hängen" : ""} (Startseite, Kachel Pinnwand).` };
    },
  },
  {
    area: "alltag",
    definition: {
      name: "wetter_abfragen",
      description: "Wetter am Wetter-Ort für einen Tag (Standard heute): Beschreibung, Tief/Hoch, Regenrisiko, Wind (Stärke km/h, Richtung, Böen), bei heute auch ab wann Regen. Für 'Wie wird das Wetter morgen?', 'Brauch ich heute einen Schirm?', 'Ist es windig?', 'Woher kommt der Wind morgen?'. Windstärke mit genau dem Wort aus dem Ergebnis sagen (Kaum Wind, Leichter, Mäßiger, Frischer, Lebhafter, Starker, Stürmischer Wind, Sturm, Orkanartiger Wind), Richtung immer ausgeschrieben („aus Westen“), Böen nur ab 60 km/h nennen. Antwort ein kurzer Satz, ggf. mit Schirm oder Sonnencreme.",
      input_schema: { type: "object", properties: { tag: { type: "string", description: "YYYY-MM-DD (aus der Datumsliste), Standard heute" } }, additionalProperties: false },
    },
    run: (ctx, raw) => {
      const fc = ctx.forecast;
      if (!fc) return { content: "Gerade keine Wetterdaten erreichbar – sag das kurz und freundlich, ohne Technik-Wörter." };
      const day = /^\d{4}-\d{2}-\d{2}$/.test(str((raw as Input | null)?.tag)) ? str((raw as Input | null)?.tag) : ctx.today;
      const d = fc.days.find((x) => x.date === day);
      if (!d) return { content: `Für ${day} gibt es noch keine Vorhersage (nur die nächsten 7 Tage).` };
      const lines = [`${fc.place}, ${day}: ${d.text}, ${round(d.min)} bis ${round(d.max)} °C, Regenrisiko ${d.rain} %, Regenstunden ${d.wet}, ${d.mm} mm, Sonne etwa ${Math.round(d.sun)} Std.`];
      if (d.wind) lines.push(`Wind tagsüber: ${windWords(d.wind)}.`);
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
