// Ton der Sprachnachrichten – hinter einer Schnittstelle, damit er später mit
// den Konten in Supabase Storage liegt (`storagePath` am Eintrag) und geteilt
// wird. Bis dahin: IndexedDB `wasgibts-memos` (v1, Tabelle "audio", Schlüssel
// = Memo-ID) auf diesem Gerät, für alle Personen des Haushalts. Nicht in
// „Daten sichern“. Verwaiste Töne (Memo abgelaufen oder gelöscht) räumt
// `tidyMemos` (über `sweepMemoAudio`) beim Start weg.

import { now } from "@/lib/core/now";
import { pruneMemos, type MemoMessage } from "@/lib/pinnwand/memo";
import { changeMemos, loadMemos } from "@/lib/pinnwand/store";

export interface MemoAudioStore {
  save(id: string, blob: Blob): Promise<void>;
  load(memo: Pick<MemoMessage, "id" | "data">): Promise<Blob | null>;
  remove(id: string): Promise<void>;
  /** Alle gespeicherten Töne mit Zeitpunkt (für das Aufräumen) */
  list(): Promise<{ id: string; at: number }[]>;
}

const DB = "wasgibts-memos";
const TABLE = "audio";
type Row = { id: string; blob: Blob; at: number };

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
        const req = work(db.transaction(TABLE, mode).objectStore(TABLE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

/** Auf diesem Gerät (IndexedDB) */
const localMemoAudio: MemoAudioStore = {
  async save(id, blob) {
    await run("readwrite", (t) => t.put({ id, blob, at: now().getTime() } satisfies Row));
  },
  async load(memo) {
    try {
      const row = (await run("readonly", (t) => t.get(memo.id))) as Row | undefined;
      return row?.blob ?? null;
    } catch {
      return null;
    }
  },
  async remove(id) {
    await run("readwrite", (t) => t.delete(id));
  },
  async list() {
    const rows = (await run("readonly", (t) => t.getAll())) as Row[];
    return rows.map((r) => ({ id: r.id, at: r.at }));
  },
};

/** Die eine Quelle für den Ton (später: Supabase Storage, wenn `storagePath` gesetzt ist) */
export const memoAudio: MemoAudioStore = localMemoAudio;

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

/** Beim Start: abgelaufene Memos austragen und ihren Ton löschen */
export async function tidyMemos(): Promise<void> {
  const stored = loadMemos();
  const alive = pruneMemos(stored, now().getTime());
  if (alive.length !== stored.length) changeMemos((all) => all);
  await sweepMemoAudio(alive.map((m) => m.id));
}
