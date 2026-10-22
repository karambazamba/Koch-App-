// Gemeinsame Hilfen für die Tests: feste Zeit und kleiner Speicher im Speicher
import { setNowForTests } from "@/lib/core/now";
import { createEntry } from "@/lib/core/entries";
import type { AufgabeData, CalendarEntry, TerminData } from "@/lib/kalender/model";

/** Feste Zeit (Europe/Berlin), z. B. "2026-10-20T09:00" */
export function at(iso: string) {
  setNowForTests(new Date(`${iso}:00+02:00`));
}

/** Einfacher Ersatz für localStorage/sessionStorage */
export function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

/** Termin im Kalender (Familie, ohne Erinnerung) */
export const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }) =>
  createEntry("termin", { reminder: "aus", ...data }, { raum: "familie" }) as CalendarEntry;

/** Aufgabe (Familie, ohne Erinnerung) */
export const aufgabe = (data: Partial<AufgabeData> & { title: string }) => createEntry("aufgabe", { reminder: "aus", ...data }, { raum: "familie" }) as CalendarEntry;

/**
 * Kleiner Browser-Ersatz für Speicher-Tests: `window` mit localStorage,
 * sessionStorage und Ereignissen. Vor jedem Test neu aufrufen; Module mit
 * eigenem Zwischenspeicher danach frisch laden (`vi.resetModules()` + `await import`).
 */
export function fakeWindow(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const win = {
    localStorage: memoryStorage(local),
    sessionStorage: memoryStorage(session),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    location: { search: "", pathname: "/", href: "http://localhost/" },
  };
  (globalThis as { window?: unknown }).window = win;
  return win;
}
