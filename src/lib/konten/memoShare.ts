// Sprachnachrichten teilen (Etappe 3c) – die reine Logik: wohin der Ton in
// Supabase Storage kommt (Bucket „memos“, <haushalt>/<memo-id>.m4a|webm|ogg),
// welche Memos noch hochgeladen werden und welche Dateien weg können. Nichts
// verschwindet ungefragt (Kühlschranktür, Tafel 106): eine Datei geht erst,
// wenn ihr Eintrag von Hand gelöscht ist (oder es ihn nie gab) – mit einem
// Tag Luft, weil die Datei vor dem Eintrag hochgeladen wird. Gilt genauso für
// die Fotos (Bucket „fotos“). Netz und Speicher kommen von außen.

import type { MemoMessage } from "@/lib/pinnwand/memo";
import type { Result } from "@/lib/konten/model";

/** Luft für Dateien ohne Eintrag (der Eintrag kommt erst nach dem Hochladen) */
export const ORPHAN_GRACE_MS = 24 * 3_600_000;

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

/** Eintrags-ID zu einem Dateinamen („<haushalt>/<id>.<endung>“) */
const idOfFile = (name: string) => (name.split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "");

/** Welche Dateien weg können: ihr Eintrag ist gelöscht bzw. fehlt, und sie sind älter als einen Tag */
export function orphanFiles(files: MemoFile[], liveIds: Iterable<string>, nowMs: number): string[] {
  const live = new Set([...liveIds].map((id) => id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80)));
  return files.filter((f) => !live.has(idOfFile(f.name)) && nowMs - (Date.parse(f.createdAt) || nowMs) > ORPHAN_GRACE_MS).map((f) => f.name);
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
