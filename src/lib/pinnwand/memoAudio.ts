// Ton der Sprachnachrichten – hinter einer Schnittstelle, damit er später mit
// den Konten in Supabase Storage liegt (`storagePath` am Eintrag) und geteilt
// wird. Bis dahin: IndexedDB `wasgibts-memos` (v1, Tabelle "audio", Schlüssel
// = Memo-ID, Ton als ArrayBuffer + Typ) auf diesem Gerät, für alle Personen
// des Haushalts; klappt IndexedDB nicht, im Arbeitsspeicher, bis die App
// geschlossen wird. Nicht in „Daten sichern“. Verwaiste Töne (Memo abgelaufen oder gelöscht) räumt
// `tidyPinboard` (über `sweepMemoAudio`) beim Start weg.

import { micLog } from "@/lib/core/micLog";
import { now } from "@/lib/core/now";
import { pruneMemos, type MemoMessage } from "@/lib/pinnwand/memo";
import { prunePins } from "@/lib/pinnwand/model";
import { changeMemos, loadMemos, loadPins } from "@/lib/pinnwand/store";

/** Wo der Ton liegt: auf dem Gerät (IndexedDB) oder nur, bis die App geschlossen wird */
export type MemoAudioPlace = "geraet" | "sitzung";

export interface MemoAudioStore {
  save(id: string, blob: Blob): Promise<MemoAudioPlace>;
  load(memo: Pick<MemoMessage, "id" | "data">): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  /** Alle gespeicherten Töne mit Zeitpunkt (für das Aufräumen) */
  list(): Promise<{ id: string; at: number }[]>;
}

const DB = "wasgibts-memos";
const TABLE = "audio";
/**
 * Zeile in IndexedDB: Ton als ArrayBuffer + Typ (Safari/iOS lehnt Blobs in
 * IndexedDB teils ab, im privaten Tab immer). Ältere Zeilen (bis v0.67) haben
 * `blob` – sie werden weiter gelesen.
 */
type Row = { id: string; buf: ArrayBuffer; mime: string; at: number } | { id: string; blob: Blob; at: number };

/** Die nötigen Griffe auf die Tabelle (in Tests ersetzbar) */
export type MemoTable = {
  put(row: Row): Promise<unknown>;
  get(id: string): Promise<Row | undefined>;
  delete(id: string): Promise<unknown>;
  getAll(): Promise<Row[]>;
};

/** Ton aus einer Zeile – neue (ArrayBuffer) und alte (Blob) */
export function blobFromRow(row: Row | undefined): Blob | null {
  if (!row) return null;
  if ("buf" in row && row.buf) return new Blob([row.buf], { type: row.mime });
  if ("blob" in row && row.blob) return row.blob;
  return null;
}

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(TABLE)) req.result.createObjectStore(TABLE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    opening.catch(() => (opening = null));
  }
  return opening;
}

function run<T>(mode: IDBTransactionMode, work: (table: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(TABLE, mode);
        const req = work(tx.objectStore(TABLE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error ?? new Error("abgebrochen"));
      }),
  );
}

/** IndexedDB des Geräts als Tabelle */
const idbTable: MemoTable = {
  put: (row) => run("readwrite", (t) => t.put(row)),
  get: (id) => run("readonly", (t) => t.get(id)) as Promise<Row | undefined>,
  delete: (id) => run("readwrite", (t) => t.delete(id)),
  getAll: () => run("readonly", (t) => t.getAll()) as Promise<Row[]>,
};

/**
 * Ton-Speicher: zuerst IndexedDB; klappt das nicht (kein IndexedDB, Fehler
 * beim Ablegen), bleibt der Ton im Arbeitsspeicher – die Nachricht geht nie
 * verloren und bleibt abspielbar, bis die App geschlossen wird.
 */
export function createMemoAudio(table: () => MemoTable | null, log: (text: string) => void = () => undefined): MemoAudioStore {
  const memory = new Map<string, { blob: Blob; at: number }>();
  const keepInMemory = (id: string, blob: Blob, why: string): MemoAudioPlace => {
    memory.set(id, { blob, at: now().getTime() });
    log(`Speichern: nur im Arbeitsspeicher (${why})`);
    return "sitzung";
  };
  return {
    async save(id, blob) {
      const t = table();
      if (!t) return keepInMemory(id, blob, "kein IndexedDB");
      try {
        const buf = await blob.arrayBuffer();
        await t.put({ id, buf, mime: blob.type, at: now().getTime() });
        log(`Speichern ok (${buf.byteLength} Bytes)`);
        return "geraet";
      } catch (e) {
        return keepInMemory(id, blob, e instanceof Error ? e.name || e.message : "Fehler");
      }
    },
    async load(memo) {
      const kept = memory.get(memo.id);
      if (kept) return kept.blob;
      try {
        return blobFromRow(await table()?.get(memo.id));
      } catch {
        return null;
      }
    },
    async remove(id) {
      memory.delete(id);
      await table()?.delete(id);
    },
    async list() {
      const rows = (await table()?.getAll()) ?? [];
      return [...rows.map((r) => ({ id: r.id, at: r.at })), ...[...memory].map(([id, m]) => ({ id, at: m.at }))];
    },
  };
}

/** Die eine Quelle für den Ton (später: Supabase Storage, wenn `storagePath` gesetzt ist) */
export const memoAudio: MemoAudioStore = createMemoAudio(
  () => (typeof indexedDB === "undefined" ? null : idbTable),
  (text) => micLog(text),
);

/** Töne ohne Memo-Eintrag löschen (nicht frisch Aufgenommenes – das Speichern des Eintrags kann noch laufen) */
async function sweepMemoAudio(liveIds: string[], nowMs = now().getTime()): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  try {
    const live = new Set(liveIds);
    const orphans = (await memoAudio.list()).filter((r) => !live.has(r.id) && nowMs - r.at > 10 * 60_000);
    await Promise.all(orphans.map((r) => memoAudio.remove(r.id)));
    return orphans.length;
  } catch {
    return 0;
  }
}

/** Beim Start: alles älter als 24 Std. austragen (außer Angeheftetem) und den Ton abgelaufener Memos löschen */
export async function tidyPinboard(): Promise<void> {
  const nowMs = now().getTime();
  const stored = loadMemos();
  const alive = pruneMemos(stored, nowMs);
  // Speichern räumt beides weg (Nachrichten und Memos)
  if (alive.length !== stored.length || prunePins(loadPins(), nowMs).length !== loadPins().length) changeMemos((all) => all);
  await sweepMemoAudio(alive.map((m) => m.id));
}
