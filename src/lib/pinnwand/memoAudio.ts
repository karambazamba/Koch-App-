// Ton der Sprachnachrichten – hinter einer Schnittstelle. Mit Konto liegt er
// zusätzlich in Supabase Storage (`storagePath` am Eintrag, Etappe 3c): fehlt
// er auf dem Gerät, holt `setMemoRemote` ihn einmal und legt ihn ab. Auf dem
// Gerät: IndexedDB `wasgibts-memos` (v1, Tabelle "audio", Schlüssel
// = Memo-ID, Ton als ArrayBuffer + Typ) auf diesem Gerät, für alle Personen
// des Haushalts; klappt IndexedDB nicht, im Arbeitsspeicher, bis die App
// geschlossen wird. Nicht in „Daten sichern“. Verwaiste Töne (Memo von Hand gelöscht) räumt
// `tidyPinboard` (über `sweepMemoAudio`) beim Start weg; Memos im Archiv behalten ihren Ton.

import { micLog } from "@/lib/core/micLog";
import { now } from "@/lib/core/now";
import { forgetOldArchive, loadMemos } from "@/lib/pinnwand/store";

/** Wo der Ton liegt: auf dem Gerät (IndexedDB) oder nur, bis die App geschlossen wird */
export type MemoAudioPlace = "geraet" | "sitzung";

export interface MemoAudioStore {
  save(id: string, blob: Blob): Promise<MemoAudioPlace>;
  load(memo: { id: string; data: { storagePath: string | null } }): Promise<Blob | null>;
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

const opening = new Map<string, Promise<IDBDatabase>>();

function open(db: string, table: string): Promise<IDBDatabase> {
  let p = opening.get(db);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const req = indexedDB.open(db, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(table)) req.result.createObjectStore(table, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    opening.set(db, p);
    p.catch(() => opening.delete(db));
  }
  return p;
}

function run<T>(db: string, table: string, mode: IDBTransactionMode, work: (table: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open(db, table).then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(table, mode);
        const req = work(tx.objectStore(table));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error ?? new Error("abgebrochen"));
      }),
  );
}

/** Eine IndexedDB des Geräts als Tabelle (Ton: `wasgibts-memos`, Fotos: `wasgibts-fotos`) */
export const idbTable = (db: string, table: string): MemoTable => ({
  put: (row) => run(db, table, "readwrite", (t) => t.put(row)),
  get: (id) => run(db, table, "readonly", (t) => t.get(id)) as Promise<Row | undefined>,
  delete: (id) => run(db, table, "readwrite", (t) => t.delete(id)),
  getAll: () => run(db, table, "readonly", (t) => t.getAll()) as Promise<Row[]>,
});

/**
 * Ton-Speicher: zuerst IndexedDB; klappt das nicht (kein IndexedDB, Fehler
 * beim Ablegen), bleibt der Ton im Arbeitsspeicher – die Nachricht geht nie
 * verloren und bleibt abspielbar, bis die App geschlossen wird.
 */
export function createMemoAudio(table: () => MemoTable | null, log: (text: string) => void = () => undefined, remote: () => RemoteLoader | null = () => null): MemoAudioStore {
  const memory = new Map<string, { blob: Blob; at: number }>();
  const keepInMemory = (id: string, blob: Blob, why: string): MemoAudioPlace => {
    memory.set(id, { blob, at: now().getTime() });
    log(`Speichern: nur im Arbeitsspeicher (${why})`);
    return "sitzung";
  };
  const store: MemoAudioStore = {
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
      let here: Blob | null = null;
      try {
        here = blobFromRow(await table()?.get(memo.id));
      } catch {
        here = null;
      }
      const path = memo.data.storagePath;
      const fetchIt = remote();
      if (here || !path || !fetchIt) return here;
      // Aus dem Haushalt holen und für das nächste Mal ablegen
      const blob = await fetchIt(path).catch(() => null);
      if (blob) await store.save(memo.id, blob);
      return blob;
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
  return store;
}

/** Holt den Ton eines geteilten Memos (Pfad in Storage); null = gerade nicht */
export type RemoteLoader = (path: string) => Promise<Blob | null>;
let remoteLoader: RemoteLoader | null = null;

/** Der Abgleich meldet hier, wie Töne aus dem Haushalt geholt werden (null = kein Haushalt) */
export function setMemoRemote(loader: RemoteLoader | null) {
  remoteLoader = loader;
}

const memoTable = idbTable(DB, TABLE);

/** Die eine Quelle für den Ton (Gerät, sonst Haushalt, wenn `storagePath` gesetzt ist) */
export const memoAudio: MemoAudioStore = createMemoAudio(
  () => (typeof indexedDB === "undefined" ? null : memoTable),
  (text) => micLog(text),
  () => remoteLoader,
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

/** Beim Start: was 30 Tage im Archiv lag, still löschen, dann den Ton gelöschter Memos wegräumen */
export async function tidyPinboard(): Promise<void> {
  forgetOldArchive(now().getTime());
  await sweepMemoAudio(loadMemos().map((m) => m.id));
}
