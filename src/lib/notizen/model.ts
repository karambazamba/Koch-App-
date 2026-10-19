// Notizen = nur festhalten (kein Termin, keine Aufgabe): Text ODER Liste
// (Einträge, optional abhakbar), Raum, angeheftet. Im einheitlichen
// Eintrags-Modell (typ "notiz"). Rein, damit App, Vorschau und Server
// (Lotte) gleich rechnen.

import { createEntry, type Entry, type Room } from "../core/entries";
import { nowIso } from "../core/now";

export type NoteItem = { id: string; text: string; done?: boolean };

export type NotizData = {
  title: string;
  /** Emoji vor dem Titel (sonst passend zum Titel geraten) */
  emoji?: string;
  kind: "text" | "liste";
  text?: string;
  items?: NoteItem[];
  pinned: boolean;
  /** Freizeit-Liste (z. B. "Filme & Serien"): im Feierabend kommt daraus eine Idee */
  freizeit?: boolean;
};

export type Note = Entry<NotizData> & { typ: "notiz" };

const itemId = () => Math.random().toString(36).slice(2, 10);

/** Passendes Emoji zum Titel (🎁 Geschenkideen, 🧳 Packliste, 🔑 WLAN …) */
export function noteEmoji(title: string, kind: NotizData["kind"] = "text"): string {
  const t = title.toLowerCase();
  const pairs: [RegExp, string][] = [
    [/geschenk|wunsch|geburtstag/, "🎁"],
    [/pack|koffer|urlaub|reise/, "🧳"],
    [/wlan|passwort|pin\b|code|zugang/, "🔑"],
    [/idee/, "💡"],
    [/café|cafe|eis/, "🍦"],
    [/buch|bücher|lesen/, "📚"],
    [/film|serie/, "🎬"],
    [/rezept|kochen|essen/, "🍳"],
    [/garten|pflanz/, "🌱"],
    [/arzt|gesund|impf/, "🩺"],
    [/auto|reifen|tüv/, "🚗"],
    [/kind|kita|schule/, "🎒"],
    [/adresse|telefon|nummer|kontakt/, "📇"],
  ];
  return pairs.find(([re]) => re.test(t))?.[1] ?? (kind === "liste" ? "📋" : "📝");
}

export function createNote(data: { title: string; text?: string; items?: string[]; raum?: Room; pinned?: boolean; emoji?: string }): Note {
  const kind = data.items ? "liste" : "text";
  return createEntry<NotizData>(
    "notiz",
    {
      title: data.title.trim().slice(0, 80),
      emoji: data.emoji || noteEmoji(data.title, kind),
      kind,
      ...(kind === "liste" ? { items: (data.items ?? []).map((text) => ({ id: itemId(), text: text.trim().slice(0, 200) })).filter((i) => i.text) } : { text: (data.text ?? "").slice(0, 4000) }),
      pinned: Boolean(data.pinned),
    },
    { raum: data.raum },
  ) as Note;
}

const replace = (notes: Note[], note: Note) => notes.map((n) => (n.id === note.id ? note : n));
const touch = (note: Note, data: Partial<NotizData>, at = nowIso()): Note => ({ ...note, data: { ...note.data, ...data }, geaendert: at });

export function upsertNote(notes: Note[], note: Note): Note[] {
  return notes.some((n) => n.id === note.id) ? replace(notes, note) : [...notes, note];
}

export function removeNote(notes: Note[], id: string): Note[] {
  return notes.filter((n) => n.id !== id);
}

export function setPinned(notes: Note[], id: string, pinned: boolean): Note[] {
  const n = notes.find((x) => x.id === id);
  return n ? replace(notes, touch(n, { pinned })) : notes;
}

/** Einträge an eine Liste hängen (aus einer Text-Notiz wird dabei eine Liste, der Text bleibt erster Eintrag) */
export function addListItems(notes: Note[], id: string, texts: string[]): Note[] {
  const n = notes.find((x) => x.id === id);
  if (!n) return notes;
  const existing = n.data.kind === "liste" ? (n.data.items ?? []) : n.data.text?.trim() ? [{ id: itemId(), text: n.data.text.trim() }] : [];
  const fresh = texts.map((t) => t.trim()).filter((t) => t && !existing.some((e) => e.text.toLowerCase() === t.toLowerCase()));
  return replace(notes, touch(n, { kind: "liste", text: undefined, items: [...existing, ...fresh.map((text) => ({ id: itemId(), text: text.slice(0, 200) }))] }));
}

export function toggleListItem(notes: Note[], id: string, itemIdValue: string): Note[] {
  const n = notes.find((x) => x.id === id);
  if (!n || n.data.kind !== "liste") return notes;
  return replace(notes, touch(n, { items: (n.data.items ?? []).map((i) => (i.id === itemIdValue ? { ...i, done: !i.done } : i)) }));
}

/** Notiz nach Titel finden ("Packliste", "das WLAN") – ungefähr */
export function findNote(notes: Note[], query: string): Note | null {
  const words = query
    .toLowerCase()
    .replace(/[^a-zäöüß0-9 -]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !/^(die|der|das|den|dem|meine|meinen|unsere|notiz|liste|von|für|mit)$/.test(w));
  if (!words.length) return null;
  const score = (n: Note) => words.filter((w) => n.data.title.toLowerCase().includes(w)).length;
  const best = Math.max(0, ...notes.map(score));
  if (!best) return null;
  return [...notes].filter((n) => score(n) === best).sort((a, b) => b.geaendert.localeCompare(a.geaendert))[0];
}

/** Sortierung: angeheftet zuerst, dann zuletzt geändert */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned) || b.geaendert.localeCompare(a.geaendert));
}

/** Vorschau: 2–4 Zeilen Text bzw. die ersten Listen-Einträge */
export function notePreview(note: Note, lines = 4): string[] {
  if (note.data.kind === "liste") return (note.data.items ?? []).slice(0, lines).map((i) => `${i.done ? "✓ " : "• "}${i.text}`);
  return (note.data.text ?? "").split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, lines);
}

/** Prüfen und reparieren (Laden, Daten von der KI) */
export function sanitizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<Note>;
  if (typeof e.id !== "string" || e.typ !== "notiz" || !e.data || typeof e.data !== "object") return null;
  const d = e.data as Partial<NotizData>;
  if (typeof d.title !== "string" || !d.title.trim()) return null;
  const kind = d.kind === "liste" ? "liste" : "text";
  return {
    id: e.id,
    typ: "notiz",
    raum: e.raum === "arbeit" ? "arbeit" : "familie",
    besitzer: typeof e.besitzer === "string" ? e.besitzer : "lokal",
    erstellt: typeof e.erstellt === "string" ? e.erstellt : new Date(0).toISOString(),
    geaendert: typeof e.geaendert === "string" ? e.geaendert : new Date(0).toISOString(),
    data: {
      title: d.title.trim().slice(0, 80),
      emoji: typeof d.emoji === "string" && d.emoji.trim() ? d.emoji.trim().slice(0, 8) : noteEmoji(d.title, kind),
      kind,
      ...(kind === "liste"
        ? {
            items: (Array.isArray(d.items) ? d.items : [])
              .filter((i): i is NoteItem => Boolean(i) && typeof i === "object" && typeof (i as NoteItem).text === "string" && (i as NoteItem).text.trim() !== "")
              .slice(0, 200)
              .map((i) => ({ id: typeof i.id === "string" ? i.id : itemId(), text: i.text.trim().slice(0, 200), ...(i.done ? { done: true } : {}) })),
          }
        : { text: typeof d.text === "string" ? d.text.slice(0, 4000) : "" }),
      pinned: d.pinned === true,
      ...(kind === "liste" && d.freizeit === true ? { freizeit: true } : {}),
    },
  };
}

/** Eine Freizeit-Idee für heute Abend (aus Listen, die als Freizeit markiert sind; stabil über den Tag) */
export function leisureIdea(notes: Note[], date: string): { note: Note; item: NoteItem } | null {
  const items = notes.filter((n) => n.data.freizeit && n.data.kind === "liste").flatMap((n) => (n.data.items ?? []).filter((i) => !i.done).map((item) => ({ note: n, item })));
  if (!items.length) return null;
  const seed = [...date].reduce((a, c) => a + c.charCodeAt(0), 0);
  return items[seed % items.length];
}
