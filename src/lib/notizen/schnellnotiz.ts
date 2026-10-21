// Schnellnotiz (früher Kladde) = Schmierzettel: seit v0.32 eine angeheftete
// Text-Notiz „Schnellnotiz“ (`schnell: true`) im Notizen-Speicher; der alte
// gelbe Zettel (`wasgibts.kladde`) wird beim Start einmal übernommen.
// "<Name>, räum auf" macht aus Zeilen Termine, Aufgaben oder Notizen und
// nimmt die übernommenen Zeilen heraus.

import { createLocalStore } from "../core/localStore";
import { nowIso } from "../core/now";
import { parseCalendar, type Draft } from "../aufgaben/parse";
import { parseNoteCommand } from "./chat";
import { createNote, type Note } from "./model";
import { changeNotes, loadNotes, replaceNotes, useNotes } from "./store";

type Schnellnotiz = { text: string; geaendert: string | null };

type Stored = Schnellnotiz & { version: 1 };

// Alter Speicher (gelber Zettel bis v0.31) – wird einmal in die Notiz übernommen
const legacy = createLocalStore("wasgibts.kladde", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Stored>;
  return { version: 1, text: typeof r.text === "string" ? r.text.slice(0, 20000) : "", geaendert: typeof r.geaendert === "string" ? r.geaendert : null };
});

const EMPTY: Schnellnotiz = { text: "", geaendert: null };
const TITLE = "Schnellnotiz";

/** Die Schnellnotiz-Notiz (angeheftet, `schnell`) */
export const findSchnellnotiz = (notes: Note[]): Note | undefined => notes.find((n) => n.data.schnell);

const fromNote = (note: Note | undefined): Schnellnotiz | null => (note ? { text: note.data.text ?? "", geaendert: note.geaendert } : null);

/** Text in die Schnellnotiz-Notiz schreiben (legt sie bei Bedarf angeheftet an) */
function withText(notes: Note[], text: string): Note[] {
  const current = findSchnellnotiz(notes);
  const at = nowIso();
  if (current) return notes.map((n) => (n.id === current.id ? { ...n, geaendert: at, data: { ...n.data, text: text.slice(0, 20000) } } : n));
  const note = createNote({ title: TITLE, text: "", pinned: true, emoji: "📝" });
  return [...notes, { ...note, data: { ...note.data, text: text.slice(0, 20000), schnell: true } }];
}

/** Einmalig (beim Start): Text vom alten gelben Zettel in die angeheftete Notiz „Schnellnotiz“ */
export function adoptSchnellnotiz() {
  const old = legacy.load();
  if (!old?.text.trim()) return;
  const notes = loadNotes();
  const current = findSchnellnotiz(notes);
  replaceNotes(withText(notes, current?.data.text?.trim() ? `${current.data.text.trimEnd()}\n${old.text}` : old.text));
  legacy.save({ version: 1, text: "", geaendert: old.geaendert });
}

export function loadSchnellnotiz(): Schnellnotiz {
  return fromNote(findSchnellnotiz(loadNotes())) ?? legacy.load() ?? EMPTY;
}

export function saveSchnellnotiz(text: string) {
  replaceNotes(withText(loadNotes(), text));
}

/** Text setzen; liefert Rückgängig */
export function changeSchnellnotiz(text: string): () => void {
  return changeNotes((notes) => withText(notes, text));
}

export function useSchnellnotiz(): Schnellnotiz | undefined {
  const notes = useNotes();
  return notes === undefined ? undefined : (fromNote(findSchnellnotiz(notes)) ?? EMPTY);
}

/** Text anhängen (neue Zeile) */
export const appendLine = (text: string, line: string) => (text.trim() ? `${text.replace(/\s+$/, "")}\n${line.trim()}` : line.trim());

/** "Schreib in die Schnellnotiz: …" (auch "Kladde") → der Text (oder null) */
export function schnellnotizCommand(text: string): string | null {
  const t = text.trim();
  const m =
    t.match(/^(?:bitte\s+)?(?:schreib\w*|notier\w*|trag\w*|pack\w*)\s+(?:das\s+|mir\s+)?(?:in|auf)\s+(?:die|meine|unsere)\s+(?:kladde|schnellnotiz)\s*[:,]?\s*(.+)$/i) ??
    t.match(/^(?:bitte\s+)?notier\w*\s+(?:mir\s+)?(?:mal\s+)?schnell\s*[:,]?\s*(.+)$/i) ??
    t.match(/^(?:kladde|schnellnotiz)\s*:\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

export const isSchnellnotizTidyRequest = (text: string) => /\b(räum|sortier|ordne)\w*\b.*\b(kladde|schnellnotiz)\b|\b(kladde|schnellnotiz)\b.*\b(aufräumen|sortieren|ordnen)\b/i.test(text);

type SchnellnotizLine = { line: string; kind: "termin" | "aufgabe" | "notiz" | null; draft?: Draft; note?: ReturnType<typeof parseNoteCommand> };

const TODO_VERB = /\b(kaufen|besorgen|holen|abholen|bestellen|anrufen|zurückrufen|schreiben|machen|erledigen|bringen|wegbringen|abgeben|einwerfen|zahlen|bezahlen|überweisen|buchen|reparieren|putzen|aufräumen|kündigen|beantragen|vereinbaren|ausmachen|zurückgeben|fragen|klären)\s*[.!]?$/i;

/**
 * Aufräumen ohne KI: Zeilen mit Uhrzeit/Tag → Termin bzw. Aufgabe,
 * "merk dir …"/"Idee: …" → Notiz; der Rest bleibt in der Schnellnotiz.
 */
export function tidySchnellnotiz(text: string, today: string): SchnellnotizLine[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const note = parseNoteCommand(line);
      if (note && (note.kind === "create" || note.kind === "add")) return { line, kind: "notiz" as const, note };
      const cmd = parseCalendar(line, today);
      if (cmd?.kind === "create") return { line, kind: cmd.draft.typ, draft: cmd.draft };
      // "Geschenkpapier kaufen" ohne Tag: klingt nach etwas zu erledigen → Aufgabe ohne Termin
      if (TODO_VERB.test(line) && !/\d{4,}/.test(line)) {
        const title = line.replace(/^[-–•*]\s*/, "").replace(/^\w/, (c) => c.toUpperCase());
        return { line, kind: "aufgabe" as const, draft: { typ: "aufgabe" as const, raum: "familie" as const, data: { title, repeat: null, reminder: "aus" as const } } };
      }
      return { line, kind: null };
    });
}

/** Schnellnotiz ohne die übernommenen Zeilen */
export const withoutLines = (text: string, lines: string[]) =>
  text
    .split(/\n/)
    .filter((l) => !lines.includes(l.trim()))
    .join("\n")
    .replace(/^\s+|\s+$/g, "");
