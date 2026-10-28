// Kochidee (Tafel 64 C/65): Mia fragt nicht, sie schlägt vor. Ohne Frage
// drei Vorschläge – zuerst, was am meisten aus dem Vorhandenen macht. Wer
// etwas erzählt („Ich hab Hähnchen gekauft, Paprika und Sahne sind noch da,
// was Cremiges“), bekommt drei passende Gerichte; „nicht schon wieder
// Hähnchen“, „lieber ohne Sahne“, „für 3“, „was Schnelleres“ ändern nur das.
// Rein, damit es testbar ist. Intern heißt es weiter `kochtipp`.

import { AT_HOME, realStock, stockLine } from "@/lib/essen/dishIdeas";
import { isUnsure } from "@/lib/vorrat/haltbar";
import { germanNumber } from "@/lib/essen/leftovers/ruleParser";
import { sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import type { CookCard, CookCandidate } from "@/lib/essen/kochtipp/pick";

/** Pille oben links auf der Essen-Kachel (Tafel 134): immer „Was anderes?“ – mit Plan Alternativen dazu, ohne Plan eine Kochidee */
export function kochideeButton(planned: string | null, name: string): { kind: "anders" | "idee"; label: string; aria: string } {
  return planned
    ? { kind: "anders", label: "Was anderes?", aria: `Was anderes kochen? ${name} schlägt Alternativen vor` }
    : { kind: "idee", label: "Was anderes?", aria: `Kochidee – ${name} schlägt dir ein Gericht vor` };
}

type Mood = "cremig" | "leicht" | "deftig" | "scharf";

export type IdeaTalk = {
  /** Was da ist (gekauft, noch da) – merkt sich Mia als „im Haus“ */
  have: string[];
  /** „was mit Kürbis“ – soll drin sein, muss nicht da sein */
  want: string[];
  /** „ohne Sahne“, „nicht schon wieder Hähnchen“ */
  not: string[];
  moods: Mood[];
  quick: boolean;
  category: "fleisch" | "vegetarisch" | "fisch" | null;
  persons: number | null;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FILLER = /^(?:noch|auch|etwas|bisschen|ein|eine|einen|einem|einer|der|die|das|den|dem|paar|ein\s+paar|frische[nrs]?|reste?n?(?:\s+von)?)\s+/i;

function items(list: string): string[] {
  return list
    .split(/\s+und\s+|\s+sowie\s+|\s+oder\s+|,/i)
    .map((s) => {
      let t = s.trim();
      for (let prev = ""; prev !== t; ) {
        prev = t;
        t = t.replace(FILLER, "").trim();
      }
      return t;
    })
    .filter((s) => s.length > 1 && /^[a-zäöüß][a-zäöüß-]*(?:\s[a-zäöüß-]+)?$/i.test(s) && !/^(?:was|nichts|alles|hunger|lust|zeit)$/i.test(s))
    .map(cap);
}

const MOODS: { mood: Mood; re: RegExp }[] = [
  { mood: "cremig", re: /cremig|sahnig|was\s+mit\s+so[ßs]e/i },
  { mood: "leicht", re: /leicht(?:es)?(?![a-zäöüß])|frisch(?:es)?\s*$|salat/i },
  { mood: "deftig", re: /deftig|herzhaft|wärmend|was\s+warmes/i },
  { mood: "scharf", re: /scharf|würzig/i },
];

/** Einen frei gesprochenen Satz verstehen – leer, wenn nichts darin war */
export function parseIdeaTalk(text: string): IdeaTalk {
  const out: IdeaTalk = { have: [], want: [], not: [], moods: [], quick: false, category: null, persons: null };
  const t = text.trim();
  out.quick = /schnell|fix(?![a-zäöüß])|zügig|nicht\s+(?:so\s+)?lang/i.test(t);
  out.category = /vegetarisch|vegan|ohne\s+fleisch|veggie/i.test(t) ? "vegetarisch" : /(?:was|etwas|lust\s+auf)\s+(?:mit\s+)?fisch/i.test(t) ? "fisch" : null;
  out.moods = MOODS.filter((m) => m.re.test(t)).map((m) => m.mood);
  const num = t.match(/für\s+(\d{1,2}|[a-zäöü]+)(?:\s+(?:personen|leute|leuten))?(?![a-zäöüß])/i);
  const n = num ? (/^\d+$/.test(num[1]) ? Number(num[1]) : germanNumber(num[1])) : null;
  out.persons = n && n >= 1 && n <= 20 ? n : null;
  // Teilsätze an Satzzeichen; ein Teil ohne eigenes Verb („Reis und Paprika“)
  // gehört zur Liste davor („Ich hab noch Hähnchen, Reis und Paprika“)
  let last: string[] | null = null;
  for (const raw of t.split(/[,.;!?]|\s+aber\s+/i)) {
    const c = raw.trim().replace(/^(?:und|also|ach|hm+|ja)\s+/i, "");
    if (!c) continue;
    let m: RegExpMatchArray | null;
    if ((m = c.match(/^(?:bitte\s+)?(?:nicht\s+(?:schon\s+)?(?:wieder|mehr)|lieber\s+(?:ohne|kein(?:e|en)?)|ohne|kein(?:e|en)?)\s+(.+)$/i))) {
      out.not.push(...items(m[1]).filter((w) => !/^fleisch$/i.test(w)));
      last = out.not;
    } else if ((m = c.match(/^(?:was|etwas|irgendwas|lust\s+auf\s+was)\s+mit\s+(.+)$/i))) {
      out.want.push(...items(m[1]).filter((w) => !/^(?:fisch|fleisch|so[ßs]e)$/i.test(w)));
      last = out.want;
    } else if ((m = c.match(/^(?:ich|wir)\s+(?:hab(?:e|en)?|hätte[n]?)\s+(?:noch\s+|schon\s+)?(.+?)(?:\s+(?:gekauft|geholt|mitgebracht|da|übrig|im\s+kühlschrank))?$/i))) {
      out.have.push(...items(m[1]));
      last = out.have;
    } else if ((m = c.match(/^(?:hab(?:e|en)?\s+)?(?:noch\s+|eben\s+|gerade\s+|grad\s+)?(.+?)\s+(?:gekauft|geholt|mitgebracht)$/i))) {
      // Kurz gesagt wie im Clip: „Hähnchen gekauft, was Cremiges?“
      out.have.push(...items(m[1]));
      last = out.have;
    } else if ((m = c.match(/^(.+?)\s+(?:ist|sind|wäre[n]?)\s+(?:auch\s+)?(?:noch\s+)?(?:da|übrig|im\s+haus|im\s+kühlschrank)$/i))) {
      out.have.push(...items(m[1]));
      last = out.have;
    } else if (last && !/^(?:was|etwas|irgendwas|lust|lieber|bitte|für|schnell)(?![a-zäöüß])/i.test(c) && !/\s(?:ist|sind|hab|habe|haben|mag|will|wäre|soll)(?![a-zäöüß])/i.test(` ${c}`) && items(c).length) {
      last.push(...items(c));
    } else last = null;
  }
  const clean = (list: string[]) => [...new Set(list)].filter((h) => !out.not.some((w) => sameIngredient(w, h)));
  out.have = clean(out.have);
  out.want = clean(out.want);
  return out;
}

/** Hat der Satz etwas, womit die Kochidee weiterkommt? */
export const ideaUnderstood = (t: IdeaTalk) => Boolean(t.have.length || t.want.length || t.not.length || t.moods.length || t.quick || t.category || t.persons);

/** Neues gilt, Altes bleibt („lieber ohne Sahne“ ändert nur das) */
export function mergeTalk(a: IdeaTalk, b: IdeaTalk): IdeaTalk {
  const not = [...new Set([...a.not, ...b.not])];
  const keep = (list: string[]) => list.filter((h) => !not.some((w) => sameIngredient(w, h)));
  return {
    have: keep([...new Set([...a.have, ...b.have])]),
    want: keep(b.want.length ? b.want : a.want),
    not,
    moods: b.moods.length ? b.moods : a.moods,
    quick: b.quick || a.quick,
    category: b.category ?? a.category,
    persons: b.persons ?? a.persons,
  };
}

export const EMPTY_TALK: IdeaTalk = { have: [], want: [], not: [], moods: [], quick: false, category: null, persons: null };

/** Stichworte für die kleine Blase unter Mias Satz („Hähnchen · Paprika · cremig“) */
export function talkKeywords(t: IdeaTalk): string[] {
  return [...t.have, ...t.want, ...t.moods, ...(t.quick ? ["schnell"] : []), ...(t.category === "vegetarisch" ? ["ohne Fleisch"] : t.category === "fisch" ? ["Fisch"] : []), ...t.not.map((n) => `ohne ${n}`), ...(t.persons ? [`für ${t.persons}`] : [])];
}

const MOOD_TEST: Record<Mood, RegExp> = {
  cremig: /sahne|creme|crème|rahm|frischkäse|kokosmilch|mascarpone|risotto|carbonara|gratin|käsesoße|cremig|béchamel|milch|schmand/i,
  leicht: /salat|bowl|gemüse|suppe|wrap|fisch|zucchini/i,
  deftig: /gulasch|eintopf|kartoffel|würst|speck|braten|hack|chili|knödel|auflauf/i,
  scharf: /chili|curry|harissa|jalape|sriracha|scharf|ingwer|pfeffer/i,
};

export type IdeaInput = {
  candidates: CookCandidate[];
  stock: PantryItem[];
  talk: IdeaTalk;
  /** Bald verbrauchen (Reste, Kühlschrank seit Tagen) */
  soon: string[];
  /** Nie: das geplante Gericht, die letzten 7 Tage, schon Gezeigtes */
  exclude: string[];
  /** Allergien und „mag nicht“ (strikt) */
  avoid: string[];
  /** Heute (für „vermutlich im Haus“) */
  today?: string;
};

/** Hauptzutaten („Salz, Paprikapulver“ zählt als zwei Dinge aus dem Haus) */
const main = (needs: string[]) => needs.flatMap((n) => n.split(/,\s*/)).map((n) => n.trim()).filter((n) => n && !AT_HOME.test(n));

/**
 * Gerichte nach „nutzt am meisten vom Vorhandenen“ (Vorrat, eben Gesagtes,
 * bald zu Verbrauchendes) – Allergien, „mag nicht“ und „ohne“ strikt, nie
 * etwas aus `exclude`. Mit Wünschen nur, was dazu passt.
 */
export function rankIdeas({ candidates, stock, talk, soon, exclude, avoid, today }: IdeaInput): CookCard[] {
  const unsureStock = today ? realStock(stock).filter((p) => !/^[bs]:/.test(p.id) && isUnsure(p, today)) : [];
  const there = [...realStock(stock).map((p) => p.name), ...talk.have];
  const has = (n: string) => there.some((h) => sameIngredient(h, n));
  const banned = [...talk.not, ...avoid];
  const seen = new Set<string>();
  return candidates
    .filter((c) => !exclude.some((e) => e.toLowerCase() === c.title.toLowerCase()))
    .filter((c) => !talk.category || c.category === talk.category)
    .filter((c) => !talk.quick || c.minutes <= 25)
    .filter((c) => !c.needs.some((n) => banned.some((b) => sameIngredient(b, n))) && !banned.some((b) => new RegExp(`(?<![a-zäöüß])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(c.title)))
    .filter((c) => talk.want.every((w) => c.needs.some((n) => sameIngredient(w, n)) || c.title.toLowerCase().includes(w.toLowerCase())))
    .map((c) => {
      const needs = main(c.needs);
      const uses = needs.filter(has);
      const missing = needs.filter((n) => !has(n));
      const fromSaid = needs.filter((n) => talk.have.some((h) => sameIngredient(h, n))).length;
      const fromSoon = needs.filter((n) => soon.some((s) => sameIngredient(s, n))).length;
      const mood = talk.moods.filter((m) => MOOD_TEST[m].test(`${c.title} ${c.needs.join(" ")}`)).length;
      return { c, needs, uses, missing, fromSaid, mood, score: fromSaid * 20 + mood * 15 + fromSoon * 6 + uses.length * 6 - missing.length * 4 - c.minutes / 15 };
    })
    // Mit Erzähltem nur, was davon etwas nutzt oder zum Wunsch passt („was Cremiges“)
    .filter((x) => x.needs.length > 0 && (!(talk.have.length || talk.moods.length) || x.fromSaid > 0 || x.mood > 0))
    .sort((a, b) => b.score - a.score || a.c.minutes - b.c.minutes)
    .filter((x) => !seen.has(x.c.title.toLowerCase()) && Boolean(seen.add(x.c.title.toLowerCase())))
    .map((x) => ({
      title: x.c.title,
      minutes: x.c.minutes,
      category: x.c.category,
      ...(x.c.recipeId ? { recipeId: x.c.recipeId } : {}),
      ingredients: x.needs,
      uses: [...new Set(x.uses.map((n) => there.find((h) => sameIngredient(h, n)) ?? n))],
      needs: x.missing,
      unsure: unsureStock.filter((p) => x.uses.some((n) => sameIngredient(n, p.name))).map((p) => p.name),
      badge: x.missing.length === 0 ? "alles" : x.missing.length === 1 ? "fast" : "einkauf",
    }));
}

/** Drei Vorschläge (das beste zuerst) */
export const pickIdeas = (input: IdeaInput, count = 3) => rankIdeas(input).slice(0, count);

/**
 * Ohne Frage: zuerst, was etwas Vorhandenes nutzt, dann die bunte Mischung
 * (wie „Mehr Ideen“), zuletzt der Rest – nie doppelt.
 */
export function startIdeas(ranked: CookCard[], mix: CookCard[], count = 3): CookCard[] {
  const out: CookCard[] = [];
  const add = (c: CookCard) => out.length < count && !out.some((o) => o.title.toLowerCase() === c.title.toLowerCase()) && out.push(c);
  ranked.filter((c) => c.uses.length > 0).forEach(add);
  const allowed = new Set(ranked.map((c) => c.title.toLowerCase()));
  mix.filter((c) => allowed.has(c.title.toLowerCase())).forEach((c) => add(ranked.find((r) => r.title.toLowerCase() === c.title.toLowerCase()) ?? c));
  ranked.forEach(add);
  return out;
}

/** Zutaten-Zeile: grün „alles im Haus“, grau „vermutlich im Haus: …“ bzw. orange „auf die Liste: …“ (nie „fehlt“) */
export const ingredientLine = (card: Pick<CookCard, "needs" | "unsure">) => stockLine(card, 3).text;

/** Mias erster Satz – geplant: „Lust auf was anderes als …?“, frei: „Wie wär’s damit? …“ */
export function ideaHello(planned: string | null, first: CookCard | undefined): string {
  if (planned) return `Lust auf was anderes als ${planned}?`;
  if (first?.uses.length) return `Wie wär’s damit? ${list(first.uses.slice(0, 2))} hast du noch.`;
  return "Wie wär’s damit?";
}

/** Nach dem Erzählen: „Dann mach doch …!“ */
export const ideaResult = (first: CookCard | undefined) => (first ? `Dann mach doch ${first.title}!` : "Dafür hab ich grad nichts Passendes. Was anderes?");

/** „Hähnchen merk ich mir als „im Haus“ ✓“ */
export const rememberedText = (have: string[]) => (have.length ? `${list(have.slice(0, 3))} merk ich mir als „im Haus“ ✓` : "");

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} und ${xs[xs.length - 1]}`);

/**
 * „Nehmen“ – überall gleich: frei → Abendessen heute (nach dem Abendessen:
 * morgen); geplant → ersetzt das Gericht von heute, das alte wandert zurück
 * zu den Ideen (nicht gelöscht); Fehlendes kommt auf die Liste.
 */
export function takeOutcome(card: CookCard, planned: string | null, mealOver: boolean, today: string, tomorrow: string): { date: string; backToIdeas: string | null; toList: string[] } {
  return {
    date: mealOver ? tomorrow : today,
    backToIdeas: planned && !mealOver && planned.toLowerCase() !== card.title.toLowerCase() ? planned : null,
    toList: card.needs,
  };
}
