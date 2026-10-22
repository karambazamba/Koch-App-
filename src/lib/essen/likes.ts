// "Das mögt ihr": Lieblingszutaten des Haushalts. Gelernt aus 👍, gekochten
// Gerichten, gewählten Vorschlägen und Sätzen im Chat ("wir lieben Käse");
// selbst ergänzbar und entfernbar. Die KI baut sie bevorzugt ein.

import { BASES } from "@/lib/essen/bases";
import type { Ingredient, Recipe } from "@/lib/essen/cookbook";
import { findFood, recognizeFood } from "@/lib/essen/leftovers/foods";
import { type HouseholdProfile, type LikedIngredient } from "@/lib/einstellungen/profile";
import { compareText } from "@/lib/core/sort";
import { loadProfile, saveProfile } from "@/lib/einstellungen/profileStore";

/** Wie stark eine Quelle zählt */
export const LIKE_WEIGHTS = { chat: 3, up: 2, cooked: 1, chosen: 1, manual: 5 } as const;

/** Grundzutaten und Sammelbegriffe – keine Vorlieben */
const NOT_LIKES = /^(salz|pfeffer|öl|olivenöl|rapsöl|wasser|zucker|mehl|essig|butter|brühe|gemüsebrühe|gewürze?|obst|gemüse|fleisch|ei|eier|milch)$/i;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Gleiche Zutat, anderer Name */
const ALIASES: Record<string, string> = { knobi: "Knoblauch", möhre: "Karotte", mohrrübe: "Karotte", porree: "Lauch", hack: "Hackfleisch", gehacktes: "Hackfleisch" };

/**
 * Zutat → Anzeigename einer Vorliebe ("rote Zwiebeln" → "Zwiebel"), nur für
 * bekannte Lebensmittel; Grundzutaten und Basen (Reis, Nudeln …) → null.
 */
function likeName(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const last = (text.split(/\s+/).pop() ?? text).replace(/zehen?$/i, "");
  if (/pulver$|gewürz/i.test(last)) return null;
  const match = findFood(last) ?? findFood(text);
  let name: string | null = match ? match.food.singular : null;
  if (!name) {
    const rec = recognizeFood(last);
    if (rec.known) name = rec.match ? rec.match.food.singular : cap(last);
  }
  if (name && ALIASES[name.toLowerCase()]) name = ALIASES[name.toLowerCase()];
  if (!name || NOT_LIKES.test(name)) return null;
  const lower = name.toLowerCase();
  if (BASES.some((b) => b.words.test(lower))) return null;
  return cap(name);
}

/** Hauptzutaten eines Rezepts als Vorlieben-Namen (ohne Doppelte) */
export function likesFromIngredients(ingredients: Pick<Ingredient, "name">[]): string[] {
  const names = ingredients.map((i) => likeName(i.name)).filter((n): n is string => Boolean(n));
  return [...new Set(names)].slice(0, 8);
}

/** Verträgt jemand die Zutat nicht oder mag sie nicht? Dann nicht lernen */
function excluded(profile: HouseholdProfile, name: string): boolean {
  const n = name.toLowerCase();
  return profile.persons.some((p) => [...p.allergies, ...p.dislikes].some((x) => n.includes(x.toLowerCase()) || x.toLowerCase().includes(n)));
}

/** Gewichte erhöhen (rein) */
export function withLikes(profile: HouseholdProfile, names: string[], weight: number, manual = false): HouseholdProfile {
  const blocked = new Set(profile.likesBlocked.map((n) => n.toLowerCase()));
  const likes = profile.likes.map((l) => ({ ...l }));
  let likesBlocked = profile.likesBlocked;
  for (const raw of names) {
    const name = likeName(raw) ?? (manual ? cap(raw.trim()).slice(0, 40) : null);
    if (!name || excluded(profile, name)) continue;
    if (blocked.has(name.toLowerCase())) {
      if (!manual) continue;
      likesBlocked = likesBlocked.filter((n) => n.toLowerCase() !== name.toLowerCase());
    }
    const existing = likes.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.weight += weight;
      if (manual) existing.manual = true;
    } else likes.push({ name, weight, ...(manual ? { manual: true } : {}) });
  }
  return { ...profile, likes, likesBlocked };
}

/** Eintrag entfernen und künftig nicht wieder lernen */
export function withoutLike(profile: HouseholdProfile, name: string): HouseholdProfile {
  const lower = name.toLowerCase();
  return {
    ...profile,
    likes: profile.likes.filter((l) => l.name.toLowerCase() !== lower),
    likesBlocked: [...profile.likesBlocked.filter((n) => n.toLowerCase() !== lower), name],
  };
}

/** Vorlieben lernen und speichern (liest den aktuellen Stand) */
export function learnLikes(names: string[], weight: number) {
  const profile = loadProfile();
  if (!profile || names.length === 0) return;
  saveProfile(withLikes(profile, names, weight));
}

/** Aus einem Rezept lernen (👍, gekocht, gewählt) */
export function learnFromRecipe(recipe: Pick<Recipe, "ingredients"> | undefined, weight: number) {
  if (recipe) learnLikes(likesFromIngredients(recipe.ingredients), weight);
}

/** Sortiert nach Gewicht (stärkste zuerst) */
export function sortedLikes(likes: LikedIngredient[]): LikedIngredient[] {
  return [...likes].sort((a, b) => b.weight - a.weight || compareText(a.name, b.name));
}

/** Stufe 1–3 für die Anzeige ("gewichtete Liste") */
export function likeLevel(like: LikedIngredient, likes: LikedIngredient[]): 1 | 2 | 3 {
  const max = Math.max(1, ...likes.map((l) => l.weight));
  const share = like.weight / max;
  return share > 0.66 ? 3 : share > 0.33 ? 2 : 1;
}

// --- Sätze im Chat -------------------------------------------------------------

const SUBJECT = "(?:wir|ich|alle|die kinder|die kids|[a-zäöüß]+)";
const LIKE_PATTERNS = [
  new RegExp(`${SUBJECT}\\s+(?:lieben|liebt|liebe|mögen|mag|stehen auf|steht auf|stehe auf|essen gern|essen gerne|isst gern|isst gerne|esse gern|esse gerne)\\s+(?:total |sehr |echt |richtig |besonders )?(.+)`, "i"),
  /(.+?)\s+(?:geht|gehen)\s+(?:bei uns\s+)?immer/i,
  /(.+?)\s+(?:essen|mögen|lieben)\s+wir\s+(?:sehr |total |besonders )?(?:gern|gerne|alle|sehr)/i,
];

/** "Wir lieben Käse und Knoblauch" → ["Käse", "Knoblauch"]; Verneinungen zählen nicht */
export function extractLikeStatements(text: string): string[] {
  const clean = text.trim();
  if (/(?<![a-zäöüß])(nicht|kein|keine|keinen|nie)(?![a-zäöüß])/i.test(clean)) return [];
  for (const re of LIKE_PATTERNS) {
    const m = clean.match(re);
    if (!m) continue;
    const parts = m[1]
      .replace(/[.!?]+$/, "")
      .split(/,|\bund\b|\boder\b|&|\bsowie\b/i)
      .map((p) => p.replace(/^(den|die|das|einen|eine|ein|alles mit|viel|gerne?|so)\s+/i, "").trim())
      .filter(Boolean);
    const names = parts.map((p) => likeName(p)).filter((n): n is string => Boolean(n));
    if (names.length) return [...new Set(names)];
  }
  return [];
}
