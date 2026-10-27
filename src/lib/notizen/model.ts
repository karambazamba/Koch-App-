// Notizen = nur festhalten (kein Termin, keine Aufgabe): Text ODER Liste
// (Einträge, optional abhakbar), Raum, angeheftet. Im einheitlichen
// Eintrags-Modell (typ "notiz"). Rein, damit App, Vorschau und Server
// (Lotte) gleich rechnen.

import { createEntry, type Entry, type Room } from "@/lib/core/entries";
import { nowIso } from "@/lib/core/now";
import { NOTES, sortBy, via } from "@/lib/core/sort";

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
  /** Alte Sammel-Schnellnotiz (bis v0.111): wird beim Laden in einzelne Notizen geteilt (`splitSchnellnotiz`) */
  schnell?: boolean;
};

export type Note = Entry<NotizData> & { typ: "notiz" };

const itemId = () => Math.random().toString(36).slice(2, 10);

/** Neue Eintrags-id (Notiz bearbeiten) */
export const newItemId = itemId;

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

/** Titel ohne Emojis (die sind nur Inhalt) */
export const plainTitle = (title: string) => title.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

/** Aus einem getippten Text eine eigene Notiz: erste Zeile = Titel, der Rest = Text */
export function noteFromText(text: string, raum?: Room): Note | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((l) => plainTitle(l));
  if (first < 0) return null;
  const head = plainTitle(lines[first]);
  const rest = lines.slice(first + 1).join("\n").replace(/^\s*\n|\s+$/g, "");
  // Zu lange erste Zeile: Titel gekürzt, der ganze Satz bleibt im Text
  const title = head.length > 80 ? `${head.slice(0, 78).replace(/\s+\S*$/, "")} …` : head;
  return createNote({ title, text: head.length > 80 ? [head, rest].filter(Boolean).join("\n") : rest, raum });
}

/** Kurzer, stabiler Schlüssel einer Zeile (gleiche Zeile = gleiche id auf jedem Gerät) */
const lineKey = (line: string) => {
  let h = 5381;
  for (const c of line) h = ((h << 5) + h + c.codePointAt(0)!) >>> 0;
  return h.toString(36);
};

/**
 * Die alte Sammel-Schnellnotiz (`schnell`, eine Zeile je Gedanke) wird zu
 * einzelnen Notizen (erste Zeile = Titel). Ids hängen am Inhalt, damit zwei
 * Geräte beim Abgleich dieselben Notizen erzeugen. Nichts geht verloren.
 */
export function splitSchnellnotiz(notes: Note[]): Note[] {
  if (!notes.some((n) => n.data.schnell)) return notes;
  return notes.flatMap((n) => {
    if (!n.data.schnell) return [n];
    const lines = (n.data.text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line, i): Note => {
      const title = plainTitle(line) || "Notiz";
      const short = title.length > 80 ? `${title.slice(0, 78).replace(/\s+\S*$/, "")} …` : title;
      return {
        ...n,
        id: `${n.id}-${lineKey(line)}${lines.indexOf(line) === i ? "" : `-${i}`}`,
        // Reihenfolge bleibt: die unterste Zeile war die neueste
        geaendert: new Date(new Date(n.geaendert).getTime() - (lines.length - 1 - i) * 1000).toISOString(),
        data: { title: short, emoji: noteEmoji(short), kind: "text", text: short === line ? "" : line, pinned: false },
      };
    });
  });
}

export function createNote(data: { title: string; text?: string; items?: string[]; raum?: Room; pinned?: boolean; emoji?: string }): Note {
  const kind = data.items ? "liste" : "text";
  return createEntry<NotizData>(
    "notiz",
    {
      title: (plainTitle(data.title) || data.title.trim()).slice(0, 80),
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
  return sortBy(notes, ...via((n: Note) => ({ pinned: n.data.pinned, geaendert: n.geaendert }), NOTES));
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
            // Text unter der Liste (seit v0.112: Liste beenden = weiter mit Text)
            ...(typeof d.text === "string" && d.text.trim() ? { text: d.text.slice(0, 4000) } : {}),
          }
        : { text: typeof d.text === "string" ? d.text.slice(0, d.schnell ? 20000 : 4000) : "" }),
      pinned: d.pinned === true,
      ...(kind === "liste" && d.freizeit === true ? { freizeit: true } : {}),
      ...(kind === "text" && d.schnell === true ? { schnell: true } : {}),
    },
  };
}

type NoteStore = { version: 2; notes: Note[] };

// --- Bearbeiten (Vollbild) -------------------------------------------------

/** Ist die Notiz leer? (dann wird sie beim Schließen verworfen) */
export const isEmptyNote = (note: Note) => !note.data.title.trim() && !note.data.text?.trim() && !(note.data.items ?? []).some((i) => i.text.trim());

/**
 * Automatisch sichern: leere Notiz fällt weg, sonst rein (ohne Titel: erste
 * Textzeile bzw. „Notiz“/„Liste“), leere Listen-Einträge bleiben draußen.
 */
export function persistNote(notes: Note[], note: Note): Note[] {
  if (isEmptyNote(note)) return removeNote(notes, note.id);
  const firstLine = (note.data.text ?? "").split("\n").map(plainTitle).find(Boolean);
  const title = plainTitle(note.data.title) || firstLine?.slice(0, 80) || (note.data.kind === "liste" ? "Liste" : "Notiz");
  const items = note.data.items?.filter((i) => i.text.trim());
  return upsertNote(notes, { ...note, data: { ...note.data, title, ...(items ? { items } : {}) } });
}

/** „Liste“ in der Werkzeugleiste: Text ↔ Liste (Zeilen werden Einträge und zurück) */
export function toggleList(note: Note): Note {
  if (note.data.kind === "liste") {
    const lines = [...(note.data.items ?? []).map((i) => i.text), ...(note.data.text ? [note.data.text] : [])].filter((l) => l.trim());
    return { ...note, data: { ...note.data, kind: "text", items: undefined, text: lines.join("\n") } };
  }
  const lines = (note.data.text ?? "").split("\n").map((l) => l.replace(/^\s*[-–•*]\s*/, "").trim()).filter(Boolean);
  return { ...note, data: { ...note.data, kind: "liste", text: undefined, items: (lines.length ? lines : [""]).map((text) => ({ id: itemId(), text: text.slice(0, 200) })) } };
}

/**
 * Return in einem Listen-Eintrag: mit Text → neuer Eintrag darunter (der
 * bekommt den Fokus); leerer Eintrag → fällt weg, die Liste ist zu Ende
 * (Fokus `null` = weiter im Text unter der Liste).
 */
export function itemEnter(items: NoteItem[], id: string): { items: NoteItem[]; focus: string | null } {
  const at = items.findIndex((i) => i.id === id);
  if (at < 0) return { items, focus: null };
  if (!items[at].text.trim()) return { items: items.filter((i) => i.id !== id), focus: null };
  const fresh = { id: itemId(), text: "" };
  return { items: [...items.slice(0, at + 1), fresh, ...items.slice(at + 1)], focus: fresh.id };
}

/** Zum Teilen: Titel, Text bzw. Liste mit ✓ / ○ */
export function noteShareText(note: Note): string {
  const list = (note.data.items ?? []).filter((i) => i.text.trim()).map((i) => `${i.done ? "✓" : "○"} ${i.text}`);
  return [note.data.title, ...list, note.data.text?.trim() ?? ""].filter(Boolean).join("\n");
}

/** Gespeicherter Stand `wasgibts.notizen` (v1 und v2) → v2 mit geteilter Schnellnotiz */
export function migrateNotes(raw: unknown): NoteStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: unknown; notes?: unknown };
  if (r.version !== 1 && r.version !== 2) return null;
  const notes = Array.isArray(r.notes) ? r.notes : [];
  return { version: 2, notes: splitSchnellnotiz(notes.map(sanitizeNote).filter((n): n is Note => n !== null)) };
}

/** Eine Freizeit-Idee für heute Abend (aus Listen, die als Freizeit markiert sind; stabil über den Tag) */
export function leisureIdea(notes: Note[], date: string): { note: Note; item: NoteItem } | null {
  const items = notes.filter((n) => n.data.freizeit && n.data.kind === "liste").flatMap((n) => (n.data.items ?? []).filter((i) => !i.done).map((item) => ({ note: n, item })));
  if (!items.length) return null;
  const seed = [...date].reduce((a, c) => a + c.charCodeAt(0), 0);
  return items[seed % items.length];
}
