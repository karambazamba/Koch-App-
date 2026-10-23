// Fester Prüf-Haushalt für den Prüfstand: Familie Müller (Felix, Lisa,
// Mathis 8, Lisa mag keine Pilze, Mathis verträgt keine Nüsse), Mittwoch
// 21.10.2026 10:30, ein Termin (Zahnarzt Do 16 Uhr), eine Aufgabe (Steuer).

import { createEntry } from "@/lib/core/entries";
import { createEmptyProfile, createPerson } from "@/lib/einstellungen/profile";
import type { AssistantData } from "@/lib/begleitung/ops";
import type { CalendarEntry } from "@/lib/kalender/model";

export const PRUEF_HEUTE = "2026-10-21";
export const PRUEF_UHR = "10:30";

export function pruefHaushalt(): AssistantData {
  const base = createEmptyProfile();
  const persons = [
    { ...createPerson("erwachsen"), id: "p-felix", name: "Felix" },
    { ...createPerson("erwachsen"), id: "p-lisa", name: "Lisa", dislikes: ["Pilze"] },
    { ...createPerson("kind"), id: "p-mathis", name: "Mathis", allergies: ["Nüsse"], age: 8 },
  ];
  const entries = [
    createEntry("termin", { title: "Zahnarzt", date: "2026-10-22", start: "16:00", reminder: "aus" }, { raum: "familie", id: "t-zahnarzt" }),
    createEntry("aufgabe", { title: "Steuer machen", reminder: "aus" }, { raum: "familie", id: "a-steuer" }),
  ] as CalendarEntry[];
  return { profile: { ...base, householdName: "Müller", persons, adults: 2, kids: 1 }, weekPlans: {}, mealPlans: {}, recipes: {}, shopping: {}, entries };
}
