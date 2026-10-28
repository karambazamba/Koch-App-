// Einkauf nach Läden: der gemerkte Laden (pro Gerät – seit „Einkauf neu“ der
// aktive Laden in „Aussuchen“; früher der Chip der Liste, gleiches Format),
// der Weg auf die Laden-Seite unterwegs und „Ich bin bei REWE“ erkennen.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
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

/** Gemerkter Laden (pro Gerät): „laden:Rewe“ = aktiver Laden in „Aussuchen“ */
export function useShopChip(): StoredChip {
  return useExternalStore(viewStore.subscribe, loadChip, () => "alle" as const);
}

export const setShopChip = (chip: ShopChip) => viewStore.save({ version: 2, chip });

const lower = (s: string) => s.trim().toLowerCase();

/** Unterwegs in den Laden („Ich bin bei REWE“, „Auf dem Heimweg?“): Laden-Seite, der Einkauf beginnt gleich */
export const shopModeHref = (shop: string) => `/einkaufsliste/laden?name=${encodeURIComponent(shop)}&unterwegs=1`;

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
