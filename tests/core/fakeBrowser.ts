// Kleiner Browser-Ersatz für die Tests in tests/core, tests/heute, tests/timer
// und tests/sport: `window` mit Speicher, Ereignissen und (für die
// Zurück-Navigation) Verlauf und Scrollhöhe. Vor jedem Test neu aufrufen;
// Module mit eigenem Zustand danach frisch laden (`vi.resetModules()` + `await import`).
import { memoryStorage } from "../helpers";
import { createEntry } from "@/lib/core/entries";
import type { AufgabeData, CalendarEntry, TerminData } from "@/lib/kalender/model";

type Listener = (event: { type: string; key?: string }) => void;

export type FakeWindow = ReturnType<typeof fakeBrowser>;

export function fakeBrowser(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const listeners = new Map<string, Set<Listener>>();
  const history: { url: string }[] = [{ url: "/" }];
  const win = {
    localStorage: memoryStorage(local),
    sessionStorage: memoryStorage(session),
    location: { pathname: "/", search: "", href: "http://localhost/" },
    scrollY: 0,
    innerHeight: 800,
    scrolls: [] as number[],
    scrollTo(_x: number, y: number) {
      win.scrollY = y;
      win.scrolls.push(y);
    },
    history: {
      scrollRestoration: "auto",
      pushState(_d: unknown, _t: string, url?: string | URL | null) {
        if (url !== undefined && url !== null) setUrl(String(url));
        history.push({ url: String(url) });
      },
      replaceState(_d: unknown, _t: string, url?: string | URL | null) {
        if (url !== undefined && url !== null) setUrl(String(url));
      },
    } as unknown as History,
    addEventListener(type: string, fn: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(event: { type: string; key?: string }) {
      listeners.get(event.type)?.forEach((fn) => fn(event));
      return true;
    },
    listenerCount: (type: string) => listeners.get(type)?.size ?? 0,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  function setUrl(url: string) {
    const [pathname, query] = url.split("?");
    win.location.pathname = pathname;
    win.location.search = query ? `?${query}` : "";
    win.location.href = `http://localhost${url}`;
  }
  (globalThis as { window?: unknown }).window = win;
  return Object.assign(win, { setUrl });
}

/** Browser wieder weg (Server-Zustand) */
export function noBrowser() {
  delete (globalThis as { window?: unknown }).window;
}

/** Termin im Kalender (Familie, ohne Erinnerung) */
export const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }, raum: "familie" | "arbeit" = "familie") =>
  createEntry("termin", { reminder: "aus", ...data }, { raum }) as CalendarEntry;

/** Aufgabe (Familie, ohne Erinnerung) */
export const aufgabe = (data: Partial<AufgabeData> & { title: string }) => createEntry("aufgabe", { reminder: "aus", ...data }, { raum: "familie" }) as CalendarEntry;

/**
 * Feste Zeit auch für frisch geladene Module (`at()` aus den Hilfen wirkt nur
 * auf die zuerst geladene Uhr – nach `vi.resetModules()` gibt es eine neue).
 */
export async function atFresh(iso: string) {
  const { setNowForTests } = await import("@/lib/core/now");
  setNowForTests(new Date(`${iso}:00+02:00`));
}
