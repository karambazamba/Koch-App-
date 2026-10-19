// Daten & App: alles, was die App im Browser speichert, als eine Datei
// sichern und wieder einspielen (z. B. beim Handywechsel).

import { APP_VERSION } from "./app";
import { now } from "./now";

/** Unsere Speicher-Schlüssel (ohne Sitzungsdaten wie den Verlauf) */
const OWN_KEY = /^(wasgibts\.|familienkueche\.)/;

export type Backup = { app: "was-gibts"; version: string; exportedAt: string; data: Record<string, string> };

export function createBackup(): Backup {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && OWN_KEY.test(key)) data[key] = localStorage.getItem(key) ?? "";
  }
  return { app: "was-gibts", version: APP_VERSION, exportedAt: now().toISOString(), data };
}

export function backupFileName(date = now()): string {
  return `was-gibts-sicherung-${date.toISOString().slice(0, 10)}.json`;
}

/** Datei prüfen – null, wenn es keine Sicherung dieser App ist */
export function parseBackup(text: string): Backup | null {
  try {
    const raw = JSON.parse(text) as Partial<Backup>;
    if (raw.app !== "was-gibts" || !raw.data || typeof raw.data !== "object") return null;
    const data = Object.fromEntries(Object.entries(raw.data).filter((e): e is [string, string] => OWN_KEY.test(e[0]) && typeof e[1] === "string"));
    return { app: "was-gibts", version: String(raw.version ?? ""), exportedAt: String(raw.exportedAt ?? ""), data };
  } catch {
    return null;
  }
}

/** Sicherung einspielen: ersetzt alle eigenen Daten (alte Formate migrieren beim Laden) */
export function restoreBackup(backup: Backup) {
  for (const key of Object.keys({ ...localStorage })) if (OWN_KEY.test(key)) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(backup.data)) localStorage.setItem(key, value);
}
