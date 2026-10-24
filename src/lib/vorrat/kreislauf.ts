// Kreislauf Einkauf ↔ Im Haus (Tafel 78/79, Punkt 4):
// - Im Einkauf abgehakt = gekauft → wandert nach „Im Haus“ (nur Lebensmittel,
//   Drogerie/Haushalt nicht). Meldung „Im Haus: Brot, Äpfel · Rückgängig“ –
//   kurz hintereinander Abgehaktes kommt in EINE Meldung.
// - Zurückgenommen (Haken weg) = heute Reingelegtes wieder raus.
// - Im Haus aufgebraucht und nochmal angetippt = wieder auf die Liste.
// Schaltet den Baustein frei, sobald etwas reinkommt.

import { unlockFeature } from "@/lib/core/features";
import { now } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { newId } from "@/lib/einkauf/listModel";
import { updateList } from "@/lib/einkauf/listStore";
import { sectionFor } from "@/lib/einkauf/sections";
import { isFood, isGrundsache } from "@/lib/vorrat/haltbar";
import { addPantryItems, loadPantryAll, replacePantry, sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";

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

/** Aufgebraucht nochmal angetippt → wieder auf die Einkaufsliste (raus aus Im Haus) */
export function backToList(item: PantryItem, weekStart: string) {
  const before = loadPantryAll();
  const id = newId();
  updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, { id, name: item.name, amount: "", section: sectionFor(item.name), done: false }] }));
  replacePantry(before.filter((p) => p.id !== item.id));
  const text = "Steht wieder auf der Liste";
  showToast({
    text,
    undo: pushUndo(text, () => {
      updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => m.id !== id) }));
      replacePantry(before);
    }),
    undoneText: "Wieder weg",
    seconds: 4,
    small: true,
  });
}

/**
 * Sätze ohne KI (Notlösung): „Hab Hähnchen gekauft“, „Ich hab Brot und Eier
 * mitgebracht“ → rein; „Die Milch ist alle“, „Eier sind aufgebraucht“ → raus.
 */
export function pantrySentence(text: string): { add: string[] } | { used: string[] } | null {
  const s = text.trim().replace(/[.!]+$/, "");
  const split = (x: string) => x.split(/\s*(?:,|(?<![a-zäöüß])und(?![a-zäöüß]))\s*/i).map((n) => n.trim()).filter(Boolean).map((n) => n.charAt(0).toUpperCase() + n.slice(1));
  const bought = s.match(/^(?:ich\s+)?hab(?:e)?\s+(?:gerade\s+|eben\s+|grad\s+)?(.+?)\s+(?:gekauft|mitgebracht|geholt)$/i);
  if (bought) return { add: split(bought[1]) };
  const gone = s.match(/^(?:die|der|das)?\s*(.+?)\s+(?:ist|sind)\s+(?:alle|aufgebraucht|leer)$/i);
  if (gone && gone[1].split(/\s+/).length <= 4) return { used: split(gone[1]) };
  return null;
}
