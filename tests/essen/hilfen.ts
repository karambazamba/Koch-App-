// Gemeinsame Hilfen für die Essen-Tests: Speicher im Speicher, Rezepte, Profil, Vorrat.
import { memoryStorage } from "../helpers";
import type { Recipe } from "@/lib/essen/cookbook";
import type { PantryItem, PantryPlace } from "@/lib/vorrat/pantry";
import { createEmptyProfile, type HouseholdProfile, type Person } from "@/lib/einstellungen/profile";

/** window mit localStorage/sessionStorage (für Speicher-Module) – liefert den localStorage */
export function fakeWindow(initial: Record<string, string> = {}): Storage {
  const local = memoryStorage(initial);
  (globalThis as { window?: unknown }).window = {
    localStorage: local,
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
  };
  return local;
}

let counter = 0;

/** Rezept mit festen Werten – Zutaten als Namen oder [Menge, Einheit, Name] */
export function rezept(
  title: string,
  zutaten: (string | [number | null, string, string])[] = [],
  extra: Partial<Recipe> = {},
): Recipe {
  counter++;
  return {
    id: extra.id ?? `r${counter}`,
    title,
    category: "vegetarisch",
    servings: 4,
    prepMinutes: 25,
    ingredients: zutaten.map((z, i) =>
      typeof z === "string" ? { id: `i${counter}-${i}`, amount: null, unit: "", name: z } : { id: `i${counter}-${i}`, amount: z[0], unit: z[1], name: z[2] },
    ),
    steps: ["Alles kochen."],
    note: "",
    source: "eigenes",
    ai: null,
    favorite: false,
    thumbsUp: 0,
    thumbsDown: 0,
    cookedCount: 0,
    lastCookedAt: null,
    known: false,
    kind: "kochen",
    oven: null,
    pan: "",
    kidSteps: [],
    machineSteps: [],
    createdAt: "",
    updatedAt: "",
    ...extra,
  };
}

/** Rezepte als Kochbuch-Map */
export const buch = (...list: Recipe[]): Record<string, Recipe> => Object.fromEntries(list.map((r) => [r.id, r]));

/** Vorrats-Eintrag */
export function vorrat(name: string, place: PantryPlace = "kuehlschrank", addedAt = "2026-10-22", amount: number | null = null): PantryItem {
  return { id: `p:${name}`, name, amount, unit: "", addedAt, place };
}

/** Familie: Anna, Ben (Erwachsene), Mathis (Schulkind, 8) – Standardwoche ab Montag */
export function familie(change: Partial<HouseholdProfile> = {}): HouseholdProfile {
  const base = createEmptyProfile();
  const persons: Person[] = [
    { ...base.persons[0], id: "anna", name: "Anna" },
    { ...base.persons[1], id: "ben", name: "Ben" },
    { ...base.persons[2], id: "mathis", name: "Mathis", ageGroup: "schulkind", age: 8 },
  ];
  return { ...base, persons, updatedAt: "", ...change };
}
