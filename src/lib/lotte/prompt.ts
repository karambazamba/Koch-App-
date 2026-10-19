// Lotte: Systemanweisung (fest, wird gecacht) und Kontext (pro Anfrage).

import { HOUSEHOLD_TYPES, KID_AGE_GROUP_LABELS, MEAL_TIME_LABELS, helperName, mealClockFor, isSmallHousehold, personLabel, wishDayActive, type HouseholdProfile } from "../einstellungen/profile";
import { sortedBases } from "../essen/bases";
import { sortedLikes } from "../essen/likes";
import { formatPantryAmount, PANTRY_PLACES } from "../essen/pantry";
import { soonToUse } from "../essen/dishIdeas";
import { formatWeekRange, planningWeekStart, weekStartFor } from "../essen/weekPlan";
import { weekOf, type AssistantData } from "./ops";

/** "Familie Müller" (ohne doppeltes "Familie"), ohne Namen "der Familie"; ohne Kinder "des Haushalts" */
function familyLabel(profile: HouseholdProfile): string {
  const name = profile.householdName.trim();
  if (profile.householdType !== "familie") {
    if (profile.householdType === "single") return profile.persons[0]?.name ? `von ${profile.persons[0].name}` : "für einen Ein-Personen-Haushalt";
    return name ? `von ${name}` : profile.householdType === "wg" ? "der WG" : "des Paars";
  }
  if (!name) return "der Familie";
  return /^familie\s/i.test(name) ? `der ${name}` : `der Familie ${name}`;
}

/** Wer Lotte ist – Name und Ton aus dem Leitbild (CLAUDE.md) */
export function identityPrompt(profile: HouseholdProfile): string {
  const name = helperName(profile);
  return `Du bist ${name}, die Alltags-Assistentin ${familyLabel(profile)} in der App "Was gibt's?". Du hilfst bei allem, was im Alltag ansteht – Familie und Arbeit: Termine, Aufgaben, Essen und Einkauf. Man gibt dir Dinge ab wie einer guten Haushaltshilfe, mit der man ganz natürlich spricht.`;
}

export const SYSTEM_PROMPT = `So bist du:
- Warm, kurz, mitdenkend. Deutsch, natürlich, gern mit etwas Humor, ohne Fachbegriffe und ohne Formularton.
- Du denkst mit: Wenn du etwas Naheliegendes siehst (ein Termin passt nicht zum Abendessen, für morgen fehlt eine Zutat), erwähnst du es kurz und als Angebot – höchstens eine Sache.
- Du kennst den Haushalt (Kontext unten) und fragst nie zweimal dasselbe. Allergien und "mag nicht" gelten immer strikt.
- Antworte kurz: höchstens 2–3 Sätze, außer jemand will Details. Ohne Markdown, ohne Listen-Zeichen, ohne IDs – die Antwort wird evtl. vorgelesen.

Räume: "Familie" ist gemeinsam (alle im Haushalt sehen es), "Arbeit" ist persönlich. Ohne Angabe gehört etwas zur Familie.

So arbeitest du:
- Du legst Dinge auf Zuruf an und räumst sie wieder weg. Du änderst aber nie direkt: Jede Änderung über ein Werkzeug ist ein Vorschlag, den man unten mit "Übernehmen" bestätigt. Sag am Ende in einem halben Satz, was bereitliegt.
- Machen statt fragen: Kleine, eindeutige Dinge schlägst du direkt vor. Rückfragen nur bei echten Entscheidungen – dann eine kurze Frage mit 2–3 Möglichkeiten.
- Was du (noch) nicht mit Werkzeugen kannst – z. B. Aufgaben oder Erinnerungen –, sagst du ehrlich und freundlich; du merkst es dir dann nicht heimlich. Termine kannst du notieren (termin_notieren).
- Du kennst Datum, Wochentag und Uhrzeit aus dem Kontext. "Heute", "morgen", "heute Abend" rechnest du damit aus.

Ohne Druck – immer:
- Nie "du musst", "du solltest", "vergiss nicht". Immer als Angebot ("Soll ich …?") oder Erledigt-Meldung ("Ich hab … schon vorbereitet").
- Keine Streaks, keine Zähler, nichts Verpasstes. Nie "Du hast … nicht gemacht" oder "Ich vermisse dich".
- Wortwahl: nie "fehlt", "offen", "überfällig", "noch zu erledigen", "verpasst" oder "Alles da". Stattdessen vorbereitend: "Für Montag", "Ich hab schon …", "Bereit für …".
- Erleichterung statt Leistung: nicht übertrieben loben, nichts vorrechnen, nicht vergleichen.
- Bei Gesundheitsfragen keine Diagnosen – freundlich auf Arzt oder Ärztin verweisen. Nie Aussagen über Körper, Gewicht oder Kalorien.

Essen und Einkauf (Werkzeuge vorhanden):
- Geplant wird höchstens EIN Hauptgericht pro Tag. Planen ist freiwillig; spontan ist genauso gut.
- "Morgen gibt's Lachs": gericht_setzen für den Tag (passendes Rezept aus dem Kochbuch, sonst freier Text). Vorher die Woche mit woche_lesen ansehen; ohne Angabe ist die Planungswoche gemeint.
- "Wir brauchen Milch und Eier": einkaufsliste_hinzufuegen. Was schon auf der Einkaufsliste steht (Kontext), nicht doppelt eintragen.
- Vorrat ("Ich hab 4 Portionen Chili eingefroren"): vorrat_hinzufuegen. Wunsch ohne Tag ("Mathis wünscht sich Pfannkuchen"): wunsch_merken. Ein Kinderwunsch mit Tag: vorgaben_aendern mit wunsch.
- Termin ("Jonne hat Dienstag bis 17:30 Turnen"): termin_notieren; an so einem Tag darfst du etwas Schnelles fürs Abendessen anbieten.
- Ideen ("Was gibt's heute?", "Was mach ich mit Hack und Paprika?"): 2–3 kurze Ideen mit Minuten, zuerst aus dem aktuellen Vorrat (besonders "bald verbrauchen") und bekannten Rezepten; noch nichts eintragen, sondern anbieten. Nach der Essenszeit denk an morgen statt an heute.
- Neue Rezepte (rezept_erstellen) nur auf Wunsch, vollständig mit Mengen für die Personenzahl, dann mit gericht_setzen eintragen. "Nie wieder"-Gerichte und sehr ähnliche nie vorschlagen.
- Wochenend-Stil, Pause und Kochstil aus dem Kontext respektieren: bei "frei" am Wochenende nichts planen, an Pausentagen nichts planen, bei "Ich koche spontan" nie eine ganze Woche planen und keine Lücken erwähnen.
- Gesundheits-Tipps nur laut Einstellung im Kontext, höchstens einer, immer als freiwilliger Tausch für ein konkretes Gericht.`;

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
    `Haushalt: ${profile.householdName || "ohne Namen"}, ${profile.persons.length} Personen, Typ: ${HOUSEHOLD_TYPES.find((t) => t.value === profile.householdType)?.label ?? "Familie"}${isSmallHousehold(profile) ? " (kleine Mengen, Reste bewusst einplanen)" : ""}`,
    ...persons,
    `Zusammen warm essen meistens: Mo–Fr ${MEAL_TIME_LABELS[profile.warmMeal.weekday]}, Sa–So ${MEAL_TIME_LABELS[profile.warmMeal.weekend]}`,
    `Standardwoche: ${rules.meatDays}× Fleisch, ${rules.vegetarianDays}× vegetarisch, ${rules.fishDays}× Fisch${rules.cheatDay ? `, Cheat Day ${rules.cheatDayWeekday || "(Tag frei)"}` : ""}`,
    wishDayActive(profile) ? `Wunschtag: ${profile.wishDay.weekday}` : "Wunschtag: aus",
    `Wochenend-Stil: ${WEEKEND_TEXT[profile.weekendStyle]}`,
    `Kochstil: ${profile.cookingStyle === "rezept" ? "kocht gern nach Rezept" : "kocht meist nach Gefühl"}`,
    `Neue Gerichte pro Woche: ${profile.newPerWeek}`,
    `Modus: ${profile.helperMode === "locker" ? "ganz locker – nur melden, wenn es wirklich zeitkritisch ist, keine ungefragten Hinweise" : profile.helperMode === "dranbleiben" ? "dranbleiben – gern öfter beim Planen helfen und an freie Tage erinnern, immer freundlich und als Angebot" : "normal"}`,
    `Kochstil: ${profile.planStyle === "spontan" ? (profile.planWeek ? "spontan, diese Woche aber mit Plan" : "Ich koche spontan – keine Planung") : profile.planStyle === "mix" ? "Mal so, mal so" : "Ich plane gern"}`,
    `Küchenmaschine: ${profile.kitchenMachine === "thermomix" ? "Thermomix (Küchenmaschine mit Kochfunktion)" : "keine"}`,
    profile.pause ? `Pause: ${profile.pause.from}${profile.pause.until ? ` bis ${profile.pause.until}` : " (ohne Enddatum)"} – an diesen Tagen nichts planen` : "",
    profile.favoriteDishes.length ? `Lieblingsgerichte: ${profile.favoriteDishes.join(", ")}` : "",
    favoriteBases(profile),
    likesText(profile),
    neverAgainText(profile),
  ]
    .filter(Boolean)
    .join("\n");
}

const WEEKEND_TEXT = {
  frei: "frei – Sa/So nichts planen, nur auf Nachfrage helfen",
  locker: "locker – Sa/So höchstens eine Idee pro Tag, ohne Uhrzeit, ohne Erinnerungen",
  normal: "wie unter der Woche",
} as const;

/** "Lieblings-Basen: Nudeln (5×), Reis (2×)" */
function favoriteBases(profile: HouseholdProfile): string {
  const liked = sortedBases(profile.bases).filter((b) => profile.bases[b.id] > 0);
  return liked.length ? `Lieblings-Basen: ${liked.map((b) => `${b.label} (${profile.bases[b.id]}×)`).join(", ")}` : "";
}

/** "Das mögt ihr: Käse, Knoblauch, Paprika" (stärkste zuerst) */
function likesText(profile: HouseholdProfile): string {
  const likes = sortedLikes(profile.likes).slice(0, 15);
  return likes.length ? `Das mögt ihr (Lieblingszutaten, bevorzugt einbauen): ${likes.map((l) => l.name).join(", ")}` : "";
}

const TIP_LABEL = { aus: "aus", ab_und_zu: "ab und zu (höchstens 1 pro Woche)", oefter: "gern öfter (höchstens 3 pro Woche)" } as const;

/** Nie-wieder-Liste – geht immer an die KI */
function neverAgainText(profile: HouseholdProfile): string {
  if (profile.neverAgain.length === 0) return "";
  const lines = profile.neverAgain.slice(-40).map((e) => {
    const parts = [e.title];
    if (e.ingredients.length) parts.push(`Zutaten: ${e.ingredients.join(", ")}`);
    parts.push(e.reason ? `Grund: ${e.reason}` : "ohne Grund");
    return `- ${parts.join("; ")}`;
  });
  return `NIE WIEDER (diese und sehr ähnliche Gerichte nie vorschlagen, Gründe beachten):\n${lines.join("\n")}`;
}

/** Aktueller Vorrat, kompakt: "Hack 500 g (Kühlschrank), Zucchini (Kühlschrank, seit 4 Tagen – bald verbrauchen), Milch (gekauft)" */
function pantryText(data: AssistantData, todayIso: string): string {
  const items = data.pantry ?? [];
  if (!items.length) return "Vorrat: nichts notiert (Ideen aus Grundzutaten wie Nudeln, Eier, Reis; anbieten, dass die Familie sagt, was da ist)";
  const soon = new Set(soonToUse(items, todayIso).map((p) => p.name));
  const days = (iso: string) => Math.round((Date.parse(`${todayIso}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86_400_000);
  const parts = items.slice(0, 40).map((p) => {
    const where = p.id === "gekauft" ? "gekauft" : PANTRY_PLACES.find((x) => x.value === p.place)?.short ?? "";
    const note = soon.has(p.name) ? `, seit ${days(p.addedAt)} Tagen – bald verbrauchen` : "";
    return `${[p.name, formatPantryAmount(p.amount), p.unit].filter(Boolean).join(" ")} (${where}${note})`;
  });
  return `Vorrat (aktuell): ${parts.join(", ")}`;
}

/** Was es heute und morgen zu essen gibt (aus dem Plan) */
function todayMealText(data: AssistantData, todayIso: string): string {
  const shoppingDay = data.profile.shoppingDay || "Montag";
  const dish = (iso: string) => {
    const week = weekOf(data, weekStartFor(new Date(`${iso}T12:00:00`), shoppingDay));
    const day = week.days.find((d) => d.date === iso);
    if (!day) return "–";
    if (day.away) return day.paused ? "Pause" : "kein Kochtag";
    return day.slot.entry ? `${day.slot.entry.title} (${mealClockFor(data.profile, day.weekday)} Uhr)` : "nichts eingetragen";
  };
  const tomorrow = new Date(`${todayIso}T12:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tIso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  return `Essen heute: ${dish(todayIso)}; morgen: ${dish(tIso)}`;
}

/** Kontext für diese Anfrage: Datum, Uhrzeit, Essen, Wochen, Profil, Einkaufsliste, Vorrat, Kochbuch */
export function contextText(
  data: AssistantData,
  todayIso: string,
  weeks: { aktuell: string; naechste: string },
  tipsThisWeek = 0,
  extra: { clock?: string; shopping?: string[] } = {},
): string {
  const today = new Date(`${todayIso}T00:00:00Z`);
  const shoppingDay = data.profile.shoppingDay || "Montag";
  const planning = planningWeekStart(new Date(`${todayIso}T12:00:00`), shoppingDay);
  const recipes = Object.values(data.recipes);
  return [
    `Heute: ${WEEKDAY_FORMAT.format(today)} (${todayIso})${extra.clock ? `, jetzt ${extra.clock} Uhr` : ""} (Zeitzone Europe/Berlin)`,
    todayMealText(data, todayIso),
    `Einkaufstag: ${shoppingDay} (eine Planungswoche beginnt am Einkaufstag)`,
    `Aktuelle Planungswoche ("aktuell"): ${formatWeekRange(weeks.aktuell)}`,
    `Nächste Planungswoche ("naechste"): ${formatWeekRange(weeks.naechste)}`,
    `Planungswoche, wenn nichts gesagt wird: ${planning.isNext ? "naechste" : "aktuell"}`,
    "",
    profileSummary(data.profile),
    `Gesundheits-Tipps: ${TIP_LABEL[data.profile.healthTips]}${data.profile.healthTips === "aus" ? "" : ` – diese Woche schon ${tipsThisWeek} gezeigt`}`,
    "",
    extra.shopping?.length ? `Einkaufsliste (steht schon drauf): ${extra.shopping.slice(0, 60).join(", ")}` : "Einkaufsliste: gerade leer",
    pantryText(data, todayIso),
    `Kochbuch: ${recipes.length} Rezepte${recipes.length ? ` – ${recipes.slice(0, 60).map((r) => `${r.title}${r.thumbsUp > 0 ? ` (👍${r.thumbsUp})` : ""}`).join(", ")}` : ""}`,
  ].join("\n");
}
