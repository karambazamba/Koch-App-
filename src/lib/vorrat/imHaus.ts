// Seite „Im Haus“ (Tafel 102) – reine Aufteilung, dazu der Bereich „Im
// Haus“ auf der Essen-Seite (`imHausReihe`) und die Kachel. Gruppen
// Kühlschrank → Vorrat → Obst & Gemüse → Brot → Tiefkühl (nur mit Inhalt),
// jede Sache als Chip; „bald aufbrauchen“ ist nur ein oranger Punkt.
// Aufgebrauchtes steht nicht als Kacheln da, sondern als EINE Zeile
// („Aufgebraucht: Thunfisch, Kuchen“ + „Auf die Liste“).

import { PANTRY, PANTRY_RECENT, sortBy, via } from "@/lib/core/sort";
import { isGone, isGrundsache, isSoon, soonBadge } from "@/lib/vorrat/haltbar";
import { PANTRY_PLACES, activePantry, usedPantry, type PantryItem, type PantryPlace } from "@/lib/vorrat/pantry";

export type HouseGroup = { id: PantryPlace; title: string; items: { item: PantryItem; soon: boolean }[] };

const order = (items: PantryItem[]) => sortBy(items, ...via((p: PantryItem) => ({ name: p.name, place: p.place }), PANTRY));

/** Gruppen der Seite (leere fallen weg), dazu das Aufgebrauchte der letzten Tage */
export function houseGroups(items: PantryItem[], today: string): { groups: HouseGroup[]; used: PantryItem[] } {
  const active = activePantry(items, today);
  const groups = PANTRY_PLACES.map((p) => ({
    id: p.value,
    title: p.label,
    items: order(active.filter((i) => i.place === p.value)).map((item) => ({ item, soon: isSoon(item, today) })),
  })).filter((g) => g.items.length);
  // Was inzwischen wieder da ist, steht nicht mehr als aufgebraucht da
  const used = order(usedPantry(items, today)).filter((u, i, all) => all.findIndex((x) => x.name.toLowerCase() === u.name.toLowerCase()) === i);
  return { groups, used };
}

/** „Aufgebraucht: Thunfisch“ bzw. „Aufgebraucht: Thunfisch, Kuchen“ (null = nichts) */
export function aufgebrauchtZeile(used: PantryItem[]): string | null {
  return used.length ? `Aufgebraucht: ${used.map((u) => u.name).join(", ")}` : null;
}

/** Zeilen der Kachel im festen Raster: XS eine, S zwei (darunter „Was koch ich daraus?“) */
export const HOUSE_TILE_MAX: Record<"XS" | "S", number> = { XS: 1, S: 2 };

/** Kachel auf Heute: „Bald aufbrauchen“ (höchstens `max`), sonst die zuletzt eingekauften */
export function houseTile(items: PantryItem[], today: string, max = 3): { soon: boolean; items: { item: PantryItem; badge: ReturnType<typeof soonBadge> }[] } {
  const active = activePantry(items, today);
  const soon = order(active.filter((p) => isSoon(p, today)));
  const shown = soon.length ? soon : sortBy(active, ...PANTRY_RECENT);
  return { soon: soon.length > 0, items: shown.slice(0, max).map((item) => ({ item, badge: soonBadge(item, today) })) };
}

/** Höchstens so viele Chips im Bereich „Im Haus“ auf der Essen-Seite */
export const IM_HAUS_CHIPS = 8;

/**
 * Essen-Seite „Im Haus“ und „Was koch ich daraus?“: was gerade da ist,
 * „bald aufbrauchen“ zuerst, dann das zuletzt Reingekommene. Gekauftes aus
 * der Einkaufsliste („b:“) und eben Gesagtes („s:“) sind nie „bald“.
 */
export function imHausReihe(items: PantryItem[], today: string): { item: PantryItem; soon: boolean }[] {
  const active = items.filter((p) => !p.usedAt && !isGone(p, today) && !isGrundsache(p.name));
  const fresh = (p: PantryItem) => !p.id.startsWith("b:") && !p.id.startsWith("s:") && isSoon(p, today);
  const soon = order(active.filter(fresh));
  const rest = sortBy(active.filter((p) => !soon.includes(p)), ...PANTRY_RECENT);
  return [...soon.map((item) => ({ item, soon: true })), ...rest.map((item) => ({ item, soon: false }))];
}
