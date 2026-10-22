// „Mehr Ideen“ unter einem Rezept: jeden Tag eine bunte Mischung aus 8
// Gerichten, passend zur Familie. Feste Grenzen zuerst (Allergien, „mag
// nicht“, Essweise, nichts aus den letzten 7 Tagen, nicht das aktuelle
// Rezept), dann die Mischung: 3 schnell & einfach, 2 Lieblinge, 2 besonders,
// 1 wenn Zeit ist (Fr–So 2/2/2/2, die aufwendigen vorn). Gleicher Tag =
// gleiche 8, höchstens 2 von gestern. Rein, damit es testbar ist.

import type { Recipe, RecipeCategory } from "@/lib/essen/cookbook";
import { addDays } from "@/lib/core/now";
import { AT_HOME } from "@/lib/essen/dishIdeas";
import { recipeKind } from "@/lib/essen/kochen";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";

type MixGroup = "einfach" | "lieblinge" | "besonders" | "zeit";
export type MixCard = { recipe: Recipe; group: MixGroup; label: "Besonders" | "Wenn Zeit ist" | null; ready: boolean };

/** Still gelerntes Interesse (Antippen, Machen wir, Kochen) */
export type Interest = { taps: Record<string, number>; seen: Record<string, number>; kinds: Record<string, number> };

export type MixInput = {
  recipes: Recipe[];
  current: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** Kennung des Haushalts (Startwert der Tages-Mischung) */
  household: string;
  /** Allergien und „mag nicht“ – strikt */
  avoid: string[];
  /** Titel der letzten 7 Tage */
  recent: string[];
  stock: PantryItem[];
  interest: Interest;
};

const MAX = 8;
const COUNTS: Record<"woche" | "wochenende", Record<MixGroup, number>> = {
  woche: { einfach: 3, lieblinge: 2, besonders: 2, zeit: 1 },
  wochenende: { einfach: 2, lieblinge: 2, besonders: 2, zeit: 2 },
};
/** Wer Plätze übrig hat, gibt sie in dieser Reihenfolge weiter */
const REFILL: MixGroup[] = ["einfach", "lieblinge", "besonders", "zeit"];

/** Kleiner Zufall mit Startwert (gleicher Tag + Haushalt = gleiche Zahlen) */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const weekendOf = (date: string) => {
  const wd = new Date(`${date}T12:00:00Z`).getUTCDay();
  return wd === 5 || wd === 6 || wd === 0;
};

/** „mag nicht: Fleisch/Fisch“ heißt: diese Art gar nicht */
function bannedCategories(avoid: string[]): RecipeCategory[] {
  const out: RecipeCategory[] = [];
  if (avoid.some((a) => /^(fleisch|vegetarisch|vegetarier)$/i.test(a.trim()))) out.push("fleisch");
  if (avoid.some((a) => /^(fisch|vegetarisch|vegetarier)$/i.test(a.trim()))) out.push("fisch");
  return out;
}

const isFavorite = (r: Recipe, i: Interest) => r.favorite || r.thumbsUp > 0 || r.cookedCount > 0 || (i.taps[r.id] ?? 0) >= 2;

/** Gelerntes Interesse: Antippen zählt, über Wochen nie angetippt = seltener */
function interestOf(r: Recipe, i: Interest): number {
  const kind = recipeKind(r);
  const taps = i.taps[r.id] ?? 0;
  const kinds = (i.kinds[`cat:${r.category}`] ?? 0) + (i.kinds[`aufwand:${kind.aufwand}`] ?? 0) + (i.kinds[`art:${kind.art}`] ?? 0);
  const ignored = Math.max(0, (i.seen[r.id] ?? 0) - taps * 4);
  return Math.max(-0.6, Math.min(1.2, taps * 0.3 + kinds * 0.04 - ignored * 0.05));
}

function groupOf(r: Recipe, i: Interest): MixGroup {
  if (isFavorite(r, i)) return "lieblinge";
  const { aufwand, art } = recipeKind(r);
  if (aufwand === "aufwendig") return "zeit";
  if (art === "besonders") return "besonders";
  return "einfach";
}

type Scored = { r: Recipe; group: MixGroup; ready: boolean; interest: number };

/** Feste Grenzen (nie aufweichen) und was sich über die Tage nicht ändert */
function candidates({ recipes, current, avoid, recent, stock, interest }: MixInput): Scored[] {
  const banned = bannedCategories(avoid);
  const real = stock.filter((p) => !AT_HOME.test(p.name.trim()));
  const ready = (r: Recipe) => r.ingredients.filter((g) => !AT_HOME.test(g.name.trim())).every((g) => real.some((p) => sameIngredient(p.name, g.name)));
  return recipes
    .filter(
      (r) =>
        r.kind !== "backen" &&
        r.id !== current &&
        !recent.some((t) => t.trim().toLowerCase() === r.title.trim().toLowerCase()) &&
        !banned.includes(r.category) &&
        !r.ingredients.some((g) => avoid.some((a) => sameIngredient(a, g.name))),
    )
    .map((r) => ({ r, group: groupOf(r, interest), ready: ready(r), interest: interestOf(r, interest) }));
}

const labelOf = (g: MixGroup) => (g === "besonders" ? "Besonders" : g === "zeit" ? "Wenn Zeit ist" : null);

/** Die 8 eines Tages – `yesterday`: Kennungen von gestern (höchstens 2 kommen wieder) */
function mixDay(base: Scored[], household: string, date: string, yesterday: Set<string>): MixCard[] {
  const rand = seeded(`${household}|${date}`);
  // Je Gruppe zuerst „alles im Haus“, dann Zufall + Interesse; „einfach“: bis 25 Minuten vor den normalen Klassikern
  const scored = base.map((s) => ({ ...s, score: rand() + s.interest })).sort((a, b) => Number(b.ready) - Number(a.ready) || b.score - a.score);
  const pools: Record<MixGroup, typeof scored> = { einfach: [], lieblinge: [], besonders: [], zeit: [] };
  for (const s of scored) pools[s.group].push(s);
  pools.einfach.sort((a, b) => Number(b.ready) - Number(a.ready) || Number((a.r.prepMinutes ?? 30) > 25) - Number((b.r.prepMinutes ?? 30) > 25) || b.score - a.score);

  const weekend = weekendOf(date);
  const want = { ...COUNTS[weekend ? "wochenende" : "woche"] };
  // Zu kleine Gruppe → Plätze weiter (einfach → Lieblinge → besonders), ohne Lieblinge an „einfach“
  let spare = 0;
  for (const g of REFILL) {
    if (pools[g].length < want[g]) {
      spare += want[g] - pools[g].length;
      want[g] = pools[g].length;
    }
  }
  for (const g of REFILL) {
    const take = Math.min(pools[g].length - want[g], spare);
    want[g] += take;
    spare -= take;
  }

  let repeats = 0;
  const pick = (g: MixGroup): MixCard[] => {
    const out: MixCard[] = [];
    const add = (s: (typeof scored)[number]) => out.push({ recipe: s.r, group: g, ready: s.ready, label: labelOf(g) });
    for (const s of pools[g]) {
      if (out.length >= want[g]) break;
      if (yesterday.has(s.r.id)) {
        if (repeats >= 2) continue;
        repeats++;
      }
      add(s);
    }
    return out;
  };
  // Lieblinge zuerst: sie dürfen am ehesten wiederkommen
  const lieblinge = pick("lieblinge");
  const besonders = pick("besonders");
  const zeit = pick("zeit");
  const einfach = pick("einfach");

  // Reihenfolge: einfach und Lieblinge gemischt, eine „Besonders“ an Platz 3,
  // die nächste an Platz 6; aufwendige unter der Woche hinten, am Wochenende vorn
  const middle: MixCard[] = [];
  for (let k = 0; k < Math.max(einfach.length, lieblinge.length); k++) {
    if (einfach[k]) middle.push(einfach[k]);
    if (lieblinge[k]) middle.push(lieblinge[k]);
  }
  const list = weekend ? [...zeit, ...middle] : [...middle];
  if (besonders[0]) list.splice(Math.min(2, list.length), 0, besonders[0]);
  if (besonders[1]) list.splice(Math.min(5, list.length), 0, besonders[1]);
  if (!weekend) list.push(...zeit);
  // Fehlt wegen „gestern“ etwas, füllen andere Gerichte auf (ohne weitere Wiederholungen)
  const extra = scored.filter((s) => !list.some((c) => c.recipe.id === s.r.id) && !yesterday.has(s.r.id));
  for (const s of extra) {
    if (list.length >= Math.min(MAX, want.einfach + want.lieblinge + want.besonders + want.zeit)) break;
    list.push({ recipe: s.r, group: s.group, ready: s.ready, label: labelOf(s.group) });
  }
  return list.slice(0, MAX);
}

/**
 * Die Mischung von heute. Damit „höchstens 2 von gestern“ genau gilt, werden
 * die Tage ab Jahresanfang nacheinander gemischt (am 1. Januar beginnt es neu).
 */
export function moreIdeas(input: MixInput): MixCard[] {
  const base = candidates(input);
  let day = `${input.date.slice(0, 4)}-01-01`;
  let yesterday = new Set<string>();
  for (;;) {
    const cards = mixDay(base, input.household, day, yesterday);
    if (day >= input.date) return cards;
    yesterday = new Set(cards.map((c) => c.recipe.id));
    day = addDays(day, 1);
  }
}
