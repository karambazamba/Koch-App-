// Pinnwand = Kühlschranktür (Tafel 106): Zettel für alle im Haushalt (Text
// bis 140 Zeichen, Karoblatt für Kinder, Foto als Polaroid), Autor, Zeit,
// Farbe der Person, Reaktionen je Person, gelesen von, Antwort mit Zitat.
// Im einheitlichen Eintrags-Modell (typ "pinnwand", Raum Familie), geteilt
// über die Konten. Ein Zettel bleibt an der Tür, bis jemand ihn abhakt (dann
// 1 s Häkchen, dann ins Archiv „Ältere“) oder bis er 7 Tage alt ist (leise ins
// Archiv). „Bleibt hängen“ (`pinned`) bleibt dauerhaft oben. Im Archiv nach
// 30 Tagen still gelöscht, sonst nur von Hand. Die Regeln der Tür stehen in
// `tuer.ts`. Rein, damit Oberfläche, Mia und Tests gleich rechnen.

import { createEntry, type Entry } from "@/lib/core/entries";
import { applyReaction, readReactions, type Reaction, type Reactions } from "@/lib/pinnwand/reactions";
import { isArchived, isForgotten, onDoor, readDone, readFarbe, readGroesse, readSort, type Done, type Groesse, type ZettelFarbe } from "@/lib/pinnwand/tuer";
import { personName } from "@/lib/konten/namen";
import { doorOrder } from "@/lib/pinnwand/ordnen";

export const PIN_MAX = 140;

/** Antwort auf einen Zettel: kurzes Zitat (Text bzw. „Sprachnachricht“) */
export type PinQuote = { id: string; author: string; text: string };

/** Papier: Haftnotiz, Karoblatt (Kinder) oder Foto (Polaroid) */
type Papier = "zettel" | "karo" | "foto";

/** Foto am Zettel: das Bild liegt auf dem Gerät (IndexedDB), mit Konto im Haushalt (`path`) */
type PinFoto = { path: string | null; w: number; h: number };

type PinData = {
  /** Text bzw. Zeile unter dem Foto (beim Foto darf er leer sein) */
  text: string;
  author: string;
  /** Person → Emoji (eine Reaktion je Person) */
  reactions: Reactions;
  replyTo: PinQuote | null;
  readBy: string[];
  /** „Bleibt hängen“ (oben links, geht nie von selbst ins Archiv) */
  pinned: boolean;
  /** Gewählte Farbe; null = Farbe der Person */
  farbe: ZettelFarbe | null;
  papier: Papier;
  foto: PinFoto | null;
  /** Erledigt von … am … (1 s mit Häkchen, dann weich ins Archiv) */
  erledigt: Done | null;
  /** Von Hand ins Archiv (z. B. „In Notizen“) */
  archiv: string | null;
  /** Mia hat schon einmal „Klingt nach Notiz“ gefragt */
  notizFrage: boolean;
  /** Klein (halbe Breite, Standard) oder groß (volle Breite) – Tafel 123 */
  groesse: Groesse;
  /** Platz an der Tür (kleiner = weiter vorn); null = nach der Zeit, neueste vorn */
  sort: number | null;
  /** „Nur für mich“: sieht nur, wer ihn geschrieben hat (im Haushalt: RLS wie „Arbeit“) */
  privat: boolean;
};
export type PinMessage = Entry<PinData> & { typ: "pinnwand" };

/** Absätze bleiben (höchstens eine Leerzeile), sonst Leerzeichen zusammengefasst @public */
export const cleanPinText = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, PIN_MAX)
    .trim();
const clean = cleanPinText;

export type PinOptions = { farbe?: ZettelFarbe | null; papier?: Papier; pinned?: boolean; foto?: PinFoto | null; privat?: boolean; groesse?: Groesse };

export function createPin(text: string, author: string, replyTo: PinQuote | null = null, opts: PinOptions = {}): PinMessage | null {
  const t = clean(text);
  const papier = opts.foto ? "foto" : opts.papier === "karo" ? "karo" : "zettel";
  if (!t && papier !== "foto") return null;
  const who = author.trim() || "Ich";
  const data: PinData = { text: t, author: who, reactions: {}, replyTo, readBy: [who], pinned: opts.pinned === true, farbe: opts.farbe ?? null, papier, foto: opts.foto ?? null, erledigt: null, archiv: null, notizFrage: false, groesse: readGroesse(opts.groesse), sort: null, privat: opts.privat === true };
  return createEntry("pinnwand", data, { raum: "familie" }) as PinMessage;
}

const readQuote = (v: unknown): PinQuote | null => {
  const q = v as Partial<PinQuote> | null;
  return q && typeof q === "object" && typeof q.id === "string" && typeof q.text === "string" ? { id: q.id, author: typeof q.author === "string" ? q.author : "", text: q.text.slice(0, PIN_MAX) } : null;
};

const readFoto = (v: unknown): PinFoto | null => {
  const f = v as Partial<PinFoto> | null;
  if (!f || typeof f !== "object") return null;
  const size = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 1);
  return { path: typeof f.path === "string" && f.path ? f.path : null, w: size(f.w), h: size(f.h) };
};

/** Gespeicherten Zettel lesen – auch ältere (bis v3 ohne Farbe, Papier, Erledigt; bis v4 ohne Größe, Platz, „Nur für mich“): alles bleibt, Farbe = Person, klein, Platz nach der Zeit, für alle */
export function sanitizePin(raw: unknown): PinMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as PinMessage;
  if (e.typ !== "pinnwand" || typeof e.id !== "string" || !e.data || typeof e.data.text !== "string") return null;
  const d = e.data as Partial<PinData>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const foto = readFoto(d.foto);
  const text = clean(d.text ?? "");
  if (!text && !foto) return null;
  return {
    ...e,
    raum: "familie",
    data: {
      text,
      author: typeof d.author === "string" && d.author.trim() ? (d.author.includes("@") ? personName(d.author) || "Ich" : d.author) : "Ich",
      reactions: readReactions(d.reactions),
      replyTo: readQuote(d.replyTo),
      readBy: list(d.readBy),
      pinned: d.pinned === true,
      farbe: readFarbe(d.farbe),
      papier: foto ? "foto" : d.papier === "karo" ? "karo" : "zettel",
      foto,
      erledigt: readDone(d.erledigt),
      archiv: typeof d.archiv === "string" ? d.archiv : null,
      notizFrage: d.notizFrage === true,
      groesse: readGroesse(d.groesse),
      sort: readSort(d.sort),
      privat: d.privat === true,
    },
  };
}

/** An der Tür (nicht im Archiv): „Bleibt hängen“ zuerst, sonst nach Platz (ohne Platz: neueste zuerst) */
export function visiblePins(list: PinMessage[], nowMs: number): PinMessage[] {
  return doorOrder(list.filter((m) => onDoor(m, nowMs)));
}

/** An der Tür und nicht erledigt – das, was Mia vorliest und die Jetzt-Karte kennt */
export const activePins = (list: PinMessage[], nowMs: number) => visiblePins(list, nowMs).filter((m) => !m.data.erledigt);

/** Im Archiv „Ältere“ (ohne Vergessenes), neueste zuerst */
export const archivedPins = (list: PinMessage[], nowMs: number) => list.filter((m) => isArchived(m, nowMs) && !isForgotten(m, nowMs)).sort((a, b) => b.erstellt.localeCompare(a.erstellt));

/** 30 Tage im Archiv → still weg (der Abgleich macht daraus eine Lösch-Markierung) */
export const forgetPins = (list: PinMessage[], nowMs: number) => (list.some((m) => isForgotten(m, nowMs)) ? list.filter((m) => !isForgotten(m, nowMs)) : list);

export const addPin = (list: PinMessage[], pin: PinMessage) => [...list.filter((m) => m.id !== pin.id), pin];

export const removePin = (list: PinMessage[], id: string) => list.filter((m) => m.id !== id);

const touch = (m: PinMessage, data: Partial<PinData>, stamp: string): PinMessage => ({ ...m, data: { ...m.data, ...data }, geaendert: stamp });

/** Einen Zettel ändern (Erledigt, Archiv, Bleibt hängen, Mia-Frage …) */
export const updatePin = (list: PinMessage[], id: string, data: Partial<PinData>, stamp: string) => list.map((m) => (m.id === id ? touch(m, data, stamp) : m));

/** Reaktion setzen, tauschen oder (gleiche nochmal) entfernen – eine je Person */
export function toggleReaction(list: PinMessage[], id: string, reaction: Reaction, me: string, stamp: string): PinMessage[] {
  return list.map((m) => (m.id === id ? touch(m, { reactions: applyReaction(m.data.reactions, me, reaction) }, stamp) : m));
}

/** Löschen darf nur, wer den Zettel geschrieben bzw. gesprochen hat */
export const canDelete = (m: { data: { author: string } }, me: string) => m.data.author === me;

export const setPinPinned = (list: PinMessage[], id: string, pinned: boolean, stamp: string) => updatePin(list, id, { pinned }, stamp);

/**
 * „Nur für mich“ an: der Zettel bekommt eine neue ID (der alte geht als
 * Lösch-Markierung an den Haushalt – so verschwindet er auch auf den Handys,
 * die ihn schon hatten). Ein Foto bleibt dann nur auf dem Gerät (`path` null),
 * bis er wieder für alle ist. „Für alle“ = gleiche ID, nur `privat` aus.
 */
export function makePinPrivate(list: PinMessage[], id: string, newId: string, stamp: string): PinMessage[] {
  const old = list.find((m) => m.id === id);
  if (!old || old.data.privat) return list;
  const copy: PinMessage = { ...old, id: newId, geaendert: stamp, data: { ...old.data, privat: true, foto: old.data.foto ? { ...old.data.foto, path: null } : null } };
  return list.map((m) => (m.id === id ? copy : m));
}

/** Alles gelesen (ich) */
export const markPinsRead = (list: PinMessage[], me: string) => (list.some((m) => !m.data.readBy.includes(me)) ? list.map((m) => (m.data.readBy.includes(me) ? m : { ...m, data: { ...m.data, readBy: [...m.data.readBy, me] } })) : list);

/** Ungelesen: an der Tür, nicht erledigt, von jemand anderem und noch nicht von mir gelesen */
export const hasUnread = (list: PinMessage[], me: string, nowMs: number) => visiblePins(list, nowMs).some((m) => !m.data.erledigt && !m.data.privat && m.data.author !== me && !m.data.readBy.includes(me));

const TAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

/**
 * Meta-Zeile in zwei Teilen: wer („Du“, „Lisa“) und wann („7:48“, „gestern“,
 * „3.10.“) – bei Platzmangel bleibt nur „wann“. `kurz` (an der Tür, Tafel
 * 123): die letzten sechs Tage als Wochentag („Lisa · Mo“).
 */
export function pinMetaParts(m: { erstellt: string; data: { author: string } }, me: string, today: string, clock: (iso: string) => string, dayOf: (iso: string) => string, kurz = false): { wer: string; wann: string } {
  const wer = m.data.author === me ? "Du" : m.data.author;
  const day = dayOf(m.erstellt);
  const [y, mo, d] = today.split("-").map(Number);
  const back = (n: number) => new Date(Date.UTC(y, mo - 1, d - n)).toISOString().slice(0, 10);
  const daysAgo = [1, 2, 3, 4, 5, 6].find((n) => back(n) === day);
  const datum = `${Number(day.slice(8, 10))}.${Number(day.slice(5, 7))}.`;
  if (day === today) return { wer, wann: clock(m.erstellt) };
  if (kurz && daysAgo) return { wer, wann: TAGE[new Date(`${day}T12:00:00Z`).getUTCDay()] };
  return { wer, wann: daysAgo === 1 ? "gestern" : datum };
}

/** "Du · 7:48" bzw. "Lisa · gestern" */
export function pinMeta(m: { erstellt: string; data: { author: string } }, me: string, today: string, clock: (iso: string) => string, dayOf: (iso: string) => string): string {
  const { wer, wann } = pinMetaParts(m, me, today, clock, dayOf);
  return `${wer} · ${wann}`;
}

/** Feste Farbe je Person (eine von vier; Avatare in Sport und Kalender) */
export function personTone(name: string): 0 | 1 | 2 | 3 {
  let h = 0;
  for (const c of name.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 4) as 0 | 1 | 2 | 3;
}

// --- Gespräch (ohne KI) ---------------------------------------------------------

/** "Schreib an die Pinnwand: Bin um 20 Uhr da" → der Text (oder null); auch „Häng nur für mich an die Pinnwand: …“ */
export function pinWriteCommand(text: string): string | null {
  const m = text.trim().match(/^(?:bitte\s+)?(?:schreib\w*|häng\w*|pinn\w*|setz\w*|pack\w*)?\s*(?:(?:das|bitte)\s+)?(?:(?:dauerhaft|fest)\s+)?(?:(?:nur\s+für\s+mich|privat)\s+)?(?:an|auf)\s+(?:die\s+)?pinnwand(?:\s+(?:dran|an|bitte))?\s*[:,–-]?\s*(.+)$/i);
  if (!m) return null;
  const body = m[1]
    .replace(/^(?:aber\s+|und\s+)?nur\s+für\s+mich\s*[:,–-]?\s*/i, "")
    .replace(/^["„“]|["“”]$/g, "")
    .trim();
  return body.length > 1 ? body : null;
}

/** Soll der Zettel hängen bleiben („Häng dauerhaft an die Pinnwand …“, „… soll hängen bleiben“)? */
export const pinStays = (text: string) => /(?<![a-zäöüß])(dauerhaft|fest\s+an|hängen\s+bleib\w*|bleib\w*\s+hängen)(?![a-zäöüß])/i.test(text);

/** Nur für mich („Häng nur für mich an die Pinnwand …“, „… privat an die Pinnwand“) */
export const pinPrivate = (text: string) => /(?<![a-zäöüß])(nur\s+für\s+mich|privat)(?![a-zäöüß])/i.test(text);

/**
 * „Mach den Zettel mit dem Geschenk für alle sichtbar“ → Suchwort („Geschenk“)
 * bzw. "" (dann der neueste „Nur für mich“-Zettel); sonst null.
 */
export function pinForAllCommand(text: string): string | null {
  const t = text.trim().replace(/[.!?]+$/, "");
  if (!/(?<![a-zäöüß])für\s+alle(?![a-zäöüß])/i.test(t) || !/(?<![a-zäöüß])(zettel|pinnwand)/i.test(t)) return null;
  if (!/(?<![a-zäöüß])(sichtbar|zeigen|zeig|freigeben|teilen|mach\w*)(?![a-zäöüß])/i.test(t)) return null;
  const m = t.match(/zettel\s+(?:mit\s+(?:dem|der|den)?\s*|über\s+(?:das|die|den)?\s*|zu[mr]?\s+)?["„“]?([a-zäöüß][\wäöüß-]{2,})/i);
  const word = m ? m[1] : "";
  return /^(für|auch|jetzt|bitte|doch|wieder|sichtbar)$/i.test(word) ? "" : word;
}

/** Welcher eigene „Nur für mich“-Zettel für alle sichtbar werden soll: passendes Wort, sonst der neueste */
export function pinToShare(list: PinMessage[], word: string, me: string, nowMs: number): PinMessage | null {
  const mine = visiblePins(list, nowMs).filter((m) => m.data.privat && m.data.author === me);
  const w = word.trim().toLowerCase();
  const hit = w ? mine.find((m) => m.data.text.toLowerCase().includes(w)) : undefined;
  return hit ?? (w && mine.length > 1 ? null : ([...mine].sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0] ?? null));
}

/** "Was steht auf der Pinnwand?" */
export const isPinboardQuery = (text: string) => /\b(was steht|was gibt['’]?s|zeig\w*|lies\w*)\b.*\bpinnwand\b/i.test(text) || /^pinnwand\??$/i.test(text.trim());
