// Gemeinsame Hilfen für alle Tests: feste Zeit, Speicher im Speicher, ein
// kleiner Browser-Ersatz und Termine/Aufgaben zum Anlegen.
import { setNowForTests } from "@/lib/core/now";
import { createEntry, type Room } from "@/lib/core/entries";
import type { AufgabeData, CalendarEntry, TerminData } from "@/lib/kalender/model";
import type { JetztInput, JetztTermin } from "@/lib/heute/jetztTopics";

/** Feste Zeit (Europe/Berlin), z. B. "2026-10-20T09:00" */
export function at(iso: string) {
  setNowForTests(new Date(`${iso}:00+02:00`));
}

/**
 * Feste Zeit auch für frisch geladene Module (`at()` aus den Hilfen wirkt nur
 * auf die zuerst geladene Uhr – nach `vi.resetModules()` gibt es eine neue).
 */
export async function atFresh(iso: string) {
  const { setNowForTests } = await import("@/lib/core/now");
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

/**
 * Kleiner Browser-Ersatz: `window` mit localStorage, sessionStorage,
 * Ereignissen, Adresse, Verlauf und Scrollhöhe (auch als globales
 * localStorage/sessionStorage). Vor jedem Test neu aufrufen; Module mit
 * eigenem Zustand danach frisch laden (`vi.resetModules()` + `await import`,
 * Zeit dann mit `atFresh`).
 */
type Listener = (event: { type: string; key?: string }) => void;

export type FakeWindow = ReturnType<typeof fakeWindow>;

export function fakeWindow(local: Record<string, string> = {}, session: Record<string, string> = {}) {
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
  const g = globalThis as { window?: unknown; localStorage?: Storage; sessionStorage?: Storage };
  g.window = win;
  g.localStorage = win.localStorage;
  g.sessionStorage = win.sessionStorage;
  return Object.assign(win, { setUrl });
}

/** Browser wieder weg (Server-Zustand) */
export function noBrowser() {
  const g = globalThis as { window?: unknown; localStorage?: unknown; sessionStorage?: unknown };
  delete g.window;
  delete g.localStorage;
  delete g.sessionStorage;
}

type EntryOpts = Room | { raum?: Room; id?: string };
const entryOpts = (o: EntryOpts) => (typeof o === "string" ? { raum: o } : { raum: o.raum ?? "familie", ...(o.id ? { id: o.id } : {}) });

/** Termin im Kalender (Familie, ohne Erinnerung) */
export const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }, opts: EntryOpts = "familie") =>
  createEntry("termin", { reminder: "aus", ...data }, entryOpts(opts)) as CalendarEntry;

/** Aufgabe (Familie, ohne Erinnerung) */
export const aufgabe = (data: Partial<AufgabeData> & { title: string }, opts: EntryOpts = "familie") =>
  createEntry("aufgabe", { reminder: "aus", ...data }, entryOpts(opts)) as CalendarEntry;

/** Leere Eingabe für die Jetzt-Karte (Mi 21.10.2026), alle Kacheln des Standards sichtbar */
export function jetztInput(minutes: number, extra: Partial<JetztInput> = {}): JetztInput {
  return {
    minutes,
    today: "2026-10-21",
    calm: false,
    upcoming: [],
    tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] },
    dish: null,
    birthdays: [],
    sport: null,
    timer: null,
    cookingStep: null,
    reminder: null,
    pause: null,
    demo: false,
    tiles: ["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "spendentopf"],
    hidden: [],
    ...extra,
  };
}

/** Termin für die Jetzt-Karte */
export const jetztTermin = (title: string, time: string, extra: Partial<JetztTermin> = {}, date = "2026-10-21"): JetztTermin => ({ key: `${title}@${date}`, title, time, date, ...extra });

/** Einwilligung „KI darf mitdenken“ (Datenschutz, Platz 23) – für Tests, die die KI fragen */
export const KI_ERLAUBT: Record<string, string> = {
  "wasgibts.einwilligungen": JSON.stringify({ version: 1, arten: { ki: { ja: true, version: 2, at: "2026-10-01T00:00:00.000Z" } } }),
};
