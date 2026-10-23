// Sprachnachrichten teilen (Etappe 3c) – die reine Logik: wohin der Ton in
// Supabase Storage kommt (Bucket „memos“, <haushalt>/<memo-id>.m4a|webm|ogg),
// welche Memos noch hochgeladen werden und welche Dateien weg können. Der Ton
// bleibt 24 Std. ab der Aufnahme (wie das Memo, Tafel 72); Dateien räumen wir
// mit einer Stunde Luft weg. Netz und Speicher kommen von außen.

import type { MemoMessage } from "@/lib/pinnwand/memo";
import type { Result } from "@/lib/konten/model";

/** Ton-Dateien älter als 25 Std. dürfen weg (Memo lebt 24 Std.) */
export const MEMO_FILE_MS = 25 * 3_600_000;

/** Dateiendung zum Aufnahme-Format (iPhone = m4a) */
export function memoExt(mime: string): "m4a" | "webm" | "ogg" {
  if (/mp4|m4a|aac/i.test(mime)) return "m4a";
  if (/ogg/i.test(mime)) return "ogg";
  return "webm";
}

/** Pfad im Bucket – nur harmlose Zeichen (wie die Regel in der Datenbank) */
export function memoPath(householdId: string, memo: Pick<MemoMessage, "id" | "data">): string {
  const id = memo.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) || "memo";
  return `${householdId}/${id}.${memoExt(memo.data.mime)}`;
}

/** Inhaltstyp für Storage (ohne „;codecs=…“) */
export const memoContentType = (mime: string) => mime.split(";")[0].trim() || "audio/webm";

export type MemoFile = { name: string; createdAt: string };

/** Welche Dateien eines Haushalts weg können */
export function expiredMemoFiles(files: MemoFile[], nowMs: number): string[] {
  return files.filter((f) => nowMs - (Date.parse(f.createdAt) || nowMs) > MEMO_FILE_MS).map((f) => f.name);
}

export type UploadDeps = {
  householdId: string;
  memos(): MemoMessage[];
  load(memo: MemoMessage): Promise<Blob | null>;
  upload(path: string, blob: Blob): Promise<Result>;
  /** Pfad am Memo vermerken – dann wird das Memo geteilt */
  setPath(id: string, path: string): void;
};

/**
 * Memos ohne geteilten Ton hochladen (nur eigene Aufnahmen, die auf diesem
 * Gerät liegen). Liefert, wie viele geklappt haben; Fehler halten nichts auf –
 * beim nächsten Durchgang wird es nochmal versucht.
 */
export async function uploadPendingMemos(deps: UploadDeps): Promise<number> {
  let done = 0;
  for (const memo of deps.memos()) {
    if (memo.data.storagePath) continue;
    const blob = await deps.load(memo).catch(() => null);
    if (!blob) continue;
    const path = memoPath(deps.householdId, memo);
    const r = await deps.upload(path, blob).catch(() => ({ ok: false as const, error: "" }));
    if (!r.ok) continue;
    deps.setPath(memo.id, path);
    done++;
  }
  return done;
}
