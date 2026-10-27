// „Was Mia sich merkt“ (Einstellungen → Mia): eine Liste aus Mustern und
// Antworten, Essens-Rituale und festen Laden-Regeln (einkauf/shopRules).
// Vorstellungen und erste Besuche stehen nicht drin – das ist nur Technik. Rein.

import type { DenktState } from "@/lib/mia/denktmit/store";

export type MerkEintrag = { art: "antwort" | "ritual" | "laden"; key: string; gruppe: "Gewohnheiten" | "Läden"; titel: string; wert: string };

const TAGE = ["Montags", "Dienstags", "Mittwochs", "Donnerstags", "Freitags", "Samstags", "Sonntags"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function merkListe(s: DenktState, shopRules: Record<string, string>): MerkEintrag[] {
  const out: MerkEintrag[] = [];
  for (const r of s.rituale) out.push({ art: "ritual", key: String(r.weekday), gruppe: "Gewohnheiten", titel: `${TAGE[r.weekday]} ${r.title}`, wert: "Plan ich fest ein" });
  for (const [key, a] of Object.entries(s.antworten)) {
    // Mitdenken-Fragen gelten nur für einen Tag – nicht aufheben, nicht zeigen
    if (!key.startsWith("muster:") && !key.startsWith("essen:")) continue;
    if (key.startsWith("essen:") && a.antwort === "ja") continue;
    out.push({ art: "antwort", key, gruppe: "Gewohnheiten", titel: a.satz.split(".")[0] || key, wert: a.antwort === "ja" ? "Steht jede Woche drin" : "Frag ich nicht mehr" });
  }
  for (const [item, shop] of Object.entries(shopRules)) if (shop) out.push({ art: "laden", key: item, gruppe: "Läden", titel: cap(item), wert: shop });
  return out;
}
