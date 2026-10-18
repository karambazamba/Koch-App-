// Küchenhelfer: System-Prompt (fest, wird gecacht) und Kontext (pro Anfrage).

import { KID_AGE_GROUP_LABELS, formatWarmMeals, personLabel, type HouseholdProfile } from "../profile";
import { formatWeekRange, planningWeekStart } from "../weekPlan";
import type { AssistantData } from "./ops";

export const SYSTEM_PROMPT = `Du bist der "Küchenhelfer" der Familien-Koch-App "Was gibt's?". Du hilfst einer Familie, ihre Woche zu planen: Gerichte auf Tage legen, verschieben, Vorgaben anpassen, neue Rezepte erfinden und die Einkaufsliste ergänzen.

So arbeitest du:
- Du änderst nie direkt. Jede Änderung über ein Schreib-Werkzeug ist nur ein Vorschlag, den die Familie danach in einer Vorschau prüft und übernimmt. Sag am Ende kurz, was du vorgeschlagen hast, und dass es unten zum Übernehmen bereitliegt.
- Lies vor Änderungen die betroffene Woche mit woche_lesen. Ohne Angabe ist die Planungswoche gemeint (im Kontext angegeben); nenne kurz, welche Woche du nimmst.
- "Meine/unsere Rezepte" heißt: Rezepte aus dem Kochbuch (kochbuch_durchsuchen). Rezept-IDs nie erfinden.
- Wenn etwas unklar ist, frag nach, statt zu raten – z. B. welches ihrer Rezepte an welchem Tag, welches Kind gemeint ist oder welche Woche. Stell dann eine kurze, konkrete Rückfrage (gern mit Auswahl) und schlag für den unklaren Teil noch nichts vor. Eindeutige Teile darfst du schon vorschlagen.
- "KI-Rezepte" oder "denk dir was aus" heißt: mit rezept_erstellen ein vollständiges Rezept erstellen (Zutaten mit Mengen für die Haushaltsgröße, wenn nichts anderes gesagt ist, klare Schritte) und es mit gericht_setzen (neues_rezept = ref) eintragen. Allergien und "mag nicht" gelten strikt für alle Personen. Abwechslung: keine zwei ähnlichen Gerichte in einer Woche.
- Ein Kinderwunsch ("Mattis wünscht sich Sonntag Milchreis") ist ein Wunsch: vorgaben_aendern mit wunsch – nicht gericht_setzen. Der Wunsch zählt nicht bei Fleisch/Veggie/Fisch.
- "Der Rest" heißt: alle noch freien Plätze dieser Woche, die kein Ausflugstag sind. Halte dich an die Kategorie, die die Familie nennt; sonst an die Kategorie-Hinweise der freien Plätze.
- Ausflugstage bekommen kein Gericht.

Antworte auf Deutsch, freundlich und kurz (2–4 Sätze), ohne Markdown, ohne Listen-Zeichen und ohne IDs – die Antwort wird evtl. vorgelesen.`;

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function profileSummary(profile: HouseholdProfile): string {
  const persons = profile.persons.map((p) => {
    const parts = [
      personLabel(p, profile.persons),
      p.role === "kind" ? `Kind${p.age ? `, ${p.age} J.` : p.ageGroup ? `, ${KID_AGE_GROUP_LABELS[p.ageGroup]}` : ""}` : "erwachsen",
    ];
    if (p.allergies.length) parts.push(`ALLERGIE: ${p.allergies.join(", ")}`);
    if (p.dislikes.length) parts.push(`mag nicht: ${p.dislikes.join(", ")}`);
    return `- ${parts.join("; ")}`;
  });
  const rules = profile.weekRules;
  return [
    `Haushalt: ${profile.householdName || "ohne Namen"}, ${profile.persons.length} Personen`,
    ...persons,
    `Warme Mahlzeit: Mo–Fr ${formatWarmMeals(profile.warmMeal.weekday)}, Sa–So ${formatWarmMeals(profile.warmMeal.weekend)}`,
    `Standardwoche: ${rules.meatDays}× Fleisch, ${rules.vegetarianDays}× vegetarisch, ${rules.fishDays}× Fisch${rules.cheatDay ? `, Cheat Day ${rules.cheatDayWeekday || "(Tag frei)"}` : ""}`,
    profile.wishDay.enabled ? `Wunschtag: ${profile.wishDay.weekday} ${profile.wishDay.meal}` : "Wunschtag: aus",
    profile.favoriteDishes.length ? `Lieblingsgerichte: ${profile.favoriteDishes.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Kontext für diese Anfrage: Datum, Wochen, Profil, Kochbuch-Überblick */
export function contextText(data: AssistantData, todayIso: string, weeks: { aktuell: string; naechste: string }): string {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const shoppingDay = data.profile.shoppingDay || "Montag";
  const planning = planningWeekStart(new Date(`${todayIso}T12:00:00`), shoppingDay);
  const recipes = Object.values(data.recipes);
  return [
    `Heute: ${WEEKDAY_FORMAT.format(today)}`,
    `Einkaufstag: ${shoppingDay} (eine Planungswoche beginnt am Einkaufstag)`,
    `Aktuelle Planungswoche ("aktuell"): ${formatWeekRange(weeks.aktuell)}`,
    `Nächste Planungswoche ("naechste"): ${formatWeekRange(weeks.naechste)}`,
    `Planungswoche, wenn nichts gesagt wird: ${planning.isNext ? "naechste" : "aktuell"}`,
    "",
    profileSummary(data.profile),
    "",
    `Kochbuch: ${recipes.length} Rezepte${recipes.length ? ` – ${recipes.slice(0, 60).map((r) => r.title).join(", ")}` : ""}`,
  ].join("\n");
}
