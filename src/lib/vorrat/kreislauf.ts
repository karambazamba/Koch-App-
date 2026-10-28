// Kreislauf Einkauf ↔ Im Haus (Tafel 78/79, Punkt 4):
// - Im Einkauf abgehakt = gekauft → wandert nach „Im Haus“ (nur Lebensmittel,
//   Drogerie/Haushalt nicht). Meldung „Im Haus: Brot, Äpfel · Rückgängig“ –
//   kurz hintereinander Abgehaktes kommt in EINE Meldung.
// - Zurückgenommen (Haken weg) = heute Reingelegtes wieder raus.
// - Aufgebrauchtes: „Auf die Liste“ in der Zeile „Aufgebraucht: …“ (`aufDieListe`).
// - „Eier sind alle“ (Mia, Regel, „Ist alle“ im Fenster) = raus und auf die
//   Liste (`istAlle`, was schon draufsteht, nicht doppelt).
// Schaltet den Baustein frei, sobald etwas reinkommt.

import { unlockFeature } from "@/lib/core/features";
import { now } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { EMPTY_LIST, newId } from "@/lib/einkauf/listModel";
import { store as listStore, updateList } from "@/lib/einkauf/listStore";
import { findFood } from "@/lib/essen/leftovers/foods";
import { sectionFor } from "@/lib/einkauf/sections";
import { isFood, isGrundsache } from "@/lib/vorrat/haltbar";
import { addPantryItems, consumePantry, loadPantryAll, replacePantry, sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";

/** Abgehakt innerhalb dieser Zeit = eine gemeinsame Meldung */
const JOIN_MS = 5000;
let batch: { names: string[]; before: PantryItem[]; at: number } | null = null;

/** Gekauft (Haken gesetzt) → Im Haus */
export function boughtToHouse(name: string, today: string) {
  if (!isFood(name) || isGrundsache(name)) return;
  const nowMs = now().getTime();
  const join = batch && nowMs - batch.at < JOIN_MS ? batch : null;
  const before = join ? join.before : loadPantryAll();
  const added = addPantryItems([{ name }], today);
  if (!added.length) return;
  unlockFeature("vorrat");
  batch = { names: [...(join?.names ?? []), ...added], before, at: nowMs };
  const text = `Im Haus: ${batch.names.join(", ")}`;
  showToast({ text, undo: pushUndo(text, () => replacePantry(before)), undoneText: "Wieder draußen", seconds: 4, small: true });
}

/** Haken zurückgenommen → was heute reinkam, wieder raus */
export function unboughtFromHouse(name: string, today: string) {
  const all = loadPantryAll();
  const next = all.filter((p) => !(p.addedAt === today && !p.usedAt && sameIngredient(p.name, name)));
  if (next.length !== all.length) replacePantry(next);
}

/**
 * „Aufgebraucht: Thunfisch, Kuchen · Auf die Liste“: alles Aufgebrauchte auf
 * die Einkaufsliste der Woche (was dort schon offen steht, nicht doppelt) und
 * raus aus Im Haus – eine Meldung mit Rückgängig.
 */
export function aufDieListe(items: PantryItem[], weekStart: string) {
  const before = loadPantryAll();
  const list = listStore.load()?.weeks[weekStart] ?? EMPTY_LIST;
  const fresh = items
    .filter((it, i) => items.findIndex((x) => sameIngredient(x.name, it.name)) === i)
    .filter((it) => !list.manual.some((m) => !m.done && sameIngredient(m.name, it.name)))
    .map((it) => ({ id: newId(), name: it.name, amount: "", section: sectionFor(it.name), done: false }));
  if (fresh.length) updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, ...fresh] }));
  replacePantry(before.filter((p) => !items.some((it) => it.id === p.id)));
  const text = items.length === 1 ? `${items[0].name} steht auf der Liste` : "Steht auf der Liste";
  showToast({
    text,
    undo: pushUndo(text, () => {
      if (fresh.length) updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => !fresh.some((f) => f.id === m.id)) }));
      replacePantry(before);
    }),
    undoneText: "Wieder weg",
    seconds: 4,
    small: true,
  });
}

/**
 * „Eier sind alle“: raus aus Im Haus und auf die Einkaufsliste der Woche
 * `weekStart` (steht es dort schon und ist nicht abgehakt, nicht nochmal).
 * Liefert, was rausging, was auf die Liste kam, und das Rückgängig.
 */
export function istAlle(names: string[], today: string, weekStart: string): { used: string[]; toList: string[]; undo: () => void } {
  const before = loadPantryAll();
  const used = consumePantry(names, today);
  const list = listStore.load()?.weeks[weekStart] ?? EMPTY_LIST;
  const toList = names.filter((n, i) => !list.manual.some((m) => !m.done && sameIngredient(m.name, n)) && names.findIndex((x) => sameIngredient(x, n)) === i);
  const items = toList.map((name) => ({ id: newId(), name, amount: "", section: sectionFor(name), done: false }));
  if (items.length) updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, ...items] }));
  return {
    used,
    toList,
    undo: () => {
      replacePantry(before);
      if (items.length) updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => !items.some((i) => i.id === m.id)) }));
    },
  };
}

/** Steht in der Lebensmittel-Liste (für „Hab noch …“, damit „Hab noch Zeit“ nichts einträgt) */
const knownFood = (name: string) => Boolean(findFood(name.replace(/^\d+\s*/, "")));

/**
 * Sätze ohne KI (Notlösung): „Hab Hähnchen gekauft“, „Ich hab Brot und Eier
 * mitgebracht“, „Hab noch Hack“ → rein; „Die Milch ist alle“, „Eier sind
 * aufgebraucht“ → raus.
 */
export function pantrySentence(text: string): { add: string[] } | { used: string[] } | null {
  const s = text.trim().replace(/[.!]+$/, "");
  const split = (x: string) => x.split(/\s*(?:,|(?<![a-zäöüß])und(?![a-zäöüß]))\s*/i).map((n) => n.trim()).filter(Boolean).map((n) => n.charAt(0).toUpperCase() + n.slice(1));
  const bought = s.match(/^(?:ich\s+)?hab(?:e)?\s+(?:gerade\s+|eben\s+|grad\s+)?(.+?)\s+(?:gekauft|mitgebracht|geholt)$/i);
  if (bought) return { add: split(bought[1]) };
  // „Hab noch Hack“, „Wir haben noch Eier im Kühlschrank“ – nur bekannte Lebensmittel
  const still = s.match(/^(?:(?:ich|wir)\s+)?hab(?:e|en)?\s+noch\s+(.+?)(?:\s+(?:da|im haus|zu hause|im kühlschrank|im schrank|im tiefkühler))?$/i);
  if (still) {
    const names = split(still[1]);
    if (names.length && names.every(knownFood)) return { add: names };
  }
  const gone = s.match(/^(?:die|der|das)?\s*(.+?)\s+(?:ist|sind)\s+(?:alle|aufgebraucht|leer)$/i);
  if (gone && gone[1].split(/\s+/).length <= 4) return { used: split(gone[1]) };
  return null;
}
