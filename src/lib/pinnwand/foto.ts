// Fotos an der Pinnwand (Polaroid, Tafel 106): vor dem Speichern verkleinert
// (längste Seite höchstens 1600 px, JPEG). Das Bild liegt auf dem Gerät
// (IndexedDB `wasgibts-fotos`, `fotoStore.ts`), mit Konto zusätzlich im
// Haushalt (Supabase Storage, Bucket „fotos“, nur Mitglieder – RLS). Nicht in
// „Daten sichern“. Geteilt wird der Zettel erst, wenn das Bild oben liegt
// (`foto.path`). Bilder von „Nur für mich“-Zetteln bleiben auf dem Gerät. Rein.

import type { PinMessage } from "@/lib/pinnwand/model";
import type { Result } from "@/lib/konten/model";

/** Längste Seite nach dem Verkleinern */
export const FOTO_MAX_PX = 1600;
/** JPEG-Güte */
export const FOTO_QUALITY = 0.82;
/** Größte Datei im Haushalt (wie die Regel des Buckets) */
export const FOTO_MAX_BYTES = 1_572_864;

/** Zielgröße: längste Seite ≤ 1600 px, Seitenverhältnis bleibt, nie größer als vorher */
export function fitFoto(w: number, h: number, max = FOTO_MAX_PX): { w: number; h: number } {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  const k = Math.min(1, max / Math.max(W, H));
  return { w: Math.max(1, Math.round(W * k)), h: Math.max(1, Math.round(H * k)) };
}

/** Pfad im Bucket „fotos“: <haushalt>/<zettel-id>.jpg – nur harmlose Zeichen (wie die Regel in der Datenbank) */
export function fotoPath(householdId: string, pin: Pick<PinMessage, "id">): string {
  const id = pin.id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) || "foto";
  return `${householdId}/${id}.jpg`;
}

export type FotoUploadDeps = {
  householdId: string;
  pins(): PinMessage[];
  load(pin: PinMessage): Promise<Blob | null>;
  upload(path: string, blob: Blob): Promise<Result>;
  /** Pfad am Zettel vermerken – dann wird der Zettel geteilt */
  setPath(id: string, path: string): void;
};

/** Fotos ohne geteilten Pfad hochladen (nur, was auf diesem Gerät liegt; „Nur für mich“ nie); Fehler halten nichts auf */
export async function uploadPendingFotos(deps: FotoUploadDeps): Promise<number> {
  let done = 0;
  for (const pin of deps.pins()) {
    if (pin.data.papier !== "foto" || !pin.data.foto || pin.data.foto.path || pin.data.privat) continue;
    const blob = await deps.load(pin).catch(() => null);
    if (!blob || blob.size > FOTO_MAX_BYTES) continue;
    const path = fotoPath(deps.householdId, pin);
    const r = await deps.upload(path, blob).catch(() => ({ ok: false as const, error: "" }));
    if (!r.ok) continue;
    deps.setPath(pin.id, path);
    done++;
  }
  return done;
}
