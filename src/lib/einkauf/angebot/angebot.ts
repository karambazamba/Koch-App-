// Einkaufsliste nur mit Namen (A-040, Tafel 127), rein. Zutaten aus dem
// Wochenplan sind ein Angebot, kein Muss: oben auf der Laden-Seite die Karte
// „Für deinen Wochenplan“ („Lasagne · Fr · Curry · Sa“), Zutaten als Chips –
// einzeln antippen oder „Alle dazu“. Grundsachen (Salz, Pfeffer …) stehen
// blass da und kommen nie von selbst mit. Übernommen steht eine Zutat ganz
// normal auf der Liste, ohne Gramm und ohne „für …“; wofür sie ist, steht
// erst im Zeilen-Fenster („für Gemüselasagne · Fr“).

import { WEEKDAYS_MO, WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { istGrundsache } from "@/lib/einkauf/kacheln/gruppen";
import type { ListItem, ManualItem } from "@/lib/einkauf/listModel";

const lower = (s: string) => s.trim().toLowerCase();

type AngebotChip = { item: ListItem; /** Grundsache: blass, nie bei „Alle dazu“ */ blass: boolean };
export type Angebot = { kopf: string; chips: AngebotChip[] };

/** „Lasagne (Fr) ×2“ → „Lasagne“ */
const gericht = (d: string) => d.replace(/\s*×2$/, "").replace(/\s*\([^)]*\)$/, "").trim();
/** Tag eines Gerichts: „Lasagne (Fr)“ → „Fr“ */
const tagVon = (d: string) => d.match(/\(([^)]+)\)(?:\s*×2)?$/)?.[1] ?? "";
const kurz = (tag: string) => {
  const i = WEEKDAYS_MO.findIndex((d) => d === tag);
  return i < 0 ? "" : WEEKDAYS_SHORT_MO[i];
};

/** Gehört die Zutat auf diese Laden-Seite? Eigener Laden bzw. noch ohne Laden; „Egal wo“ nur auf „Egal wo“; `null` = alle (ohne eigene Läden) */
const hierAnbieten = (i: ListItem, shop: string | null) => (shop === null ? true : shop ? lower(i.shop) === lower(shop) || (!i.shop.trim() && !i.anywhere) : !i.shop.trim() && Boolean(i.anywhere));

/** Kopf der Karte: „Lasagne · Fr · Curry · Sa“ (Gerichte mit Tag, in Plan-Reihenfolge) */
function angebotKopf(items: readonly ListItem[]): string {
  const gerichte = [...new Set(items.flatMap((i) => i.dishes))];
  return [...new Map(gerichte.map((d) => [`${gericht(d)}|${tagVon(d)}`, [gericht(d), tagVon(d)].filter(Boolean).join(" · ")])).values()].join(" · ");
}

/** Das Angebot für eine Laden-Seite (leer = keine Karte) */
export function angebotFuer(shop: string | null, angebot: readonly ListItem[], alwaysList: readonly string[] = []): Angebot {
  const always = new Set(alwaysList.map(lower));
  const hier = angebot.filter((i) => hierAnbieten(i, shop));
  const blass = (i: ListItem) => istGrundsache(i.originalName) && !always.has(lower(i.originalName)) && !always.has(lower(i.name));
  // Grundsachen zuletzt, sonst wie im Plan
  const chips = [...hier.filter((i) => !blass(i)).map((item) => ({ item, blass: false })), ...hier.filter(blass).map((item) => ({ item, blass: true }))];
  return { kopf: angebotKopf(hier), chips };
}

/** „Alle dazu“: alles außer den Grundsachen */
export const alleDazu = (a: Angebot): ListItem[] => a.chips.filter((c) => !c.blass).map((c) => c.item);

/** Eine Zutat aus dem Angebot als Eintrag der Liste: nur der Name, wofür und die Rezeptmenge als Hinweis */
export function alsEintrag(i: ListItem): Omit<ManualItem, "id" | "done"> {
  const namen = [...new Set(i.dishes.map(gericht).filter(Boolean))];
  const day = i.days[0];
  return {
    name: i.name,
    amount: "",
    section: i.section,
    ...(day ? { day } : {}),
    ...(namen.length ? { dish: namen.join(", ") } : {}),
    ...(i.rezeptMenge ? { rezeptMenge: i.rezeptMenge } : {}),
  };
}

/** Wofür (erst im Zeilen-Fenster): „für Gemüselasagne · Fr“; leer = selbst draufgesetzt */
export function wofuer(i: Pick<ListItem, "dishes" | "days">): string {
  const namen = [...new Set(i.dishes.map(gericht).filter(Boolean))];
  if (!namen.length) return "";
  const tag = i.dishes.map(tagVon).find(Boolean) ?? (i.days[0] ? kurz(i.days[0]) : "");
  return [`für ${namen.join(", ")}`, tag].filter(Boolean).join(" · ");
}

/**
 * Nach „Nehmen“ in der Rezept-Vorschau (A-046 → A-040): die Zutaten genau
 * dieses Gerichts aus dem Wochenplan-Angebot, ohne Grundsachen. `needs` = was
 * die Vorschau „auf die Liste“ nannte (ohne Vorrat); `null` = ohne Vorrat-Abgleich.
 */
export function angebotFuerGericht(angebot: readonly ListItem[], titel: string, alwaysList: readonly string[] = [], needs: readonly string[] | null = null): ListItem[] {
  const t = lower(titel);
  const brauch = needs ? new Set(needs.map(lower)) : null;
  return alleDazu(angebotFuer(null, angebot, alwaysList)).filter(
    (i) => i.dishes.some((d) => lower(gericht(d)) === t) && (!brauch || brauch.has(lower(i.name)) || brauch.has(lower(i.originalName))),
  );
}

/** Frage nach „Nehmen“: „Auf die Liste: Eier, Limette +2?“ – nie mitten im Namen abgebrochen */
export function angebotFrage(items: readonly Pick<ListItem, "name">[]): string {
  const namen = items.map((i) => i.name);
  const gezeigt = namen.slice(0, 2).join(", ");
  return `Auf die Liste: ${namen.length > 2 ? `${gezeigt} +${namen.length - 2}` : gezeigt}?`;
}
