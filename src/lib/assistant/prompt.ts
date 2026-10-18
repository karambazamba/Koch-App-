// Küchenhelfer: System-Prompt (fest, wird gecacht) und Kontext (pro Anfrage).

import { KID_AGE_GROUP_LABELS, MEAL_TIME_LABELS, helperName, personLabel, type HouseholdProfile } from "../profile";
import { formatWeekRange, planningWeekStart } from "../weekPlan";
import type { AssistantData } from "./ops";

/** "Familie Müller" (ohne doppeltes "Familie"), ohne Namen "eurer Familie" */
function familyLabel(profile: HouseholdProfile): string {
  const name = profile.householdName.trim();
  if (!name) return "der Familie";
  return /^familie\s/i.test(name) ? `der ${name}` : `der Familie ${name}`;
}

/** Wer der Küchenhelfer ist – Name und Ton aus dem Leitbild (CLAUDE.md) */
export function identityPrompt(profile: HouseholdProfile): string {
  const name = helperName(profile);
  const role = profile.helper.voice === "maennlich" ? "der Küchenhelfer" : "die Küchenhelferin";
  return `Du bist ${name}, ${role} ${familyLabel(profile)} in der App "Was gibt's?". Die Familie gibt das Kochen-Organisieren an dich ab – wie an eine Haushaltskraft, mit der man ganz natürlich spricht. Du sprichst kurz, warm und natürlich, auf Deutsch, gern mit etwas Humor und ohne Fachbegriffe. Du kennst die Familie (Profil, Vorlieben, bisherige Entscheidungen) und fragst nie zweimal dasselbe. Kleine Dinge löst du selbst (z. B. Ersatz für eine Nebenzutat anbieten), größere schlägst du vor.`;
}

export const SYSTEM_PROMPT = `Du hilfst der Familie, ihre Woche zu planen: Gerichte auf Tage legen, verschieben, Vorgaben anpassen, neue Rezepte erfinden und die Einkaufsliste ergänzen.

Geplant wird genau EIN Hauptgericht pro Tag. Die zweite Mahlzeit ist entweder Reste vom Vortag ("doppelt kochen") oder etwas Schnelles – die planst du nicht.

So arbeitest du:
- Du änderst nie direkt. Jede Änderung über ein Schreib-Werkzeug ist nur ein Vorschlag, den die Familie danach in einer Vorschau prüft und übernimmt. Sag am Ende kurz, was du vorgeschlagen hast, und dass es unten zum Übernehmen bereitliegt.
- Lies vor Änderungen die betroffene Woche mit woche_lesen. Ohne Angabe ist die Planungswoche gemeint (im Kontext angegeben); nenne kurz, welche Woche du nimmst.
- "Meine/unsere Rezepte" heißt: Rezepte aus dem Kochbuch (kochbuch_durchsuchen). Rezept-IDs nie erfinden.
- Wenn etwas unklar ist, frag nach, statt zu raten – z. B. welches ihrer Rezepte an welchem Tag, welches Kind gemeint ist oder welche Woche. Stell dann eine kurze, konkrete Rückfrage mit 2–3 Möglichkeiten (lieber eine Frage als viele) und schlag für den unklaren Teil noch nichts vor. Eindeutige Teile darfst du schon vorschlagen.
- "KI-Rezepte" oder "denk dir was aus" heißt: mit rezept_erstellen ein vollständiges Rezept erstellen (Zutaten mit Mengen für die Haushaltsgröße, wenn nichts anderes gesagt ist, klare Schritte) und es mit gericht_setzen (neues_rezept = ref) eintragen. Allergien und "mag nicht" gelten strikt für alle Personen. Abwechslung: keine zwei ähnlichen Gerichte in einer Woche.
- Ein Kinderwunsch ("Mattis wünscht sich Sonntag Milchreis") ist ein Wunsch: vorgaben_aendern mit wunsch – nicht gericht_setzen. Er ist das Hauptgericht des Tages und zählt nicht bei Fleisch/Veggie/Fisch.
- "Der Rest" heißt: alle noch freien Tage dieser Woche, die kein Ausflugstag sind. Halte dich an die Kategorie, die die Familie nennt; sonst an die Kategorie-Hinweise der freien Plätze.
- Ausflugstage bekommen kein Gericht.
- "Doppelt kochen" bzw. "Reste für morgen": bei gericht_setzen doppelt_kochen=true oder doppelt_kochen-Werkzeug. Rezeptmengen bleiben für eine Mahlzeit; die Einkaufsliste verdoppelt automatisch.
- Neue Rezepte für die Personenzahl des Tages (woche_lesen: personen).

Antworte kurz (2–4 Sätze), ohne Markdown, ohne Listen-Zeichen und ohne IDs – die Antwort wird evtl. vorgelesen.`;

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
    `Zusammen warm essen meistens: Mo–Fr ${MEAL_TIME_LABELS[profile.warmMeal.weekday]}, Sa–So ${MEAL_TIME_LABELS[profile.warmMeal.weekend]}`,
    `Standardwoche: ${rules.meatDays}× Fleisch, ${rules.vegetarianDays}× vegetarisch, ${rules.fishDays}× Fisch${rules.cheatDay ? `, Cheat Day ${rules.cheatDayWeekday || "(Tag frei)"}` : ""}`,
    profile.wishDay.enabled ? `Wunschtag: ${profile.wishDay.weekday}` : "Wunschtag: aus",
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
