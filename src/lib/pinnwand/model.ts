// Pinnwand = Zettel am Kühlschrank: kurze Nachrichten an die Familie
// (Text bis 140 Zeichen, Autor, Zeit, Reaktionen 👍/❤️, gelesen von).
// Im einheitlichen Eintrags-Modell (typ "pinnwand", Raum Familie), damit sie
// später mit den Konten geteilt werden; bis dahin ist der Autor der eigene
// Name. Nach 3 Tagen verschwinden Nachrichten leise – außer dauerhaft
// angeheftete. Rein, damit Oberfläche, Lotte und Tests gleich rechnen.

import { createEntry, type Entry } from "../core/entries";

export const PIN_MAX = 140;
const PIN_DAYS = 3;
export const REACTIONS = ["👍", "❤️"] as const;
export type Reaction = (typeof REACTIONS)[number];

export type PinData = {
  text: string;
  author: string;
  reactions: Partial<Record<Reaction, string[]>>;
  readBy: string[];
  /** Dauerhaft angeheftet (verschwindet nicht nach 3 Tagen) */
  pinned: boolean;
};
export type PinMessage = Entry<PinData> & { typ: "pinnwand" };

const clean = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, PIN_MAX);

export function createPin(text: string, author: string): PinMessage | null {
  const t = clean(text);
  if (!t) return null;
  return createEntry("pinnwand", { text: t, author: author.trim() || "Ich", reactions: {}, readBy: [author.trim() || "Ich"], pinned: false }, { raum: "familie" }) as PinMessage;
}

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
      reactions: Object.fromEntries(REACTIONS.map((r) => [r, list(d.reactions?.[r])]).filter(([, v]) => (v as string[]).length)),
      readBy: list(d.readBy),
      pinned: d.pinned === true,
    },
  };
}

/** Noch sichtbar: dauerhaft angeheftet oder jünger als 3 Tage */
const isFresh = (m: PinMessage, nowMs: number) => m.data.pinned || nowMs - new Date(m.erstellt).getTime() < PIN_DAYS * 86_400_000;

/** Sichtbare Nachrichten, neueste zuerst */
export function visiblePins(list: PinMessage[], nowMs: number): PinMessage[] {
  return list.filter((m) => isFresh(m, nowMs)).sort((a, b) => b.erstellt.localeCompare(a.erstellt));
}

/** Alte Nachrichten wegräumen (beim Speichern) */
export const prunePins = (list: PinMessage[], nowMs: number) => list.filter((m) => isFresh(m, nowMs));

export const addPin = (list: PinMessage[], pin: PinMessage) => [...list.filter((m) => m.id !== pin.id), pin];

export const removePin = (list: PinMessage[], id: string) => list.filter((m) => m.id !== id);

const touch = (m: PinMessage, data: Partial<PinData>, stamp: string): PinMessage => ({ ...m, data: { ...m.data, ...data }, geaendert: stamp });

/** Reaktion an/aus (eine Person je Reaktion einmal) */
export function toggleReaction(list: PinMessage[], id: string, reaction: Reaction, me: string, stamp: string): PinMessage[] {
  return list.map((m) => {
    if (m.id !== id) return m;
    const who = m.data.reactions[reaction] ?? [];
    const next = who.includes(me) ? who.filter((w) => w !== me) : [...who, me];
    return touch(m, { reactions: { ...m.data.reactions, [reaction]: next } }, stamp);
  });
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
