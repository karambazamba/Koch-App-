// Kladde = Schmierzettel: EIN freier Text (`wasgibts.kladde` v1), speichert
// beim Tippen. "Lotte, räum auf" macht aus Zeilen Termine, Aufgaben oder
// Notizen und nimmt die übernommenen Zeilen heraus.

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { nowIso } from "../core/now";
import { parseCalendar, type Draft } from "../aufgaben/parse";
import { parseNoteCommand } from "./chat";

export type Kladde = { text: string; geaendert: string | null };

type Stored = Kladde & { version: 1 };

const store = createLocalStore("wasgibts.kladde", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Stored>;
  return { version: 1, text: typeof r.text === "string" ? r.text.slice(0, 20000) : "", geaendert: typeof r.geaendert === "string" ? r.geaendert : null };
});

const EMPTY: Kladde = { text: "", geaendert: null };

export function loadKladde(): Kladde {
  return store.load() ?? EMPTY;
}

export function saveKladde(text: string) {
  store.save({ version: 1, text: text.slice(0, 20000), geaendert: nowIso() });
}

/** Text setzen; liefert Rückgängig */
export function changeKladde(text: string): () => void {
  const before = loadKladde();
  saveKladde(text);
  return () => store.save({ version: 1, ...before });
}

export function useKladde(): Kladde | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY);
}

/** Text anhängen (neue Zeile) */
export const appendLine = (text: string, line: string) => (text.trim() ? `${text.replace(/\s+$/, "")}\n${line.trim()}` : line.trim());

/** "Schreib in die Kladde: …" → der Text (oder null) */
export function kladdeCommand(text: string): string | null {
  const t = text.trim();
  const m =
    t.match(/^(?:bitte\s+)?(?:schreib\w*|notier\w*|trag\w*|pack\w*)\s+(?:das\s+|mir\s+)?(?:in|auf)\s+(?:die|meine|unsere)\s+(?:kladde|schnellnotiz)\s*[:,]?\s*(.+)$/i) ??
    t.match(/^(?:bitte\s+)?notier\w*\s+(?:mir\s+)?(?:mal\s+)?schnell\s*[:,]?\s*(.+)$/i) ??
    t.match(/^(?:kladde|schnellnotiz)\s*:\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

export const isKladdeTidyRequest = (text: string) => /\b(räum|sortier|ordne)\w*\b.*\b(kladde|schnellnotiz)\b|\b(kladde|schnellnotiz)\b.*\b(aufräumen|sortieren|ordnen)\b/i.test(text);

export type KladdeLine = { line: string; kind: "termin" | "aufgabe" | "notiz" | null; draft?: Draft; note?: ReturnType<typeof parseNoteCommand> };

const TODO_VERB = /\b(kaufen|besorgen|holen|abholen|bestellen|anrufen|zurückrufen|schreiben|machen|erledigen|bringen|wegbringen|abgeben|einwerfen|zahlen|bezahlen|überweisen|buchen|reparieren|putzen|aufräumen|kündigen|beantragen|vereinbaren|ausmachen|zurückgeben|fragen|klären)\s*[.!]?$/i;

/**
 * Aufräumen ohne KI: Zeilen mit Uhrzeit/Tag → Termin bzw. Aufgabe,
 * "merk dir …"/"Idee: …" → Notiz; der Rest bleibt in der Kladde.
 */
export function tidyKladde(text: string, today: string): KladdeLine[] {
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

/** Kladde ohne die übernommenen Zeilen */
export const withoutLines = (text: string, lines: string[]) =>
  text
    .split(/\n/)
    .filter((l) => !lines.includes(l.trim()))
    .join("\n")
    .replace(/^\s+|\s+$/g, "");
