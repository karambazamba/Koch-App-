// Testmodus für Mias Modi mit eigener Vorschau: „Was ist da?“ (`[Im Haus] …`,
// Tafel 102) und „Einsprechen“ (`[Einkauf] …`, Tafel 110). Versteht mit
// denselben Verstehern wie die App ohne KI, ruft die echten Werkzeuge auf und
// sagt danach nur „Passt so?“.

import type Anthropic from "@anthropic-ai/sdk";
import { text, tools } from "@/lib/begleitung/mockShared";
import { imHausVerstehen, isImHausFrage } from "@/lib/vorrat/reinsprechen";
import { einkaufVerstehen, isEinkaufFrage } from "@/lib/einkauf/einsprechen";

/** Antwort im Modus oder null (dann geht es normal weiter) */
export function modusAntwort(last: unknown, intent: string, system: string, prevUses: string[]): Anthropic.Beta.BetaMessage | null {
  if (typeof last === "string" && isImHausFrage(last)) {
    const v = imHausVerstehen(last);
    const uses = [
      ...(v.rein.length ? [{ name: "vorrat_hinzufuegen", input: { sachen: v.rein.map((name) => ({ name })) } }] : []),
      ...(v.raus.length ? [{ name: "vorrat_aufgebraucht", input: { namen: v.raus } }] : []),
    ];
    return uses.length ? tools(uses) : text("Hab nichts zum Einräumen gehört. Sag einfach: Milch ist da, Thunfisch ist alle. (Testmodus)");
  }
  if (typeof last === "string" && isEinkaufFrage(last)) {
    const { sachen } = einkaufVerstehen(last, { products: {}, itemShops: {}, staples: [] });
    const woche = system.match(/wenn nichts gesagt wird: (\w+)/)?.[1] === "naechste" ? "naechste" : "aktuell";
    const artikel = sachen.map((s) => ({ name: s.name, ...(s.amount ? { menge: s.amount } : {}), ...(s.shop ? { laden: s.shop } : {}) }));
    return artikel.length ? tools([{ name: "einkaufsliste_hinzufuegen", input: { woche, artikel } }]) : text("Hab nichts für die Liste gehört. Zähl einfach auf: Milch, Brot, Klopapier. (Testmodus)");
  }
  if (isImHausFrage(intent) && prevUses.some((u) => u === "vorrat_hinzufuegen" || u === "vorrat_aufgebraucht")) return text("Passt so? (Testmodus)");
  if (isEinkaufFrage(intent) && prevUses.includes("einkaufsliste_hinzufuegen")) return text("Passt so? (Testmodus)");
  return null;
}
