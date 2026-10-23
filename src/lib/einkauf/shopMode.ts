// Einkauf nach Läden: gemerkter Chip der Einkaufsliste („Alle“ oder ein
// Laden), der Einkaufsmodus „Bei REWE“ (nur, was es dort gibt, dazu
// „Egal wo“ und – eingeklappt – die anderen Läden) und das Lernen: wird im
// Laden etwas ohne Laden abgehakt, merkt sich die Liste den Laden dafür.
// Reine Logik + kleiner Speicher; Oberfläche in components/shopping/ShopMode.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { compareText } from "@/lib/core/sort";
import type { ListItem } from "@/lib/einkauf/shoppingList";
import type { ShopChip } from "@/lib/einkauf/kacheln/view";

/** Gemerkter Chip der Einkaufsliste; „meist“ = früher „Nach Laden“ (der Laden mit den meisten Sachen) */
export type StoredChip = ShopChip | "meist";
type ViewState = { version: 2; chip: StoredChip };

const isChip = (c: unknown): c is StoredChip => c === "alle" || c === "ohne" || c === "meist" || (typeof c === "string" && c.startsWith("laden:") && c.length > 6);

/** v1 (bis 0.65): Ansicht „abteilung“/„laden“ → v2: Chip @public */
export function migrateShopView(raw: unknown): ViewState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; view?: unknown; chip?: unknown };
  if (r.version === 1) return { version: 2, chip: r.view === "laden" ? "meist" : "alle" };
  if (r.version === 2) return { version: 2, chip: isChip(r.chip) ? r.chip : "alle" };
  return null;
}

const viewStore = createLocalStore("wasgibts.einkaufsansicht", migrateShopView);

const loadChip = (): StoredChip => viewStore.load()?.chip ?? "alle";

/** Gemerkter Chip der Einkaufsliste (pro Gerät) */
export function useShopChip(): StoredChip {
  return useExternalStore(viewStore.subscribe, loadChip, () => "alle" as const);
}

export const setShopChip = (chip: ShopChip) => viewStore.save({ version: 2, chip });

const lower = (s: string) => s.trim().toLowerCase();

/** Link in den Einkaufsmodus */
export const shopModeHref = (shop: string) => `/einkaufsliste/laden?name=${encodeURIComponent(shop)}`;

export type ShopModeLists = {
  /** Gibt es hier (offen) */
  here: ListItem[];
  /** Ohne Laden – kann man hier mitnehmen */
  anywhere: ListItem[];
  /** Andere Läden (offen), meiste zuerst */
  elsewhere: { shop: string; names: string[] }[];
  /** Hier schon im Korb */
  done: ListItem[];
};

/** Liste für den Einkaufsmodus in einem Laden */
export function shopModeLists(items: ListItem[], shop: string): ShopModeLists {
  const visible = items.filter((i) => !i.hidden);
  const isHere = (i: ListItem) => lower(i.shop) === lower(shop);
  const open = visible.filter((i) => !i.checked);
  const other = new Map<string, string[]>();
  for (const i of open) if (i.shop && !isHere(i)) other.set(i.shop, [...(other.get(i.shop) ?? []), i.name]);
  return {
    here: open.filter(isHere),
    anywhere: open.filter((i) => !i.shop),
    elsewhere: [...other.entries()].map(([s, names]) => ({ shop: s, names })).sort((a, b) => b.names.length - a.names.length || compareText(a.shop, b.shop)),
    done: visible.filter((i) => i.checked && (isHere(i) || !i.shop)),
  };
}

/** Den Laden so schreiben, wie die Familie ihn kennt (Groß/klein egal) */
export function knownShop(name: string, shops: string[]): string | null {
  const n = lower(name).replace(/^(dem|der|den)\s+/, "");
  if (!n) return null;
  return shops.find((s) => lower(s) === n) ?? shops.find((s) => n.startsWith(lower(s)) && lower(s).length >= 3) ?? null;
}

/**
 * „Ich bin (jetzt) bei REWE“, „Ich geh zu Lidl einkaufen“, „Wir sind im Edeka“,
 * „Einkaufsmodus Aldi“ → Laden (nur bekannte Läden, kurze Sätze – „Ich steh im
 * REWE, Hack ist im Angebot“ bleibt die Supermarkt-Frage) @public
 */
export function shopModeRequest(text: string, shops: string[]): string | null {
  const t = text.trim().replace(/[.!?]+$/, "");
  if (t.split(/\s+/).length > 7 || /angebot|gibt'?s|was (kann|mach|soll)/i.test(t)) return null;
  const m =
    t.match(/^(?:ich bin|wir sind|bin)(?: jetzt| gerade| grad| gleich)? (?:bei|beim|im|in der|in|zu) (.+?)(?: einkaufen)?$/i) ??
    t.match(/^(?:ich gehe?|wir gehen|geh|gehe) (?:jetzt |gleich |gerade )?(?:zu|zum|zur|in den|in die|ins|bei) (.+?) einkaufen$/i) ??
    t.match(/^einkaufsmodus(?: für| bei)? (.+)$/i);
  return m ? knownShop(m[1], shops) : null;
}
