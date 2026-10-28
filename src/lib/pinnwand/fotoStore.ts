// Bilder der Foto-Zettel auf dem Gerät: IndexedDB `wasgibts-fotos` (v1,
// Tabelle "bilder", Schlüssel = Zettel-ID, Bild als ArrayBuffer + Typ) – wie
// der Ton der Sprachnachrichten (gleiche Technik, `createMemoAudio`). Fehlt
// das Bild, holt es der Abgleich einmal aus dem Haushalt (Bucket „fotos“).
// Ohne IndexedDB bleibt es im Arbeitsspeicher, bis die App geschlossen wird.

import { createMemoAudio, idbTable, type RemoteLoader } from "@/lib/pinnwand/memoAudio";
import type { PinMessage } from "@/lib/pinnwand/model";
import { loadPins } from "@/lib/pinnwand/store";
import { now } from "@/lib/core/now";

let remote: RemoteLoader | null = null;

/** Der Abgleich meldet hier, wie Bilder aus dem Haushalt geholt werden (null = kein Haushalt) */
export function setFotoRemote(loader: RemoteLoader | null) {
  remote = loader;
}

const table = idbTable("wasgibts-fotos", "bilder");

const store = createMemoAudio(
  () => (typeof indexedDB === "undefined" ? null : table),
  () => undefined,
  () => remote,
);

export const fotoStore = {
  save: (id: string, blob: Blob) => store.save(id, blob),
  load: (pin: Pick<PinMessage, "id" | "data">) => store.load({ id: pin.id, data: { storagePath: pin.data.foto?.path ?? null } }),
  remove: (id: string) => store.remove(id),
};

/** Beim Start: Bilder ohne Zettel (von Hand gelöscht) wegräumen – frisch Abgelegtes bleibt */
export async function sweepFotos(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const nowMs = now().getTime();
    const live = new Set(loadPins().map((p) => p.id));
    const orphans = (await store.list()).filter((r) => !live.has(r.id) && nowMs - r.at > 10 * 60_000);
    await Promise.all(orphans.map((r) => store.remove(r.id)));
  } catch {
    // nächstes Mal
  }
}
