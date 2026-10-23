// Antworten auf der Pinnwand (Tafel 70): die neue Nachricht trägt ein kurzes
// Zitat der alten (bei Sprachnachrichten „Sprachnachricht“). Rein.

import type { PinQuote } from "@/lib/pinnwand/model";

export function quoteOf(item: { id: string; data: { author: string; text?: string } }): PinQuote {
  return { id: item.id, author: item.data.author, text: (item.data.text ?? "Sprachnachricht").slice(0, 80) };
}
