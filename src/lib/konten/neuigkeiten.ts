// Speicher der leisen Neuigkeiten aus dem Haushalt (`wasgibts.neu`, Etappe
// 3d) – füllt der Abgleich, liest die Jetzt-Karte. Nur auf dem Gerät, nicht
// in der Sicherung. Logik in `wer.ts`.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addNews, emptyNews, markNewsShown, migrateNews, type FamilyNews, type NewsState } from "@/lib/konten/wer";

const store = createLocalStore("wasgibts.neu", migrateNews);

export function noteFamilyNews(news: FamilyNews[]) {
  if (news.length) store.save(addNews(store.load() ?? emptyNews(), news));
}

export function markFamilyNewsShown(id: string, today: string) {
  const s = store.load() ?? emptyNews();
  const next = markNewsShown(s, id, today);
  if (next !== s) store.save(next);
}

export function useFamilyNews(): NewsState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}
