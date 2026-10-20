// Vorschläge im leeren Chat ("Zum Beispiel:"): höchstens drei kleine Chips über
// dem Eingabefeld, passend zur Situation – Uhrzeit (vor/nach dem Essen), Namen
// aus dem eigenen Profil, gelegentlich Vorrat oder Einkaufsliste. Wer den Chat
// schon regelmäßig nutzt, sieht keine mehr. Rein bis auf den kleinen Zähler.

import { useExternalStore } from "../core/useExternalStore";
import { createLocalStore } from "../core/localStore";
import type { PantryItem } from "../essen/pantry";
import { isSolo, type HouseholdProfile } from "../einstellungen/profile";
import { perishables } from "../essen/spontan";

/** Ab so vielen eigenen Nachrichten keine Vorschläge mehr */
const SUGGESTIONS_UNTIL = 10;

const WISH_DISHES = ["Pfannkuchen", "Lasagne", "Fischstäbchen", "Pizza", "Milchreis", "Spaghetti"];

type Situation = {
  profile: HouseholdProfile;
  /** Ist das heutige Essen schon vorbei (abends nach dem Essen)? */
  mealOver: boolean;
  pantry: PantryItem[];
  /** Was auf der Einkaufsliste steht (Namen) */
  shopping: string[];
  /** KI erreichbar? Ohne KI nur Sätze, die die App selbst versteht */
  ai: boolean;
  /** Zufallszahl 0–1, je Chat einmal gewürfelt (stabil, solange er offen ist) */
  rand: number;
};

/** Zufällig, aber stabil für dieselbe Zahl */
const pick = <T,>(items: T[], rand: number, salt = 0): T => items[Math.floor(((rand * 9973 + salt * 7919) % 1) * items.length) % items.length];

export function chatSuggestions({ profile, mealOver, pantry, shopping, ai, rand }: Situation): string[] {
  const out: string[] = [];
  // 1. Uhrzeit: vor dem Essen "heute", danach "morgen" (ohne KI: was die App selbst kann)
  out.push(!mealOver ? "Was gibt’s heute?" : ai ? "Was machen wir morgen?" : "Was ist noch da?");

  // 2. Gelegentlich (etwa jedes zweite Mal) Vorrat oder Einkaufsliste
  const fresh = perishables(pantry.filter((p) => p.place === "kuehlschrank"));
  if (fresh.length && rand < 0.5) out.push(`Was mach ich mit ${pick(fresh, rand, 1).replace(/^\d+\s*/, "")}?`);
  else if (rand >= 0.5) {
    const ideas = ["Milch", "Eier", "Haferflocken", "Brot", "Bananen", "Joghurt"].filter((n) => !shopping.some((s) => s.toLowerCase() === n.toLowerCase()));
    if (ideas.length >= 2) {
      const first = pick(ideas, rand, 2);
      const second = pick(ideas.filter((n) => n !== first), rand, 3);
      out.push(`Wir brauchen ${first} und ${second}`);
    }
  }

  // 3. Wunsch – Name nur aus dem eigenen Profil (zufällige Person), allein: "Ich wünsche mir …"
  const dish = pick(WISH_DISHES, rand, 4);
  const named = profile.persons.filter((p) => p.name.trim());
  if (isSolo(profile) || !named.length) out.push(`Ich wünsche mir ${dish}`);
  else out.push(`${pick(named, rand, 5).name.trim()} wünscht sich ${dish}`);

  // Falls oben nichts aus Vorrat/Liste dazukam: ein Einkaufs-Beispiel
  if (out.length < 3) out.splice(1, 0, "Wir brauchen Milch und Eier");
  return [...new Set(out)].slice(0, 3);
}

// --- Wie oft wurde der Chat schon genutzt? ------------------------------------

type Usage = { version: 1; messages: number };

function migrate(raw: unknown): Usage | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Usage>;
  return d.version === 1 ? { version: 1, messages: Math.max(0, Number(d.messages) || 0) } : null;
}

const store = createLocalStore("wasgibts.chatnutzung", migrate);

/** Eigene Nachricht gezählt (nur bis zur Grenze nötig) */
export function noteChatMessage() {
  const messages = store.load()?.messages ?? 0;
  if (messages < SUGGESTIONS_UNTIL) store.save({ version: 1, messages: messages + 1 });
}

/** Vorschläge noch zeigen? (`undefined` = lädt) */
export function useShowSuggestions(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return (data?.messages ?? 0) < SUGGESTIONS_UNTIL;
}
