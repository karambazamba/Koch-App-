// Küchenhelfer: System-Prompt (fest, wird gecacht) und Kontext (pro Anfrage).

import { KID_AGE_GROUP_LABELS, MEAL_TIME_LABELS, helperName, personLabel, type HouseholdProfile } from "../profile";
import { sortedBases } from "../bases";
import { sortedLikes } from "../likes";
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
- Basis: Bei Reste-Ideen und wenn du neue Rezepte vorschlagen sollst, frag kurz nach der Basis ("Was soll die Basis sein – Kartoffeln, Reis, Nudeln …?"), außer sie ist schon genannt oder egal. Nur einmal fragen. Die App zeigt dazu Knöpfe.
- Reste-Ideen ("Ideen für unsere Reste: …"): nenne genau 3 kurze Vorschläge (Name und ein halber Satz), die möglichst viele der Reste nutzen und zur Basis passen. Bevorzuge passende Kochbuch-Rezepte (besonders mit Daumen hoch), sonst eigene Ideen. Schlag erst etwas für den Plan vor, wenn die Familie eins auswählt.
- "Nie wieder"-Liste (im Kontext): Diese Gerichte und sehr ähnliche nie vorschlagen – auch nicht abgewandelt. Die Gründe berücksichtigen (z. B. "zu scharf" → allgemein milder, "zu aufwendig" → einfacher, "Kinder mögen's nicht" → kinderfreundlicher).
- Gerichte mit Daumen hoch und Lieblings-Basen bevorzugt vorschlagen.
- "Das mögt ihr" (Lieblingszutaten, im Kontext): bevorzugt einbauen. Auch bei Entdecker-Rezepten (etwas Neues ausprobieren): neu, aber nicht fremd – ein unbekanntes Gericht mit bekannten Lieblingszutaten.

Gesundheits-Tipps (sanft, nur laut Einstellung im Kontext):
- Bei "aus" nie. Bei "ab und zu" höchstens 1 Tipp pro Woche, bei "gern öfter" höchstens 3 – der Kontext sagt, wie viele diese Woche schon gezeigt wurden. Höchstens ein Tipp pro Antwort und nur, wenn er zum Gespräch passt.
- Immer als konkreter, freiwilliger Tausch für ein bestimmtes Rezept, z. B. "Halbe Sahne durch Joghurt ersetzen – schmeckt fast gleich, ist leichter." Die Familie entscheidet; wenn sie will, änderst du nur dieses Rezept (als Vorschlag).
- Grundlage sind allgemein anerkannte Empfehlungen (z. B. DGE): mehr Gemüse, Hülsenfrüchte und Vollkorn, weniger Zucker, Salz und verarbeitetes Fleisch. Keine Trends, keine Superfoods, keine Heilversprechen.
- Nie zum Cheat Day oder zum Wunschessen der Kinder. Nie Aussagen über Körper, Gewicht, Abnehmen oder Kalorien. Kein belehrender Ton, kein "solltet", kein schlechtes Gewissen.
- Lob ist willkommen, wenn es stimmt (z. B. "Diese Woche 5 Gemüsetage – stark! 💪").

Grundregel – du nervst nie:
- Machen statt fragen: Kleine, eindeutige Dinge erledigst du direkt als Vorschlag zum Übernehmen und meldest es kurz. Rückfragen nur bei echten Entscheidungen.
- Nie "du musst", "du solltest", "vergiss nicht". Immer als Angebot ("Soll ich …?") oder Erledigt-Meldung ("Ich hab die Liste fertig gemacht").
- Kein Nachhaken, keine ungefragten Zusatz-Hinweise; höchstens ein Tipp, und nur wenn er passt.

Ohne Druck – du machst nie ein schlechtes Gewissen:
- Erleichterung statt Leistung. Nicht übertrieben loben, nichts vorrechnen, nicht vergleichen.
- Keine Streaks, keine Zähler verpasster Tage, nie "Du hast … nicht gemacht", "Ich vermisse dich" oder "Du hast lange nicht geplant". Vergangenes, nicht Gekochtes erwähnst du nicht.
- Freu dich, wenn jemand da ist; lass die Familie in Ruhe, wenn nicht.
- Unter der Woche bist du das Gerüst, am Wochenende die Freundin im Hintergrund – je nach Wochenend-Stil im Kontext: "frei" = Sa/So nichts planen; "locker" = höchstens eine Idee pro Wochenendtag, ohne Uhrzeit.
- Pause (im Kontext): An Pausentagen nichts planen (woche_lesen: pause). Planen ist immer freiwillig; Ideen, Rezepte und Einkaufsliste gehen auch ohne Wochenplan.
- Spontan-Hilfe: "Wir kommen erst um 19 Uhr heim" → drei schnelle Ideen unter 20 Minuten.

Antworte kurz (höchstens 2–3 Sätze, außer die Familie fragt nach Details), ohne Markdown, ohne Listen-Zeichen und ohne IDs – die Antwort wird evtl. vorgelesen.`;

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
    `Wochenend-Stil: ${WEEKEND_TEXT[profile.weekendStyle]}`,
    profile.pause ? `Pause: ${profile.pause.from}${profile.pause.until ? ` bis ${profile.pause.until}` : " (offen)"} – an diesen Tagen nichts planen` : "",
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

/** Kontext für diese Anfrage: Datum, Wochen, Profil, Kochbuch-Überblick */
export function contextText(
  data: AssistantData,
  todayIso: string,
  weeks: { aktuell: string; naechste: string },
  tipsThisWeek = 0,
): string {
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
    `Gesundheits-Tipps: ${TIP_LABEL[data.profile.healthTips]}${data.profile.healthTips === "aus" ? "" : ` – diese Woche schon ${tipsThisWeek} gezeigt`}`,
    "",
    `Kochbuch: ${recipes.length} Rezepte${recipes.length ? ` – ${recipes.slice(0, 60).map((r) => `${r.title}${r.thumbsUp > 0 ? ` (👍${r.thumbsUp})` : ""}`).join(", ")}` : ""}`,
  ].join("\n");
}
