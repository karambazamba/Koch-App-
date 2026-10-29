// Einkauf: Sätze für ganze Sorten (A-067), rein – ohne KI und für den
// Prüfstand. „Getränke kaufe ich bei Edeka“, „Obst kaufe ich auf dem Markt
// und bei Rewe“, „Fleisch hole ich beim Schlachter“, „Ich kaufe Drogerie bei
// dm“. Einzelne Sachen („Milch immer bei Rewe“) bleiben bei `parseShopRule`.

import { laedenAusSatz } from "@/lib/einkauf/sorten/plan";
import { sorteAusWort, type SorteId } from "@/lib/einkauf/sorten/sorten";

const ORT = String.raw`(?:immer\s+|nur\s+|meist(?:ens)?\s+|ab jetzt\s+)?(?:bei|beim|im|in der|auf dem|aufm|vom)\s+.+`;

/** Sorte und Läden aus einem Satz; null = keine Sorten-Regel */
export function parseSorteRegel(text: string, bekannt: readonly string[] = []): { sorte: SorteId; laeden: string[] } | null {
  const t = text.trim().replace(/[.!]+$/, "");
  const m =
    t.match(new RegExp(String.raw`^(?:ich|wir)\s+(?:kauf|hol|besorg)\w*\s+(.+?)\s+(${ORT})$`, "i")) ??
    t.match(new RegExp(String.raw`^(.+?)\s+(?:(?:kauf|hol|besorg)\w*\s+(?:ich|wir)\s+|gibt'?s\s+|gibt es\s+)?(${ORT})$`, "i"));
  if (!m) return null;
  const sorte = sorteAusWort(m[1]);
  if (!sorte) return null;
  const laeden = laedenAusSatz(m[2].replace(/^(?:immer|nur|meist(?:ens)?|ab jetzt)\s+/i, ""), bekannt);
  return laeden.length ? { sorte, laeden } : null;
}
