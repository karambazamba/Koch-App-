// „Was ich mir gemerkt hab“ (Einstellungen → Mia): eine Liste aus Mustern und
// Antworten, Essens-Rituale, festen Laden-Regeln (einkauf/shopRules) und
// gelernten Räumen („Zahnarzt“ → Nur ich, A-034, kalender/raum/gedaechtnis)
// und gelernten Läden („Tomaten → Rewe“, A-041, beim Abhaken gemerkt –
// eigene Gruppe; was eine feste Regel hat, steht schon unter „Läden“).
// Vorstellungen und erste Besuche stehen nicht drin – das ist nur Technik. Rein.

import type { DenktState } from "@/lib/mia/denktmit/store";
import type { RaumWort } from "@/lib/kalender/raum/raten";

/** Gelernter Laden (aus `einkauf/merken` `gelerntListe`) */
type GelernterLaden = { key: string; sache: string; shop: string };

export type MerkEintrag = { art: "antwort" | "ritual" | "laden" | "raum" | "gelernt"; key: string; gruppe: (typeof MERK_GRUPPEN)[number]; titel: string; wert: string };

/** Gruppen der Seite in dieser Reihenfolge */
export const MERK_GRUPPEN = ["Gewohnheiten", "Läden", "Wo du was kaufst", "Wer was sieht"] as const;

const RAUM_WERT: Record<RaumWort["raum"], string> = { familie: "Für Familie", ich: "Nur ich", arbeit: "Arbeit" };

const TAGE = ["Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function merkListe(s: DenktState, shopRules: Record<string, string>, raumWorte: readonly RaumWort[] = [], gelernt: readonly GelernterLaden[] = []): MerkEintrag[] {
  const out: MerkEintrag[] = [];
  for (const r of s.rituale) out.push({ art: "ritual", key: String(r.weekday), gruppe: "Gewohnheiten", titel: `${TAGE[r.weekday]} ${r.title}`, wert: "Plan ich fest ein" });
  for (const [key, a] of Object.entries(s.antworten)) {
    // Mitdenken-Fragen gelten nur für einen Tag – nicht aufheben, nicht zeigen
    if (!key.startsWith("muster:") && !key.startsWith("essen:")) continue;
    if (key.startsWith("essen:") && a.antwort === "ja") continue;
    out.push({ art: "antwort", key, gruppe: "Gewohnheiten", titel: a.satz.split(".")[0] || key, wert: a.antwort === "ja" ? "Steht jede Woche drin" : "Frag ich nicht mehr" });
  }
  for (const [item, shop] of Object.entries(shopRules)) if (shop) out.push({ art: "laden", key: item, gruppe: "Läden", titel: cap(item), wert: shop });
  const regel = new Set(Object.keys(shopRules).map((k) => k.toLowerCase()));
  for (const g of gelernt) if (!regel.has(g.key.toLowerCase())) out.push({ art: "gelernt", key: g.key, gruppe: "Wo du was kaufst", titel: `${g.sache} → ${g.shop}`, wert: "" });
  for (const w of raumWorte) out.push({ art: "raum", key: w.wort, gruppe: "Wer was sieht", titel: cap(w.wort), wert: RAUM_WERT[w.raum] });
  return out;
}
