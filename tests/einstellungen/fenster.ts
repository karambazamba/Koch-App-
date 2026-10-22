// Kleines Browser-Fenster für Tests mit Speicher (localStorage/sessionStorage)
import { vi } from "vitest";
import { memoryStorage } from "../helpers";

/** Setzt window/localStorage auf frische Speicher; danach Module neu laden */
export function fakeWindow(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const localStorage = memoryStorage(local);
  const sessionStorage = memoryStorage(session);
  const win = { localStorage, sessionStorage, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true };
  vi.stubGlobal("window", win);
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("sessionStorage", sessionStorage);
  return { localStorage, sessionStorage };
}
