// Offline an Mia Gesagtes (`wasgibts.lotte.nachholen` v1): Mia sagt „Bin grad
// offline. Ich mach’s, sobald wieder Netz da ist.“, merkt sich den Satz und
// holt ihn nach, sobald das Gerät wieder online ist (KitchenHelper öffnet die
// Bühne mit dem Satz). Höchstens 5 Sätze, älter als 24 Std. fällt weg.

import { createLocalStore } from "@/lib/core/localStore";
import { now } from "@/lib/core/now";

type Queued = { text: string; at: number };
type QueueState = { version: 1; items: Queued[] };

const MAX = 5;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function migrateQueue(raw: unknown): QueueState | null {
  if (!raw || typeof raw !== "object" || (raw as QueueState).version !== 1) return null;
  const items = Array.isArray((raw as QueueState).items) ? (raw as QueueState).items : [];
  return { version: 1, items: items.filter((i): i is Queued => Boolean(i) && typeof i.text === "string" && i.text.trim() !== "" && typeof i.at === "number") };
}

const store = createLocalStore("wasgibts.lotte.nachholen", migrateQueue);

/** Satz merken (doppelte nicht zweimal) */
export function queueForLater(text: string) {
  const t = text.trim();
  if (!t) return;
  const items = (store.load()?.items ?? []).filter((i) => i.text !== t);
  store.save({ version: 1, items: [...items, { text: t, at: now().getTime() }].slice(-MAX) });
}

/** Alle gemerkten Sätze holen und leeren – zu alte fallen still weg */
export function takeQueued(): string[] {
  const items = store.load()?.items ?? [];
  if (!items.length) return [];
  store.save({ version: 1, items: [] });
  const cutoff = now().getTime() - MAX_AGE_MS;
  return items.filter((i) => i.at >= cutoff).map((i) => i.text);
}
