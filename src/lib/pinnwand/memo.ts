// Memos = kurze Sprachnachrichten an die Familie, direkt in der Pinnwand.
// Kein Mia, keine KI, keine Abschrift: nur Aufnahme, Abspielen, Verschwinden.
// Der Eintrag (typ "memo") liegt in `wasgibts.pinnwand`, der Ton selbst in
// IndexedDB (`memoAudio.ts`), mit Konto in Supabase Storage (`storagePath`).
// An der Tür als „Kassenbon“ (Tafel 106): bleibt, bis jemand abhakt (dann
// 1 s Häkchen, dann ins Archiv), sonst nach 7 Tagen leise ins Archiv (`tuer.ts`); im
// Archiv nach 30 Tagen still gelöscht, sonst nur von Hand, der Ton gleich
// mit. „Bleibt hängen“ gibt es bei Memos nicht. Rein, damit Oberfläche, Mia
// und Tests gleich rechnen.

import { createEntry, type Entry } from "@/lib/core/entries";
import { applyReaction, readReactions, type Reaction, type Reactions } from "@/lib/pinnwand/reactions";
import { isArchived, isForgotten, onDoor, readDone, readFarbe, type Done, type ZettelFarbe } from "@/lib/pinnwand/tuer";
import { personName } from "@/lib/konten/namen";

/** Höchstens 60 s, danach wird automatisch gesendet */
export const MEMO_MAX_S = 60;
/** Unter 1 s = nichts */
export const MEMO_MIN_MS = 1000;
/** Balken der Tonwelle */
export const WAVE_BARS = 28;

type MemoData = {
  author: string;
  /** Dauer in Sekunden (eine Nachkommastelle) */
  dauer: number;
  /** z. B. audio/mp4 (iPhone) oder audio/webm;codecs=opus */
  mime: string;
  /** Tonwelle 0..1, WAVE_BARS Werte */
  wave: number[];
  /** Wer es schon gehört hat (Autor zählt als gehört) */
  gehoertVon: string[];
  /** Zeitpunkt, an dem alle im Haushalt es gehört hatten (nur zur Info) */
  alleGehoertAm: string | null;
  /** Person → Emoji (eine Reaktion je Person) */
  reactions: Reactions;
  /** Pfad in Supabase Storage (später, mit Konten); bis dahin null = nur auf diesem Gerät */
  storagePath: string | null;
  /** Gewählte Farbe; null = Farbe der Person */
  farbe: ZettelFarbe | null;
  /** Erledigt von … am … (1 s mit Häkchen, dann weich ins Archiv) */
  erledigt: Done | null;
  /** Von Hand ins Archiv */
  archiv: string | null;
};
export type MemoMessage = Entry<MemoData> & { typ: "memo" };

const clampWave = (wave: number[]) => resample(wave.filter((v) => Number.isFinite(v)), WAVE_BARS).map((v) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100);

/** Tonwelle auf eine feste Zahl Balken bringen (Spitzenwerte je Abschnitt) */
export function resample(levels: number[], bars: number): number[] {
  if (!levels.length) return Array.from({ length: bars }, () => 0.15);
  return Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * levels.length) / bars);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / bars));
    return Math.max(...levels.slice(from, to));
  });
}

/** Leise Aufnahmen sollen trotzdem eine sichtbare Welle haben: lautester Moment = voller Balken */
function normalize(levels: number[]): number[] {
  const max = Math.max(0, ...levels.filter((v) => Number.isFinite(v)));
  return max > 0.01 ? levels.map((v) => v / max) : levels;
}

export function createMemo(input: { author: string; dauer: number; mime: string; wave: number[]; farbe?: ZettelFarbe | null }): MemoMessage {
  const author = input.author.trim() || "Ich";
  const data: MemoData = {
    author,
    dauer: Math.round(Math.min(MEMO_MAX_S, Math.max(0, input.dauer)) * 10) / 10,
    mime: input.mime,
    wave: clampWave(normalize(input.wave)),
    gehoertVon: [author],
    alleGehoertAm: null,
    reactions: {},
    storagePath: null,
    farbe: input.farbe ?? null,
    erledigt: null,
    archiv: null,
  };
  return createEntry("memo", data, { raum: "familie" }) as MemoMessage;
}

export function sanitizeMemo(raw: unknown): MemoMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as MemoMessage;
  if (e.typ !== "memo" || typeof e.id !== "string" || !e.data || typeof e.data.dauer !== "number" || typeof e.erstellt !== "string") return null;
  const d = e.data;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    ...e,
    raum: "familie",
    data: {
      author: typeof d.author === "string" && d.author.trim() ? (d.author.includes("@") ? personName(d.author) || "Ich" : d.author) : "Ich",
      dauer: Math.min(MEMO_MAX_S, Math.max(0, d.dauer)),
      mime: typeof d.mime === "string" ? d.mime : "audio/webm",
      wave: clampWave(Array.isArray(d.wave) ? d.wave.filter((v): v is number => typeof v === "number") : []),
      gehoertVon: list(d.gehoertVon),
      alleGehoertAm: typeof d.alleGehoertAm === "string" ? d.alleGehoertAm : null,
      reactions: readReactions(d.reactions),
      storagePath: typeof d.storagePath === "string" ? d.storagePath : null,
      farbe: readFarbe(d.farbe),
      erledigt: readDone(d.erledigt),
      archiv: typeof d.archiv === "string" ? d.archiv : null,
    },
  };
}

/** An der Tür (nicht im Archiv) */
export const memoAlive = (m: MemoMessage, nowMs: number) => onDoor(m, nowMs);

/** Memos an der Tür, neueste zuerst */
export const visibleMemos = (list: MemoMessage[], nowMs: number) => list.filter((m) => memoAlive(m, nowMs)).sort((a, b) => b.erstellt.localeCompare(a.erstellt));

/** An der Tür und nicht erledigt */
export const activeMemos = (list: MemoMessage[], nowMs: number) => visibleMemos(list, nowMs).filter((m) => !m.data.erledigt);

/** Memos im Archiv „Ältere“, neueste zuerst */
export const archivedMemos = (list: MemoMessage[], nowMs: number) => list.filter((m) => isArchived(m, nowMs) && !isForgotten(m, nowMs)).sort((a, b) => b.erstellt.localeCompare(a.erstellt));

/** 30 Tage im Archiv → still weg (wie die Zettel) */
export const forgetMemos = (list: MemoMessage[], nowMs: number) => (list.some((m) => isForgotten(m, nowMs)) ? list.filter((m) => !isForgotten(m, nowMs)) : list);

/** Ein Memo ändern (Erledigt, Archiv) */
export const updateMemo = (list: MemoMessage[], id: string, data: Partial<MemoData>, stamp: string) => list.map((m) => (m.id === id ? { ...m, geaendert: stamp, data: { ...m.data, ...data } } : m));

export const addMemo = (list: MemoMessage[], memo: MemoMessage) => [...list.filter((m) => m.id !== memo.id), memo];
export const removeMemo = (list: MemoMessage[], id: string) => list.filter((m) => m.id !== id);

/** Gehört von einer Person an/aus; sind alle aus dem Haushalt dabei, steht der Zeitpunkt dabei */
export function setMemoHeard(list: MemoMessage[], id: string, who: string, heard: boolean, household: string[], stamp: string): MemoMessage[] {
  return list.map((m) => {
    if (m.id !== id) return m;
    const has = m.data.gehoertVon.includes(who);
    if (has === heard) return m;
    const gehoertVon = heard ? [...m.data.gehoertVon, who] : m.data.gehoertVon.filter((w) => w !== who);
    const everyone = household.length > 0 && household.every((p) => gehoertVon.includes(p));
    return { ...m, geaendert: stamp, data: { ...m.data, gehoertVon, alleGehoertAm: everyone ? (m.data.alleGehoertAm ?? stamp) : null } };
  });
}

/** Reaktion setzen, tauschen oder entfernen (wie bei Text) */
export function toggleMemoReaction(list: MemoMessage[], id: string, reaction: Reaction, me: string, stamp: string): MemoMessage[] {
  return list.map((m) => (m.id === id ? { ...m, geaendert: stamp, data: { ...m.data, reactions: applyReaction(m.data.reactions, me, reaction) } } : m));
}

/** Noch nicht gehört (von jemand anderem) */
export const memoUnheard = (m: MemoMessage, me: string) => m.data.author !== me && !m.data.gehoertVon.includes(me);

/** 12.4 → "0:12" */
export function formatDauer(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Für Vorlesen/Screenreader: "12 Sekunden" bzw. "1 Minute" */
export function dauerWords(seconds: number): string {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return s === 1 ? "1 Sekunde" : `${s} Sekunden`;
  return s === 60 ? "1 Minute" : `1 Minute ${s - 60} Sekunden`;
}

/** Aufnahme-Format: iPhone audio/mp4 (AAC), sonst audio/webm (Opus) */
export function pickMemoMime(isSupported: (mime: string) => boolean): string | null {
  for (const mime of ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (isSupported(mime)) return mime;
  }
  return null;
}

/** "Spiel das Memo von Lisa ab" → { name: "Lisa" }; "Spiel die Sprachnachricht ab" → { name: null } */
export function memoPlayRequest(text: string): { name: string | null } | null {
  const t = text.trim().replace(/[.!?]+$/, "");
  if (!/\b(memo|sprachnachricht|sprachmemo|sprachnotiz)\b/i.test(t)) return null;
  if (!/\b(spiel\w*|abspielen|hör\w*|vorspielen)\b/i.test(t)) return null;
  const m = t.match(/\bvon\s+([a-zäöüß][\wäöüß-]*)/i);
  return { name: m ? m[1] : null };
}

/** Welches Memo Mia abspielen soll: das neueste der Person, ungehörte zuerst */
export function memoToPlay(list: MemoMessage[], name: string | null, me: string, nowMs: number): MemoMessage | null {
  const memos = visibleMemos(list, nowMs).filter((m) => !name || m.data.author.toLowerCase() === name.toLowerCase());
  return memos.find((m) => memoUnheard(m, me)) ?? memos[0] ?? null;
}

/** Wer im Haushalt ist (für „alle gehört“) – bis zu den Konten die Personen im Profil */
export function householdNames(persons: { name: string }[] | undefined, me: string): string[] {
  const names = (persons ?? []).map((p) => p.name.trim()).filter(Boolean);
  return [...new Set(names.length ? names : [me])];
}
