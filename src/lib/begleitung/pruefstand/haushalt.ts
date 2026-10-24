// Fester Prüf-Haushalt für den Prüfstand: Familie Müller (Felix, Lisa,
// Mathis 8, Lisa mag keine Pilze, Mathis verträgt keine Nüsse), Mittwoch
// 21.10.2026 10:30, ein Termin (Zahnarzt Do 16 Uhr), eine Aufgabe (Steuer).
// Je Satz eine passende Ausgangslage (`Lage`), damit kein Satz mit dem
// Haushalt kollidiert („Zahnarzt Do 16 Uhr“ ohne schon eingetragenen
// Zahnarzt, „Turnen fällt aus“ mit Turnen, „Tausch Montag und Mittwoch“ mit
// Gerichten im Plan, „Nächster Schritt“ mit laufendem Kochmodus). Wetter:
// feste Test-Vorhersage statt Abruf.

import { createEntry } from "@/lib/core/entries";
import { createEmptyProfile, createPerson } from "@/lib/einstellungen/profile";
import { applyOps, type AssistantData, type ChangeOp } from "@/lib/begleitung/ops";
import { weekStartFor } from "@/lib/essen/weekPlan";
import { mockForecast } from "@/lib/wetter/server";
import type { CalendarEntry } from "@/lib/kalender/model";
import type { Forecast } from "@/lib/wetter/forecast";

export const PRUEF_HEUTE = "2026-10-21";
export const PRUEF_UHR = "10:30";

/** Ausgangslage je Satz */
export type Lage = "ohne-zahnarzt" | "ohne-steuer" | "turnen" | "plan" | "kochmodus";

const PLAN: [string, string][] = [
  ["Montag", "Spaghetti Bolognese"],
  ["Dienstag", "Kartoffelsuppe"],
  ["Mittwoch", "Gemüsecurry mit Reis"],
  ["Donnerstag", "Hähnchen mit Ofengemüse"],
  ["Freitag", "Pizza"],
];

export function pruefHaushalt(lage: Lage[] = []): AssistantData {
  const base = createEmptyProfile();
  const persons = [
    { ...createPerson("erwachsen"), id: "p-felix", name: "Felix" },
    { ...createPerson("erwachsen"), id: "p-lisa", name: "Lisa", dislikes: ["Pilze"] },
    { ...createPerson("kind"), id: "p-mathis", name: "Mathis", allergies: ["Nüsse"], age: 8 },
  ];
  const entries = [
    ...(lage.includes("ohne-zahnarzt") ? [] : [createEntry("termin", { title: "Zahnarzt", date: "2026-10-22", start: "16:00", reminder: "aus" }, { raum: "familie", id: "t-zahnarzt" })]),
    ...(lage.includes("ohne-steuer") ? [] : [createEntry("aufgabe", { title: "Steuer machen", reminder: "aus" }, { raum: "familie", id: "a-steuer" })]),
    ...(lage.includes("turnen") ? [createEntry("termin", { title: "Turnen", date: "2026-10-23", start: "16:00", reminder: "aus", who: ["p-mathis"] }, { raum: "familie", id: "t-turnen" })] : []),
  ] as CalendarEntry[];
  let data: AssistantData = { profile: { ...base, householdName: "Müller", persons, adults: 2, kids: 1 }, weekPlans: {}, mealPlans: {}, recipes: {}, shopping: {}, entries };
  if (lage.includes("plan")) {
    const weekStart = weekStartFor(new Date(`${PRUEF_HEUTE}T12:00:00`), data.profile.shoppingDay || "Montag");
    const ops: ChangeOp[] = PLAN.map(([weekday, title], i) => ({ id: `p${i}`, type: "set_meal", slot: { weekStart, weekday }, dish: { kind: "text", title, category: null } }) as ChangeOp);
    data = applyOps(data, ops).data;
  }
  if (lage.includes("kochmodus")) {
    data = {
      ...data,
      kochen: { dish: "Spaghetti Bolognese", recipe: "Spaghetti Bolognese", steps: ["Zwiebeln würfeln und in Öl anbraten.", "Hack dazu und krümelig braten.", "Tomaten dazu, 20 Minuten köcheln.", "Spaghetti kochen und mit der Soße servieren."], done: [0], active: true },
    };
  }
  return data;
}

/** Feste Test-Vorhersage für Wetterfragen (Regen ab Nachmittag) */
export const pruefWetter = (): Forecast => mockForecast("Eutin", "regen", PRUEF_HEUTE);
