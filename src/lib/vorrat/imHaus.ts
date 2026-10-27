// Seite „Im Haus“ (Tafel 78/79, Punkt 7) – reine Aufteilung, dazu der
// Bereich „Im Haus“ auf der Essen-Seite (`imHausReihe`) und die Kachel:
// „Bald aufbrauchen“ (nur Frisches im letzten Drittel) → Kühlschrank →
// Schrank → Tiefkühler → „Aufgebraucht“ (3 Tage, blass). Chips oben wie die
// Läden im Einkauf: Alle · Kühlschrank · Schrank · TK.

import { PANTRY, PANTRY_RECENT, sortBy, via } from "@/lib/core/sort";
import { isGone, isGrundsache, isSoon, soonBadge } from "@/lib/vorrat/haltbar";
import { activePantry, usedPantry, type PantryItem, type PantryPlace } from "@/lib/vorrat/pantry";

export type HouseChip = "alle" | PantryPlace;

export const HOUSE_CHIPS: { id: HouseChip; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "kuehlschrank", label: "Kühlschrank" },
  { id: "schrank", label: "Schrank" },
  { id: "tiefkuehler", label: "TK" },
];

export type HouseSection = { id: "bald" | PantryPlace | "aufgebraucht"; title: string; items: PantryItem[] };

const TITLES: Record<HouseSection["id"], string> = {
  bald: "Bald aufbrauchen",
  kuehlschrank: "Kühlschrank",
  schrank: "Schrank",
  tiefkuehler: "Tiefkühler",
  aufgebraucht: "Aufgebraucht · antippen = wieder auf die Liste",
};

const order = (items: PantryItem[]) => sortBy(items, ...via((p: PantryItem) => ({ name: p.name, place: p.place }), PANTRY));

/** Abschnitte der Seite (leere fallen weg) */
export function houseSections(items: PantryItem[], today: string, chip: HouseChip = "alle"): HouseSection[] {
  const inChip = (p: PantryItem) => chip === "alle" || p.place === chip;
  const active = activePantry(items, today).filter(inChip);
  const soon = active.filter((p) => isSoon(p, today));
  const rest = active.filter((p) => !soon.includes(p));
  const sections: HouseSection[] = [
    { id: "bald", title: TITLES.bald, items: order(soon) },
    ...(["kuehlschrank", "schrank", "tiefkuehler"] as const).map((place) => ({ id: place, title: TITLES[place], items: order(rest.filter((p) => p.place === place)) })),
    { id: "aufgebraucht", title: TITLES.aufgebraucht, items: order(usedPantry(items, today).filter(inChip)) },
  ];
  return sections.filter((s) => s.items.length);
}

/** Kachel auf Heute: „Bald aufbrauchen“ (S: 3, M: 6), sonst die zuletzt eingekauften */
export const HOUSE_TILE_MAX: Record<"S" | "M", number> = { S: 3, M: 6 };

/** Kachel auf Heute: „Bald aufbrauchen“ (höchstens `max`), sonst die zuletzt eingekauften */
export function houseTile(items: PantryItem[], today: string, max = HOUSE_TILE_MAX.S): { soon: boolean; items: { item: PantryItem; badge: ReturnType<typeof soonBadge> }[] } {
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
