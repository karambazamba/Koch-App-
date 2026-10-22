// Gewählte Filter für die Spontan-Ideen (nur für die Sitzung). Eigene Datei,
// damit das Layout (KitchenHelper) nicht die Ideen-Oberfläche mitlädt.

import { readRaw, writeRaw } from "@/lib/core/localStore";
import type { StorageKey } from "@/lib/core/storage";
import type { SpontanFilter } from "@/lib/essen/spontan";

const FILTER_KEY: StorageKey = "wasgibts.spontan.filter";

/** Gewählte Filter gelten für die Sitzung */
export function loadSpontanFilters(): SpontanFilter[] {
  try {
    const raw = JSON.parse(readRaw(FILTER_KEY, "session") ?? "[]");
    return Array.isArray(raw) ? raw.filter((f): f is SpontanFilter => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export function saveSpontanFilters(filters: SpontanFilter[]) {
  try {
    writeRaw(FILTER_KEY, JSON.stringify(filters), "session");
  } catch {
    // ohne Speicher gilt die Auswahl nur für diese Antwort
  }
}
