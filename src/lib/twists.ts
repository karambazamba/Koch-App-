// "Lust auf einen Twist?": Bei bekannten Gerichten gelegentlich (höchstens
// 2× pro Planungswoche, nie zwei Tage hintereinander, nie beim Wunschessen)
// eine kleine Abwandlung. Vorerst aus einer festen Liste, später per KI.

import { useExternalStore } from "./useExternalStore";
import { createLocalStore } from "./localStore";
import { addDays } from "./weekPlan";

export type Twist = {
  key: string;
  /** Kurze Idee (passt in eine Zeile), z. B. "Mozzarella-Würfel unterheben" */
  idea: string;
  /** So viele Minuten mehr */
  minutes: number;
  /** Zutat, die dafür evtl. noch gebraucht wird → "Für heute" */
  item?: string;
};

/** Reihenfolge zählt: Spezielles vor Allgemeinem */
const TWISTS: (Twist & { match: RegExp })[] = [
  { key: "bolognese", match: /bolognese|hackfleischso(ß|ss)e/i, idea: "Geriebene Möhre in die Soße", minutes: 5, item: "Möhren" },
  { key: "lasagne", match: /lasagne/i, idea: "Eine Schicht Spinat dazwischen", minutes: 5, item: "Blattspinat" },
  { key: "pfannkuchen", match: /pfannkuchen|pfannekuchen|crêpe|crepe/i, idea: "Apfelscheiben mit in die Pfanne", minutes: 5, item: "Äpfel" },
  { key: "schnitzel", match: /schnitzel/i, idea: "Panade aus Cornflakes", minutes: 5, item: "Cornflakes" },
  { key: "chili", match: /chili/i, idea: "Ein Stück Zartbitterschokolade rein", minutes: 2, item: "Zartbitterschokolade" },
  { key: "gulasch", match: /gulasch/i, idea: "Klecks Schmand obendrauf", minutes: 2, item: "Schmand" },
  { key: "curry", match: /curry/i, idea: "Kokosmilch und Limette dazu", minutes: 3, item: "Kokosmilch" },
  { key: "lachs", match: /lachs/i, idea: "Mit Honig-Senf-Kruste", minutes: 5, item: "Honig" },
  { key: "haehnchen", match: /hähnchen|huhn|chicken/i, idea: "Mit Honig-Paprika glasieren", minutes: 5 },
  { key: "burger", match: /burger/i, idea: "Röstzwiebeln obendrauf", minutes: 5, item: "Röstzwiebeln" },
  { key: "pizza", match: /pizza|flammkuchen/i, idea: "Rand mit Knoblauchöl", minutes: 3 },
  { key: "fischstaebchen", match: /fischstäbchen/i, idea: "Schnelle Joghurt-Remoulade", minutes: 5, item: "Joghurt" },
  { key: "wraps", match: /wrap|taco|tortilla|burrito/i, idea: "Joghurt-Knoblauch-Soße dazu", minutes: 5, item: "Joghurt" },
  { key: "ei", match: /rührei|omelett/i, idea: "Kräuter und Feta rein", minutes: 3, item: "Feta" },
  { key: "suppe", match: /suppe|eintopf/i, idea: "Croutons aus altem Brot", minutes: 10 },
  { key: "kartoffeln", match: /kartoffel|pommes|wedges/i, idea: "Mit Rosmarin aus dem Ofen", minutes: 5, item: "Rosmarin" },
  { key: "risotto", match: /risotto|reis/i, idea: "Zitronenschale und Parmesan", minutes: 2, item: "Zitrone" },
  { key: "tomatensosse", match: /tomatenso(ß|ss)e|tomatensauce|napoli/i, idea: "Mozzarella-Würfel unterheben", minutes: 2, item: "Mozzarella" },
  { key: "nudeln", match: /nudel|pasta|spaghetti|penne|tortellini|maultasche/i, idea: "Geröstete Pinienkerne drüber", minutes: 3, item: "Pinienkerne" },
  { key: "salat", match: /salat/i, idea: "Geröstete Kerne drüber", minutes: 5 },
];

/** Passender Twist für ein Gericht (oder keiner) */
export function twistFor(title: string): Twist | null {
  const hit = TWISTS.find((t) => t.match.test(title));
  if (!hit) return null;
  const { match: _match, ...twist } = hit;
  void _match;
  return twist;
}

// --- Wann zeigen? -------------------------------------------------------------

/** Höchstens so viele Twist-Tage pro Planungswoche */
export const TWISTS_PER_WEEK = 2;

type TwistStore = {
  version: 1;
  /** Tage ("YYYY-MM-DD"), an denen ein Twist angeboten wurde */
  shown: string[];
  /** Übernommene Twists je Tag (Twist-Schlüssel, evtl. Artikel auf der Liste) */
  taken: Record<string, { key: string; manualId?: string; weekStart?: string }>;
};

function migrate(raw: unknown): TwistStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<TwistStore>;
  if (d.version !== 1) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const taken: TwistStore["taken"] = {};
  for (const [date, t] of Object.entries(d.taken ?? {})) {
    if (iso.test(date) && t && typeof t.key === "string") taken[date] = t;
  }
  return { version: 1, shown: Array.isArray(d.shown) ? d.shown.filter((x) => typeof x === "string" && iso.test(x)) : [], taken };
}

const store = createLocalStore("wasgibts.twists", migrate);
const EMPTY: TwistStore = { version: 1, shown: [], taken: {} };

export function useTwists(): TwistStore | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? EMPTY);
}

/** Darf heute ein Twist angeboten werden? (2× pro Woche, nie an zwei Tagen hintereinander) */
export function twistAllowed(state: TwistStore, todayIso: string, weekStart: string): boolean {
  if (state.shown.includes(todayIso)) return true;
  if (state.shown.includes(addDays(todayIso, -1))) return false;
  const weekEnd = addDays(weekStart, 6);
  return state.shown.filter((d) => d >= weekStart && d <= weekEnd).length < TWISTS_PER_WEEK;
}

/** Angeboten (einmal pro Tag gezählt, nur die letzten 60 Tage behalten) */
export function markTwistShown(todayIso: string) {
  const current = store.load() ?? EMPTY;
  if (current.shown.includes(todayIso)) return;
  const from = addDays(todayIso, -60);
  store.save({ ...current, shown: [...current.shown.filter((d) => d >= from), todayIso] });
}

export function markTwistTaken(todayIso: string, taken: TwistStore["taken"][string]) {
  const current = store.load() ?? EMPTY;
  store.save({ ...current, taken: { ...current.taken, [todayIso]: taken } });
}

export function unmarkTwistTaken(todayIso: string) {
  const current = store.load() ?? EMPTY;
  const taken = { ...current.taken };
  delete taken[todayIso];
  store.save({ ...current, taken });
}
