// Schnellnotiz = schnell eine eigene Notiz (erste Zeile = Titel). Bis v0.111
// war sie eine angeheftete Sammel-Notiz; die teilt `splitSchnellnotiz` beim
// Laden in einzelne Notizen. Der alte gelbe Zettel (`wasgibts.kladde`, bis
// v0.31) wird beim Start einmal übernommen – ebenfalls Zeile für Zeile.

import { createLocalStore } from "@/lib/core/localStore";
import { createNote, type Note } from "@/lib/notizen/model";
import { loadNotes, persistNotes, replaceNotes } from "@/lib/notizen/store";

type Stored = { version: 1; text: string; geaendert: string | null };

// Alter Speicher (gelber Zettel bis v0.31) – wird einmal in Notizen übernommen
const legacy = createLocalStore("wasgibts.kladde", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Stored>;
  return { version: 1, text: typeof r.text === "string" ? r.text.slice(0, 20000) : "", geaendert: typeof r.geaendert === "string" ? r.geaendert : null };
});

/** Alter Zettel → eine Notiz je Zeile (rein) */
export function kladdeNotes(text: string): Note[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => createNote({ title: line.slice(0, 80), text: line.length > 80 ? line : "" }));
}

/** Einmalig beim Start: alter Zettel und alte Sammel-Schnellnotiz → einzelne Notizen */
export function adoptSchnellnotiz() {
  persistNotes();
  const old = legacy.load();
  if (!old?.text.trim()) return;
  replaceNotes([...loadNotes(), ...kladdeNotes(old.text)]);
  legacy.save({ version: 1, text: "", geaendert: old.geaendert });
}

/** "Schreib in die Schnellnotiz: …" (auch "Kladde", "Notier mir schnell …") → der Text (oder null) */
export function schnellnotizCommand(text: string): string | null {
  const t = text.trim();
  const m =
    t.match(/^(?:bitte\s+)?(?:schreib\w*|notier\w*|trag\w*|pack\w*)\s+(?:das\s+|mir\s+)?(?:in|auf)\s+(?:die|meine|unsere)\s+(?:kladde|schnellnotiz)\s*[:,]?\s*([\s\S]+)$/i) ??
    t.match(/^(?:bitte\s+)?notier\w*\s+(?:mir\s+)?(?:mal\s+)?schnell\s*[:,]?\s*([\s\S]+)$/i) ??
    t.match(/^(?:kladde|schnellnotiz)\s*:\s*([\s\S]+)$/i);
  return m ? m[1].trim() : null;
}
