// Kalender-Text eines Abos → seine Termine (ab heute, feste ids, besitzer
// "abo:<id>"). Eigene Datei, damit der Parser erst beim Abruf geladen wird.

import type { CalendarEntry } from "@/lib/kalender/model";
import { parseIcs } from "@/lib/kalender/import/ics";
import { planImport } from "@/lib/kalender/import/plan";
import { ABO_PREFIX, type Abo } from "@/lib/kalender/abo/model";

/** Kalender-Text → Termine des Abos (ab heute, feste ids); null = kein Kalender */
export function feedEntries(abo: Pick<Abo, "id" | "raum">, text: string, today: string): { entries: CalendarEntry[]; name: string | null } | null {
  const cal = parseIcs(text);
  if (!cal) return null;
  const { entries } = planImport([cal], { range: "ab-heute", today, rooms: [abo.raum] });
  return {
    name: cal.name,
    entries: entries.map((e) => ({ ...e, id: `${ABO_PREFIX}${abo.id}:${e.typ === "termin" ? e.data.source?.uid : e.id}`, besitzer: `${ABO_PREFIX}${abo.id}` })),
  };
}

