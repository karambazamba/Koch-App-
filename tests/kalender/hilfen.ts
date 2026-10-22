// Kleine Hilfen für die Bereichs-Tests (Kalender, Einkauf, Vorrat, Notizen):
// Fenster mit Speicher im Speicher und Einträge zum Anlegen.
import { createEntry } from "@/lib/core/entries";
import type { AufgabeData, CalendarEntry, TerminData } from "@/lib/kalender/model";
import { memoryStorage } from "../helpers";

/** Ein Ersatz-`window` mit localStorage/sessionStorage im Speicher */
export function fakeWindow(local: Record<string, string> = {}, session: Record<string, string> = {}) {
  const w = { localStorage: memoryStorage(local), sessionStorage: memoryStorage(session), addEventListener() {}, removeEventListener() {} };
  (globalThis as { window?: unknown }).window = w;
  return w;
}

export const termin = (data: Partial<TerminData> & { title: string; date: string; start: string }, opts: { raum?: "familie" | "arbeit"; id?: string } = {}) =>
  createEntry("termin", { reminder: "aus", ...data }, opts) as CalendarEntry;

export const aufgabe = (data: Partial<AufgabeData> & { title: string }, opts: { raum?: "familie" | "arbeit"; id?: string } = {}) =>
  createEntry("aufgabe", { reminder: "aus", ...data }, opts) as CalendarEntry;
