// Gemeinsamer Baustein für lokal gespeicherte Daten (localStorage).
// Liefert load/save/clear/subscribe in der Form, die useSyncExternalStore
// erwartet. Beim Laden wird `migrate` aufgerufen, damit ältere gespeicherte
// Versionen weiter funktionieren. Später durch Supabase ersetzbar.
// Schlüssel nur aus dem Verzeichnis `storage.ts` (STORAGE).

import type { RetiredKey, StorageKey } from "@/lib/core/storage";

type LocalStore<T> = {
  load: () => T | null;
  save: (value: T) => void;
  clear: () => void;
  subscribe: (listener: () => void) => () => void;
};

export function createLocalStore<T>(
  key: StorageKey,
  migrate: (raw: unknown) => T | null,
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T | null = null;

  const notify = () => listeners.forEach((listener) => listener());

  const readStorage = (): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  return {
    load() {
      const raw = readStorage();
      // Gleiches Objekt zurückgeben, solange sich nichts geändert hat
      // (wichtig für useSyncExternalStore).
      if (raw === cachedRaw) return cachedValue;
      cachedRaw = raw;
      cachedValue = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          cachedValue = migrate(parsed);
          // Ältere Version → migrierten Stand einmalig zurückschreiben, damit
          // die Umstellung nicht bei jedem Laden neu (und evtl. anders) passiert.
          const version = (v: unknown) => (v && typeof v === "object" ? (v as { version?: unknown }).version : undefined);
          if (cachedValue && version(cachedValue) !== undefined && version(cachedValue) !== version(parsed)) {
            const migrated = JSON.stringify(cachedValue);
            window.localStorage.setItem(key, migrated);
            cachedRaw = migrated;
          }
        } catch {
          // Defekte Daten ignorieren – es wird dann neu angelegt.
        }
      }
      return cachedValue;
    },
    save(value) {
      window.localStorage.setItem(key, JSON.stringify(value));
      notify();
    },
    clear() {
      window.localStorage.removeItem(key);
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

type Area = "local" | "session";
const webStorage = (area: Area) => (area === "session" ? window.sessionStorage : window.localStorage);

/**
 * Einfacher Wert direkt lesen (für kleine Merker ohne Format/Migration, z. B.
 * „heute schon begrüßt“) – nur Schlüssel aus dem Verzeichnis. Ohne Speicher
 * (privater Modus, Server) still null.
 */
export function readRaw(key: StorageKey | RetiredKey, area: Area = "local"): string | null {
  try {
    return webStorage(area).getItem(key);
  } catch {
    return null;
  }
}

/** Einfachen Wert schreiben; null = löschen. Fehler (voll, gesperrt) still übergehen */
export function writeRaw(key: StorageKey | RetiredKey, value: string | null, area: Area = "local"): void {
  try {
    if (value === null) webStorage(area).removeItem(key);
    else webStorage(area).setItem(key, value);
  } catch {
    // ohne Speicher nichts zu tun
  }
}
