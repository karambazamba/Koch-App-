// Daten & App: alles, was die App im Browser speichert, als eine Datei
// sichern und wieder einspielen (z. B. beim Handywechsel oder bevor man die
// App neu zum Home-Bildschirm hinzufügt). Welche Schlüssel dazugehören,
// steht im Verzeichnis `storage.ts` (`backup: true`).

import { plural } from "@/lib/core/text";
import { APP_VERSION } from "@/lib/core/app";
import { now } from "@/lib/core/now";
import { BACKUP_KEYS, OLD_TERMINE_KEY, STORAGE, type StorageKey } from "@/lib/core/storage";

export type Backup = { app: "was-gibts"; version: string; exportedAt: string; data: Record<string, string> };

/** Was eine Sicherung enthalten darf: alle bekannten Schlüssel (ältere Sicherungen hatten mehr) */
const KNOWN = new Set<string>([...STORAGE.filter((s) => s.area === "local").map((s) => s.key), OLD_TERMINE_KEY]);
/** Bleibt beim Einspielen auf dem Gerät (Zugangscode, Zähler, Geräte-Kennung …) */
const DEVICE_ONLY = new Set<string>(STORAGE.filter((s) => s.area === "local" && !s.backup).map((s) => s.key));

const PINNWAND = "wasgibts.pinnwand";

/** Sprachnachrichten bleiben auf dem Gerät: aus der Pinnwand nehmen, nur die Zahl merken */
function withoutMemos(value: string): string {
  try {
    const raw = JSON.parse(value) as { memos?: unknown[] } | null;
    if (!raw || !Array.isArray(raw.memos)) return value;
    return JSON.stringify({ ...raw, memos: [], memosNichtGesichert: raw.memos.length });
  } catch {
    return value;
  }
}

/** `extra`: Schlüssel, die nur auf ausdrücklichen Wunsch mitkommen (z. B. geheime Kalender-Links) */
export function createBackup(storage: Pick<Storage, "getItem"> = localStorage, extra: StorageKey[] = []): Backup {
  const data: Record<string, string> = {};
  for (const key of [...BACKUP_KEYS, ...extra]) {
    const value = storage.getItem(key);
    if (value !== null) data[key] = key === PINNWAND ? withoutMemos(value) : value;
  }
  return { app: "was-gibts", version: APP_VERSION, exportedAt: now().toISOString(), data };
}

export function backupFileName(date = now()): string {
  return `mia-sicherung-${date.toISOString().slice(0, 10)}.json`;
}

/** Datei prüfen – null, wenn es keine Sicherung dieser App ist */
export function parseBackup(text: string): Backup | null {
  try {
    const raw = JSON.parse(text) as Partial<Backup>;
    if (raw.app !== "was-gibts" || !raw.data || typeof raw.data !== "object") return null;
    const data = Object.fromEntries(Object.entries(raw.data).filter((e): e is [string, string] => KNOWN.has(e[0]) && !DEVICE_ONLY.has(e[0]) && typeof e[1] === "string"));
    return { app: "was-gibts", version: String(raw.version ?? ""), exportedAt: String(raw.exportedAt ?? ""), data };
  } catch {
    return null;
  }
}

const count = plural;

function read(backup: Backup, key: string): unknown {
  try {
    return JSON.parse(backup.data[key] ?? "null");
  } catch {
    return null;
  }
}

/** Vorschau: "3 Termine, 5 Aufgaben, 2 Notizen, 12 Rezepte" – nur, was drin ist */
export function backupSummary(backup: Backup): string {
  const parts: string[] = [];
  const entries = (read(backup, "wasgibts.eintraege") as { entries?: { typ?: string }[] } | null)?.entries ?? [];
  const termine = entries.filter((e) => e?.typ === "termin").length;
  const aufgaben = entries.filter((e) => e?.typ === "aufgabe").length;
  if (termine) parts.push(count(termine, "Termin", "Termine"));
  if (aufgaben) parts.push(count(aufgaben, "Aufgabe", "Aufgaben"));
  const notes = (read(backup, "wasgibts.notizen") as { notes?: unknown[] } | null)?.notes?.length ?? 0;
  if (notes) parts.push(count(notes, "Notiz", "Notizen"));
  const recipes = Object.keys((read(backup, "wasgibts.kochbuch") as { recipes?: object } | null)?.recipes ?? {}).length;
  if (recipes) parts.push(count(recipes, "Rezept", "Rezepte"));
  const pantry = (read(backup, "wasgibts.vorrat") as { items?: unknown[] } | null)?.items?.length ?? 0;
  if (pantry) parts.push(count(pantry, "Sache im Haus", "Sachen im Haus"));
  const trainings = (read(backup, "wasgibts.sport") as { trainings?: unknown[] } | null)?.trainings?.length ?? 0;
  if (trainings) parts.push(count(trainings, "Training", "Trainings"));
  const memos = (read(backup, PINNWAND) as { memosNichtGesichert?: unknown } | null)?.memosNichtGesichert;
  if (typeof memos === "number" && memos > 0) parts.push(`${count(memos, "Sprachnachricht", "Sprachnachrichten")} (nicht gesichert)`);
  const persons = (read(backup, "familienkueche.haushaltsprofil") as { persons?: unknown[] } | null)?.persons?.length ?? 0;
  if (persons) parts.push(count(persons, "Person", "Personen"));
  return parts.length ? parts.join(", ") : "Einstellungen";
}

/** Sicherung einspielen: ersetzt die gesicherten Daten (alte Formate migrieren beim Laden); Geräte-Daten bleiben – auch die Sprachnachrichten dieses Geräts */
export function restoreBackup(backup: Backup, storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = localStorage) {
  const memos = deviceMemos(storage.getItem(PINNWAND));
  for (const key of KNOWN) if (!DEVICE_ONLY.has(key)) storage.removeItem(key);
  for (const [key, value] of Object.entries(backup.data)) storage.setItem(key, value);
  if (!memos.length) return;
  try {
    const raw = JSON.parse(storage.getItem(PINNWAND) ?? "null") as { version?: number; messages?: unknown[] } | null;
    const messages = Array.isArray(raw?.messages) ? raw.messages : [];
    storage.setItem(PINNWAND, JSON.stringify({ version: 2, messages, memos }));
  } catch {
    storage.setItem(PINNWAND, JSON.stringify({ version: 2, messages: [], memos }));
  }
}

function deviceMemos(value: string | null): unknown[] {
  try {
    const memos = (JSON.parse(value ?? "null") as { memos?: unknown } | null)?.memos;
    return Array.isArray(memos) ? memos : [];
  } catch {
    return [];
  }
}
