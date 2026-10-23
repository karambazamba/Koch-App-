// Zuletzt bekannter Haushalt (`wasgibts.haushalt`): für offline, für die
// Einstellungen und für `cloudSync()` – die Laufzeit-Abfrage „Konten
// eingerichtet und angemeldet, in einem Haushalt“ (früher die Konstante
// CLOUD_SYNC). Ohne Speicher (Server) still leer.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import type { CloudUser, HouseholdInfo } from "@/lib/konten/model";

type Cached = { version: 1; user: CloudUser | null; household: HouseholdInfo | null };

export const accountCache = createLocalStore("wasgibts.haushalt", (raw: unknown): Cached | null => {
  if (!raw || typeof raw !== "object" || (raw as Cached).version !== 1) return null;
  const r = raw as Cached;
  const user = r.user && typeof r.user.userId === "string" ? { userId: r.user.userId, email: String(r.user.email ?? "") } : null;
  const h = r.household;
  const household = h && typeof h.id === "string" && Array.isArray(h.members) && h.me ? h : null;
  return { version: 1, user, household };
});

/** Angemeldet und in einem Haushalt (dann wird synchronisiert) */
export const cloudSync = (): boolean => Boolean(accountCache.load()?.household);

/** Meine Konto-ID im Haushalt (ohne Konto null – dann ist jede Aufgabe meine) */
export const myUserId = (): string | null => accountCache.load()?.household?.me.userId ?? null;

/** Zuletzt bekanntes Konto (ohne Netz) – für Einstellungen und Daten & App */
export function useCachedAccount(): { user: CloudUser | null; household: HouseholdInfo | null } {
  const data = useExternalStore(accountCache.subscribe, accountCache.load, () => null);
  return { user: data?.user ?? null, household: data?.household ?? null };
}
