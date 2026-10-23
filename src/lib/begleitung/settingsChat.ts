// Einstellungen per Gespräch: "Mia, Jonne isst jetzt vegetarisch", "Mach die
// Ansicht dunkel", "Melde dich seltener" … – ohne KI, über Regeln. Gibt das
// geänderte Profil und eine kurze Antwort zurück (die App bietet Rückgängig).

import { extractDietItems } from "@/lib/einstellungen/onboarding/recognize";
import { helperWith, personLabel, type HouseholdProfile, type Person } from "@/lib/einstellungen/profile";
import { helperReply, parseHelperCommand } from "@/lib/begleitung/helperTools";

type SettingsChange = { profile: HouseholdProfile; reply: string };

const MEAT = ["Fleisch", "Fisch"];
const has = (list: string[], term: string) => list.some((x) => x.toLowerCase() === term.toLowerCase());
const addAll = (list: string[], terms: string[]) => [...list, ...terms.filter((t) => !has(list, t))];
const removeAll = (list: string[], terms: string[]) => list.filter((x) => !has(terms, x));

function findPerson(text: string, persons: Person[]): Person | undefined {
  const t = text.toLowerCase();
  return persons.find((p) => p.name.trim() && new RegExp(`(?<![a-zäöüß])${p.name.trim().toLowerCase()}(?![a-zäöüß])`).test(t));
}

export function settingsChange(text: string, profile: HouseholdProfile): SettingsChange | null {
  const t = text.trim().replace(/^[A-ZÄÖÜa-zäöüß]+,\s*/, (m) => (/^(hey|hallo)\b/i.test(m) || m.replace(/,\s*$/, "").toLowerCase() === profile.helper.name.trim().toLowerCase() ? "" : m));
  const lower = t.toLowerCase();

  // Die Begleitung selbst: Name, Art/Stimme
  const helper = parseHelperCommand(t, profile.helper);
  if (helper) return { profile: { ...profile, helper: helperWith(profile.helper, helper) }, reply: helperReply(helper) };
  const person = findPerson(t, profile.persons);
  const withPerson = (change: (p: Person) => Person) => ({ ...profile, persons: profile.persons.map((p) => (p.id === person!.id ? change(p) : p)) });
  const label = person ? personLabel(person, profile.persons) : "";

  // Ernährung einer Person
  if (person && /\b(isst|esse|essen)\b.*\b(jetzt|ab jetzt|seit neuestem|neuerdings)?\s*(vegetarisch|veggie|kein fleisch mehr)\b/i.test(lower)) {
    return { profile: withPerson((p) => ({ ...p, dislikes: addAll(p.dislikes, MEAT) })), reply: `Notiert ✓ ${label} isst jetzt vegetarisch – Fleisch und Fisch lasse ich bei ${label} weg.` };
  }
  if (person && /\b(isst|essen)\b.*\bvegan\b/i.test(lower)) {
    return { profile: withPerson((p) => ({ ...p, dislikes: addAll(p.dislikes, [...MEAT, "Eier", "Milch", "Käse"]) })), reply: `Notiert ✓ ${label} isst jetzt vegan – ich lasse Fleisch, Fisch, Eier und Milchprodukte weg.` };
  }
  if (person && /\b(isst|essen)\b.*\bwieder\b.*\b(fleisch|alles)\b/i.test(lower)) {
    return { profile: withPerson((p) => ({ ...p, dislikes: removeAll(p.dislikes, [...MEAT, "Eier", "Milch", "Käse"]) })), reply: `Notiert ✓ ${label} isst wieder Fleisch.` };
  }
  if (person && /\b(mag|isst|verträgt)\b.*\bwieder\b/i.test(lower)) {
    const items = extractDietItems(t.replace(/\bwieder\b/i, "keine"), profile.persons.map((p) => p.name));
    const terms = items.map((i) => i.term);
    if (terms.length) return { profile: withPerson((p) => ({ ...p, dislikes: removeAll(p.dislikes, terms), allergies: removeAll(p.allergies, terms) })), reply: `Notiert ✓ ${label} mag wieder ${terms.join(", ")}.` };
  }
  if (person && /\b(mag|isst|verträgt)\s+(kein|keine|keinen|nicht)\b|\ballergisch\b|\ballergie\b|\bmag\b.*\bnicht\b/i.test(lower)) {
    const items = extractDietItems(t, profile.persons.map((p) => p.name)).filter((i) => !i.person || i.person.toLowerCase() === person.name.trim().toLowerCase());
    const allergies = items.filter((i) => i.kind === "Allergie").map((i) => i.term);
    const dislikes = items.filter((i) => i.kind === "mag nicht").map((i) => i.term);
    if (allergies.length || dislikes.length) {
      const parts = [allergies.length ? `Allergie gegen ${allergies.join(", ")}` : "", dislikes.length ? `mag nicht: ${dislikes.join(", ")}` : ""].filter(Boolean);
      return { profile: withPerson((p) => ({ ...p, allergies: addAll(p.allergies, allergies), dislikes: addAll(p.dislikes, dislikes) })), reply: `Notiert ✓ ${label} – ${parts.join(", ")}. Halte ich ab jetzt ein.` };
    }
  }

  // Kochstil
  if (/\b(ich koche|wir kochen|koche|kochen)\b.*\b(jetzt |lieber |eher |ab jetzt )?spontan\b/i.test(lower) && !/\?/.test(t)) {
    return { profile: { ...profile, planStyle: "spontan", planWeek: null }, reply: "Gemacht ✓ Ab jetzt spontan – den Wochenplan blende ich aus, gespeichert bleibt alles." };
  }
  if (/\b(ich plane|wir planen)\b.*\b(wieder |lieber )?gern\b/i.test(lower)) {
    return { profile: { ...profile, planStyle: "plan", planWeek: null }, reply: "Gemacht ✓ Ab jetzt mit Wochenplan." };
  }
  if (/\bmal so,? mal so\b/i.test(lower)) {
    return { profile: { ...profile, planStyle: "mix", planWeek: null }, reply: "Gemacht ✓ Mal so, mal so – freie Tage sind ganz normal." };
  }

  // Ansicht und Darstellung
  // Look der Startseite: „Mach die Startseite ruhiger / schlichter / weniger bunt“ → Schlicht, „wieder farbig“ → Farbig
  const lookContext = /\b(startseite|kacheln|app|look|aussehen|design|alles|farben?)\b/i.test(lower);
  if (/weniger bunt|nicht so bunt/i.test(lower) || (lookContext && /(?<![a-zäöüß])(ruhiger|dezenter|schlichter|sachlicher|schlicht|dezent)(?![a-zäöüß])/i.test(lower))) {
    return { profile: { ...profile, look: "schlicht" }, reply: "Gemacht ✓ Die Startseite ist jetzt schlicht – helle Kacheln, Farbe nur als Akzent." };
  }
  if (/(?<![a-zäöüß])(bunter|farbiger|wieder farbig|wieder bunt)(?![a-zäöüß])/i.test(lower) || (lookContext && /(?<![a-zäöüß])farbig(?![a-zäöüß])/i.test(lower))) {
    return { profile: { ...profile, look: "farbig" }, reply: "Gemacht ✓ Die Startseite ist wieder farbig." };
  }
  if (/\b(ansicht|darstellung|app|farben?|modus)\b/i.test(lower) || /dark ?mode|mach'?s? dunkel/i.test(lower)) {
    if (/\b(dunkel|nacht|dark)/i.test(lower)) return { profile: { ...profile, theme: "nacht", themeSet: true }, reply: "Gemacht ✓ Die App ist jetzt dunkel." };
    if (/\bautomatisch|wie das handy/i.test(lower)) return { profile: { ...profile, theme: "auto", themeSet: true }, reply: "Gemacht ✓ Hell oder dunkel – wie das Handy." };
    if (/\b(hell|warm)\b/i.test(lower)) return { profile: { ...profile, theme: "warm", themeSet: true }, reply: "Gemacht ✓ Die App ist jetzt hell." };
  }
  if (/\b(zeig|zeige) (mir )?alles\b|\balles zeigen\b/i.test(lower)) return { profile: { ...profile, display: "alles" }, reply: "Gemacht ✓ Ich zeige jetzt alles." };
  if (/\b(einfacher|einfache darstellung|weniger anzeigen)\b/i.test(lower)) return { profile: { ...profile, display: "einfach" }, reply: "Gemacht ✓ Darstellung ist jetzt einfach." };

  // Wie oft sich Lotte meldet
  if (/\b(meld(e|est)? dich|melden)\b.*\b(seltener|weniger|kaum)\b|\bganz locker\b/i.test(lower)) {
    return { profile: { ...profile, helperMode: "locker" }, reply: "Alles klar ✓ Ich melde mich nur noch, wenn’s wirklich zeitkritisch ist." };
  }
  if (/\b(meld(e|est)? dich|melden)\b.*(?<![a-zäöüß])(öfter|mehr)\b|\bdranbleiben\b|\bschubs mich\b/i.test(lower)) {
    return { profile: { ...profile, helperMode: "dranbleiben" }, reply: "Alles klar ✓ Ich bleib dran – immer freundlich." };
  }
  if (/\bkeine (küchen-?)?tipps( mehr)?\b|\btipps aus\b/i.test(lower)) return { profile: { ...profile, tips: "aus" }, reply: "Okay ✓ Keine Tipps mehr auf der Startseite." };
  if (/\b(wieder|gern) tipps\b|\btipps (wieder )?an\b/i.test(lower)) return { profile: { ...profile, tips: "ab_und_zu" }, reply: "Gern ✓ Ab und zu kommt wieder ein Tipp." };
  if (/\bkeine wochenend-?ideen\b|\bwochenend-?ideen aus\b/i.test(lower)) return { profile: { ...profile, weekendIdeas: false }, reply: "Okay ✓ Keine Wochenend-Ideen mehr." };
  if (/\bwochenend-?ideen (wieder )?an\b/i.test(lower)) return { profile: { ...profile, weekendIdeas: true }, reply: "Gern ✓ Wochenend-Ideen sind wieder an." };
  return null;
}
