// Wunsch-Ideen: Jeder kann sich ein Gericht wünschen – auch ohne Planung
// ("Lotte, Mathis wünscht sich Pfannkuchen"). Wünsche stehen ganz oben bei
// den Ideen, bis sie gekocht oder weggewischt sind.

import { createLocalStore } from "./localStore";
import { useExternalStore } from "./useExternalStore";
import type { Person } from "./profile";

export type WishIdea = {
  id: string;
  /** Person aus dem Profil, falls erkannt */
  personId: string | null;
  /** Wer sich's wünscht (Anzeigename, z. B. "Mathis") */
  who: string;
  dish: string;
  createdAt: string;
};

type WishStore = { version: 1; wishes: WishIdea[] };

function migrate(raw: unknown): WishStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<WishStore>;
  if (d.version !== 1 || !Array.isArray(d.wishes)) return null;
  return {
    version: 1,
    wishes: d.wishes
      .filter((w): w is WishIdea => Boolean(w) && typeof w.id === "string" && typeof w.dish === "string")
      .map((w) => ({ id: w.id, personId: typeof w.personId === "string" ? w.personId : null, who: typeof w.who === "string" ? w.who : "", dish: w.dish, createdAt: typeof w.createdAt === "string" ? w.createdAt : "" })),
  };
}

const store = createLocalStore("wasgibts.wuensche", migrate);
const EMPTY: WishIdea[] = [];

export function useWishes(): WishIdea[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.wishes ?? EMPTY);
}

export function loadWishes(): WishIdea[] {
  return store.load()?.wishes ?? EMPTY;
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function addWish(wish: Omit<WishIdea, "id" | "createdAt">, today: string): WishIdea {
  const created = { ...wish, id: newId(), createdAt: today };
  const current = loadWishes().filter((w) => !(w.dish.toLowerCase() === wish.dish.toLowerCase() && w.who === wish.who));
  store.save({ version: 1, wishes: [...current, created] });
  return created;
}

export function removeWish(id: string) {
  store.save({ version: 1, wishes: loadWishes().filter((w) => w.id !== id) });
}

export function restoreWishes(wishes: WishIdea[]) {
  store.save({ version: 1, wishes });
}

/** "Mathis' Wunsch" bzw. "Ellas Wunsch" */
export function wishLabel(who: string): string {
  if (!who) return "Wunsch";
  return /[sxzß]$/i.test(who) ? `${who}' Wunsch` : `${who}s Wunsch`;
}

/**
 * "Mathis wünscht sich Pfannkuchen", "Ich wünsche mir Lasagne",
 * "Wunsch von Ella: Nudeln" → Wunsch. `weekday` = ob ein Wochentag genannt
 * wurde (dann ist es eher ein Wunsch für den Plan).
 */
export function parseWish(text: string, persons: Person[]): { who: string; personId: string | null; dish: string; weekday: boolean } | null {
  // "Lotte, Mathis wünscht sich …" → Anrede weg
  const t = text.trim().replace(/^(hey\s+|hallo\s+)?[A-ZÄÖÜa-zäöüß]+,\s*/i, "");
  const weekday = /\b(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen)\b/i.test(t);
  const clean = (dish: string) =>
    dish
      .replace(/\b(am|zum|zu|für)\s+(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen|abend|mittag)\w*/gi, "")
      .replace(/\b(heute|bald|mal wieder|mal|wieder|bitte|gerne?|unbedingt)\b/gi, "")
      .replace(/[.!?"„“]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  let m = t.match(/^([A-ZÄÖÜ][a-zäöüß]+)\s+wünscht\s+sich\s+(.+)$/i);
  let who = "";
  let dish = "";
  if (m) {
    who = m[1];
    dish = m[2];
  } else if ((m = t.match(/\bich\s+wünsche\s+mir\s+(.+)$/i))) {
    dish = m[1];
  } else if ((m = t.match(/\bwunsch\s+von\s+([A-ZÄÖÜ][a-zäöüß]+)\s*:\s*(.+)$/i))) {
    who = m[1];
    dish = m[2];
  } else return null;
  dish = clean(dish);
  if (!dish || dish.length > 60) return null;
  const person = who ? persons.find((p) => p.name.trim().toLowerCase() === who.toLowerCase()) : undefined;
  return { who: person?.name.trim() || who, personId: person?.id ?? null, dish: dish.charAt(0).toUpperCase() + dish.slice(1), weekday };
}
