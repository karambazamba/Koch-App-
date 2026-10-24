// Pinnwand = Zettel am Kühlschrank: kurze Nachrichten an die Familie
// (Text bis 140 Zeichen, Autor, Zeit, Reaktionen je Person, gelesen von,
// Antwort mit Zitat).
// Im einheitlichen Eintrags-Modell (typ "pinnwand", Raum Familie), damit sie
// später mit den Konten geteilt werden; bis dahin ist der Autor der eigene
// Name. 24 Stunden nach dem Schreiben verschwinden Nachrichten leise – außer
// dauerhaft angeheftete (Tafel 72). Rein, damit Oberfläche, Lotte und Tests gleich rechnen.

import { createEntry, type Entry } from "@/lib/core/entries";
import { applyReaction, readReactions, type Reaction, type Reactions } from "@/lib/pinnwand/reactions";

export const PIN_MAX = 140;
/** So lange bleibt alles an der Pinnwand (ab dem Schreiben) */
const PIN_HOURS = 24;
const PIN_MS = PIN_HOURS * 3_600_000;
/** Jünger als 24 Std. (gerechnet ab `erstellt`) */
export const withinDay = (iso: string, nowMs: number) => nowMs - new Date(iso).getTime() < PIN_MS;

/** Antwort auf eine Nachricht: kurzes Zitat (Text bzw. „Sprachnachricht“) */
export type PinQuote = { id: string; author: string; text: string };

type PinData = {
  text: string;
  author: string;
  /** Person → Emoji (eine Reaktion je Person) */
  reactions: Reactions;
  replyTo: PinQuote | null;
  readBy: string[];
  /** Dauerhaft angeheftet (verschwindet nicht nach 24 Std.) */
  pinned: boolean;
};
export type PinMessage = Entry<PinData> & { typ: "pinnwand" };

const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, PIN_MAX);

export function createPin(text: string, author: string, replyTo: PinQuote | null = null): PinMessage | null {
  const t = clean(text);
  if (!t) return null;
  return createEntry("pinnwand", { text: t, author: author.trim() || "Ich", reactions: {}, replyTo, readBy: [author.trim() || "Ich"], pinned: false }, { raum: "familie" }) as PinMessage;
}

const readQuote = (v: unknown): PinQuote | null => {
  const q = v as Partial<PinQuote> | null;
  return q && typeof q === "object" && typeof q.id === "string" && typeof q.text === "string" ? { id: q.id, author: typeof q.author === "string" ? q.author : "", text: q.text.slice(0, PIN_MAX) } : null;
};

export function sanitizePin(raw: unknown): PinMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as PinMessage;
  if (e.typ !== "pinnwand" || typeof e.id !== "string" || !e.data || typeof e.data.text !== "string") return null;
  const d = e.data;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    ...e,
    raum: "familie",
    data: {
      text: clean(d.text),
      author: typeof d.author === "string" && d.author.trim() ? d.author : "Ich",
      reactions: readReactions(d.reactions),
      replyTo: readQuote(d.replyTo),
      readBy: list(d.readBy),
      pinned: d.pinned === true,
    },
  };
}

/** Noch sichtbar: dauerhaft angeheftet oder jünger als 24 Std. */
const isFresh = (m: PinMessage, nowMs: number) => m.data.pinned || withinDay(m.erstellt, nowMs);

/** Sichtbare Nachrichten, neueste zuerst */
export function visiblePins(list: PinMessage[], nowMs: number): PinMessage[] {
  return list.filter((m) => isFresh(m, nowMs)).sort((a, b) => b.erstellt.localeCompare(a.erstellt));
}

/** Alte Nachrichten wegräumen (beim Speichern) */
export const prunePins = (list: PinMessage[], nowMs: number) => list.filter((m) => isFresh(m, nowMs));

export const addPin = (list: PinMessage[], pin: PinMessage) => [...list.filter((m) => m.id !== pin.id), pin];

export const removePin = (list: PinMessage[], id: string) => list.filter((m) => m.id !== id);

const touch = (m: PinMessage, data: Partial<PinData>, stamp: string): PinMessage => ({ ...m, data: { ...m.data, ...data }, geaendert: stamp });

/** Reaktion setzen, tauschen oder (gleiche nochmal) entfernen – eine je Person */
export function toggleReaction(list: PinMessage[], id: string, reaction: Reaction, me: string, stamp: string): PinMessage[] {
  return list.map((m) => (m.id === id ? touch(m, { reactions: applyReaction(m.data.reactions, me, reaction) }, stamp) : m));
}

/** Löschen darf nur, wer die Nachricht geschrieben bzw. gesprochen hat */
export const canDelete = (m: { data: { author: string } }, me: string) => m.data.author === me;

/**
 * Kachel auf der Startseite: Angeheftetes zuerst, dann die neuesten der
 * letzten 24 Std. – genau 2 Zeilen, dazu wie viele es noch gibt („+N“).
 */
/** Zeilen der Pinnwand-Kachel je Größe (S/M/L) – Größe ändert nur die Menge */
export const PIN_ROWS = { S: 1, M: 2, L: 4 } as const;

export function tileEntries<T extends { at: string; pinned?: boolean }>(items: T[], nowMs: number, rows = 2): { shown: T[]; more: number } {
  const live = items.filter((i) => i.pinned || withinDay(i.at, nowMs)).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.at.localeCompare(a.at));
  return { shown: live.slice(0, rows), more: Math.max(0, live.length - rows) };
}

export const setPinPinned = (list: PinMessage[], id: string, pinned: boolean, stamp: string) => list.map((m) => (m.id === id ? touch(m, { pinned }, stamp) : m));

/** Alles gelesen (ich) */
export const markPinsRead = (list: PinMessage[], me: string) => (list.some((m) => !m.data.readBy.includes(me)) ? list.map((m) => (m.data.readBy.includes(me) ? m : { ...m, data: { ...m.data, readBy: [...m.data.readBy, me] } })) : list);

/** Ungelesen: von jemand anderem und noch nicht von mir gelesen */
export const hasUnread = (list: PinMessage[], me: string, nowMs: number) => visiblePins(list, nowMs).some((m) => m.data.author !== me && !m.data.readBy.includes(me));

/** "Du · 7:48" bzw. "Lisa · gestern" */
export function pinMeta(m: { erstellt: string; data: { author: string } }, me: string, today: string, clock: (iso: string) => string, dayOf: (iso: string) => string): string {
  const who = m.data.author === me ? "Du" : m.data.author;
  const day = dayOf(m.erstellt);
  const [y, mo, d] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(y, mo - 1, d - 1)).toISOString().slice(0, 10);
  const when = day === today ? clock(m.erstellt) : day === yesterday ? "gestern" : `${Number(day.slice(8, 10))}.${Number(day.slice(5, 7))}.`;
  return `${who} · ${when}`;
}

/** Feste Farbe je Person (eine von vier) */
export function personTone(name: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 4) as 0 | 1 | 2 | 3;
}

// --- Gespräch (ohne KI) ---------------------------------------------------------

/** "Schreib an die Pinnwand: Bin um 20 Uhr da" → der Text (oder null) */
export function pinWriteCommand(text: string): string | null {
  const m = text.trim().match(/^(?:bitte\s+)?(?:schreib\w*|häng\w*|pinn\w*|setz\w*|pack\w*)?\s*(?:(?:das|bitte)\s+)?(?:an|auf)\s+(?:die\s+)?pinnwand(?:\s+(?:dran|an|bitte))?\s*[:,–-]?\s*(.+)$/i);
  if (!m) return null;
  const body = m[1].replace(/^["„“]|["“”]$/g, "").trim();
  return body.length > 1 ? body : null;
}

/** "Was steht auf der Pinnwand?" */
export const isPinboardQuery = (text: string) => /\b(was steht|was gibt['’]?s|zeig\w*|lies\w*)\b.*\bpinnwand\b/i.test(text) || /^pinnwand\??$/i.test(text.trim());
