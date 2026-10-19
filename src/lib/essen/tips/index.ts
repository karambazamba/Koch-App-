// Tipps auf Lottes Platz: Auswahl, Häufigkeit und Lernen.
//
// Ein Tag hat höchstens 3 Tipps (nach rechts wischen = nächster). Vorrang
// haben Tipps zum heutigen Gericht (bei bekannten Gerichten auch ein Twist),
// dann ein sanfter Gesundheits-Tipp (eigene Einstellung), dann allgemeine
// Tipps reihum aus den Kategorien. Wird eine Kategorie 3× weggewischt, kommt
// sie deutlich seltener. Gezeigte Tipps kommen 90 Tage nicht wieder.

import { useExternalStore } from "../../core/useExternalStore";
import { createLocalStore } from "../../core/localStore";
import type { HouseholdType, TipLevel } from "../../einstellungen/profile";
import { addDays } from "../weekPlan";
import { GERICHT_TIPS } from "./data/gericht";
import { PROFI_TIPS } from "./data/profi";
import { RESTE_TIPS } from "./data/reste";
import { SPAR_TIPS } from "./data/sparen";
import { VORRAT_TIPS } from "./data/vorrat";
import { WOCHENENDE_TIPS } from "./data/wochenende";
import type { Tip, TipCategory } from "./types";

export type { Tip, TipCategory } from "./types";

export const ALL_TIPS: Tip[] = [...GERICHT_TIPS, ...PROFI_TIPS, ...SPAR_TIPS, ...RESTE_TIPS, ...VORRAT_TIPS, ...WOCHENENDE_TIPS];

export const CATEGORY_TITLES: Record<TipCategory, string> = {
  profi: "Profi-Trick aus der Gastro",
  gericht: "Tipp zum heutigen Gericht",
  sparen: "Spartipp",
  reste: "Reste-Idee",
  vorrat: "Vorrat & Vorkochen",
  wochenende: "Idee fürs Wochenende",
};

/** Höchstens so viele Tipps an einem Tag (nach rechts wischen) */
export const TIPS_PER_DAY = 3;
/** "Ab und zu": an höchstens so vielen Tagen pro Woche */
export const TIP_DAYS_PER_WEEK = 4;
/** Ab so oft weggewischt kommt eine Kategorie deutlich seltener */
export const CATEGORY_DISMISS_LIMIT = 3;
const REPEAT_AFTER_DAYS = 90;

// --- Speicher -------------------------------------------------------------------

export type TipCardState = {
  version: 1;
  /** Tipp-ID → Tag, an dem er zuerst gezeigt wurde */
  seen: Record<string, string>;
  /** Tage mit Tipp (für "ab und zu") */
  days: string[];
  /** Heute: welcher Tipp gerade dran ist, ob für heute weggewischt */
  today: { date: string; index: number; gone: boolean } | null;
  /** Wie oft je Kategorie weggewischt */
  dismissed: Partial<Record<TipCategory | "twist" | "gesund", number>>;
  /** Tag, an dem der Gesten-Hinweis gezeigt wurde (danach nie wieder) */
  hintShownOn: string | null;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function migrate(raw: unknown): TipCardState | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<TipCardState>;
  if (d.version !== 1) return null;
  const seen: Record<string, string> = {};
  for (const [id, date] of Object.entries(d.seen ?? {})) if (typeof date === "string" && ISO.test(date)) seen[id] = date;
  const today = d.today && typeof d.today === "object" && typeof d.today.date === "string"
    ? { date: d.today.date, index: Number(d.today.index) || 0, gone: d.today.gone === true }
    : null;
  return {
    version: 1,
    seen,
    days: Array.isArray(d.days) ? d.days.filter((x) => typeof x === "string" && ISO.test(x)).slice(-30) : [],
    today,
    dismissed: d.dismissed && typeof d.dismissed === "object" ? d.dismissed : {},
    hintShownOn: typeof d.hintShownOn === "string" ? d.hintShownOn : null,
  };
}

const store = createLocalStore("wasgibts.tippkarten", migrate);
export const EMPTY_TIP_STATE: TipCardState = { version: 1, seen: {}, days: [], today: null, dismissed: {}, hintShownOn: null };

export function useTipCardState(): TipCardState | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY_TIP_STATE);
}

function update(change: (s: TipCardState) => TipCardState) {
  store.save(change(store.load() ?? EMPTY_TIP_STATE));
}

const todayOf = (s: TipCardState, date: string) => (s.today?.date === date ? s.today : { date, index: 0, gone: false });

/** Tipp wurde angezeigt: merken (Wiederholung, Tag zählt, Hinweis einmal) */
export function markTipCardShown(date: string, id: string) {
  update((s) => {
    const from = addDays(date, -REPEAT_AFTER_DAYS);
    const seen = Object.fromEntries(Object.entries(s.seen).filter(([, d]) => d >= from));
    if (!seen[id]) seen[id] = date;
    return {
      ...s,
      seen,
      days: s.days.includes(date) ? s.days : [...s.days, date].slice(-30),
      today: todayOf(s, date),
      hintShownOn: s.hintShownOn ?? date,
    };
  });
}

/** Nach rechts gewischt: nächster Tipp (nach dem letzten ist für heute Schluss) */
export function nextTipCard(date: string, count: number) {
  update((s) => {
    const t = todayOf(s, date);
    return { ...s, today: t.index + 1 >= count ? { ...t, gone: true } : { ...t, index: t.index + 1 } };
  });
}

/** Twist übernommen o. Ä.: für heute keine weiteren Tipps (ohne Lernen) */
export function finishTipsToday(date: string) {
  update((s) => ({ ...s, today: { ...todayOf(s, date), gone: true } }));
}

/** Nach links gewischt: für heute weg, Kategorie zählt fürs Lernen */
export function dismissTipCard(date: string, category: TipCategory | "twist" | "gesund") {
  update((s) => ({
    ...s,
    today: { ...todayOf(s, date), gone: true },
    dismissed: { ...s.dismissed, [category]: (s.dismissed[category] ?? 0) + 1 },
  }));
}

// --- Auswahl --------------------------------------------------------------------

/** Eine Karte auf Lottes Platz */
export type TipCardData =
  | { kind: "tip"; id: string; category: TipCategory; title: string; text: string; detail: string; steps?: string[] }
  | { kind: "twist"; id: string; category: "twist"; title: string; text: string; detail: string }
  | { kind: "gesund"; id: string; category: "gesund"; title: string; text: string; detail: string };

export type TipContext = {
  date: string;
  /** Erster Tag der Planungswoche (für "ab und zu") */
  weekStart: string;
  level: TipLevel;
  state: TipCardState;
  /** Heutiges Gericht (Titel), wenn es eins gibt */
  dish: string | null;
  /** Twist für heute (bekanntes Gericht, Twist-Regeln erfüllt) */
  twist: { key: string; idea: string; minutes: number; item?: string } | null;
  /** Sanfter Gesundheits-Tipp laut eigener Einstellung */
  health: { key: string; title: string; text: string } | null;
  /** Haushaltstyp: kleine Haushalte bekommen eher Vorrat/Einfrieren, Wochenend-Ideen je Typ */
  household?: HouseholdType;
  /** Kinder im Haushalt? Ohne Kinder keine Kinder-Tipps */
  kids?: boolean;
  /** Wochenend-Ideen erwünscht? (Profil v15, Standard an) */
  weekendIdeas?: boolean;
  /** Planung sichtbar? Bei "spontan" keine Tipps übers Planen */
  planning?: boolean;
};

/** Darf heute überhaupt ein Tipp kommen? (Einstellung, "ab und zu" = 4 Tage pro Woche) */
export function tipDayAllowed(ctx: Pick<TipContext, "date" | "weekStart" | "level" | "state">): boolean {
  if (ctx.level === "aus") return false;
  if (ctx.level === "taeglich" || ctx.state.days.includes(ctx.date)) return true;
  const end = addDays(ctx.weekStart, 6);
  return ctx.state.days.filter((d) => d >= ctx.weekStart && d <= end).length < TIP_DAYS_PER_WEEK;
}

/** Kleine, stabile Zahl aus dem Datum (Reihum-Auswahl ohne Zufall) */
function dayNumber(date: string): number {
  return Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);
}

const fresh = (tip: Tip, ctx: TipContext) => (!ctx.state.seen[tip.id] || ctx.state.seen[tip.id] === ctx.date) && fits(tip, ctx);

/** Passt der Tipp zum Haushalt? (Kinder-Tipps nur mit Kindern, Wochenend-Ideen je Typ) */
function fits(tip: Tip, ctx: TipContext): boolean {
  if (ctx.planning === false && /wochenplan|planen|planung|einkaufstag/i.test(`${tip.text} ${tip.detail}`)) return false;
  const kids = ctx.kids ?? true;
  if (tip.audience === "kids") return kids;
  if (tip.audience === "nokids") return !kids;
  if (tip.audience === "paar") return !kids && ctx.household === "paar";
  return kids || !/kinder/i.test(`${tip.text} ${tip.detail}`);
}

const card = (tip: Tip): TipCardData => ({
  kind: "tip",
  id: tip.id,
  category: tip.category,
  title: tip.title || CATEGORY_TITLES[tip.category],
  text: tip.text,
  detail: tip.detail,
  steps: tip.steps,
});

/**
 * Die Tipps für heute (höchstens 3, stabil über den Tag): Twist, Tipps zum
 * Gericht, Gesundheits-Tipp, dann allgemeine reihum. Gesundheits-Tipps folgen
 * ihrer eigenen Einstellung – auch wenn die übrigen Tipps aus sind.
 */
export function tipDeck(ctx: TipContext): TipCardData[] {
  const deck: TipCardData[] = [];
  const general = tipDayAllowed(ctx);
  const rare = (cat: string) => (ctx.state.dismissed[cat as TipCategory] ?? 0) >= CATEGORY_DISMISS_LIMIT;
  // Seltener heißt: nur jeden vierten Tag
  const today = dayNumber(ctx.date);
  const allowedCat = (cat: string) => !rare(cat) || today % 4 === 0;

  if (general && ctx.twist && allowedCat("twist")) {
    deck.push({
      kind: "twist",
      id: `twist:${ctx.twist.key}`,
      category: "twist",
      title: "Lust auf einen Twist?",
      text: `${ctx.twist.idea} – ${ctx.twist.minutes} Min extra.`,
      detail: ctx.twist.item
        ? `Kleine Abwandlung für ein Gericht, das ${ctx.household === "single" ? "du kennst" : "ihr kennt"}. Wenn du „Übernehmen“ tippst, setze ich ${ctx.twist.item} für heute auf die Liste.`
        : ctx.household === "single"
          ? "Kleine Abwandlung für ein Gericht, das du kennst – einfach ausprobieren, wenn du Lust hast."
          : "Kleine Abwandlung für ein Gericht, das ihr kennt – einfach ausprobieren, wenn ihr Lust habt.",
    });
  }
  if (general && ctx.dish && allowedCat("gericht")) {
    const dish = ctx.dish;
    deck.push(...GERICHT_TIPS.filter((t) => t.match?.test(dish) && fresh(t, ctx)).slice(0, 2).map(card));
  }
  if (ctx.health) {
    deck.push({
      kind: "gesund",
      id: `gesund:${ctx.health.key}`,
      category: "gesund",
      title: `Kleine Idee für ${ctx.health.title}`,
      text: ctx.health.text,
      detail: "Ein freiwilliger Tausch nur für dieses Rezept. „Ausprobieren“ ändert das Rezept – mit Rückgängig.",
    });
  }
  if (general) {
    // Allgemeine Kategorien reihum, Start je Tag versetzt
    const cats: TipCategory[] = ["profi", "sparen", "reste", "vorrat"];
    let order = cats.map((_, i) => cats[(today + i) % cats.length]);
    // Kleiner Haushalt: Vorrat & Einfrieren (Portionen) zuerst
    if (ctx.household === "single" || ctx.household === "paar") order = ["vorrat", ...order.filter((c) => c !== "vorrat")];
    // Fr–So: zuerst eine Wochenend-Idee passend zum Haushalt
    if (ctx.weekendIdeas !== false && [5, 6, 0].includes(new Date(`${ctx.date}T12:00:00Z`).getUTCDay())) order = ["wochenende", ...order];
    order = order.filter(allowedCat);
    for (const cat of order) {
      if (deck.length >= TIPS_PER_DAY) break;
      const pool = ALL_TIPS.filter((t) => t.category === cat && fresh(t, ctx));
      if (pool.length) deck.push(card(pool[today % pool.length]));
    }
  }
  return deck.slice(0, TIPS_PER_DAY);
}
