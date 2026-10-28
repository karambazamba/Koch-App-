"use client";

// Raum später ändern (A-034) – EINE Stelle für Detail-Fenster, lange drücken
// und Mias Bestätigung: Raum setzen, Mia lernt das Stichwort, kurze Meldung
// mit „Rückgängig“ (auch „Mach das rückgängig“ bei Mia). Nur der Besitzer
// darf (eine fremde Familien-Aufgabe würde sonst bei ihm verschwinden).

import type { Room } from "@/lib/core/entries";
import { raumAktion, type Haushalt } from "@/lib/core/haushalt";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { isAboEntry } from "@/lib/kalender/abo/model";
import { darfRaumAendern } from "@/lib/kalender/abgeben/model";
import { setRoom, type CalendarEntry } from "@/lib/kalender/model";
import { raumLernen } from "@/lib/kalender/raum/gedaechtnis";
import { raumZumSpeichern } from "@/lib/kalender/raum/wahl";
import { changeEntries } from "@/lib/kalender/store";
import { myUserId } from "@/lib/konten/cache";

/** Darf man den Raum dieses Eintrags hier ändern? */
export const raumAenderbar = (entry: CalendarEntry) => !isAboEntry(entry) && darfRaumAendern(entry, myUserId());

/** Raum setzen; liefert den gespeicherten Raum (oder null, wenn nichts passiert ist) */
export function raumAendern(entry: CalendarEntry, gewaehlt: Room, haushalt: Haushalt): Room | null {
  if (!raumAenderbar(entry)) return null;
  const raum = raumZumSpeichern(gewaehlt, { art: entry.typ, vorher: entry.raum, vorschlag: entry.raum, haushalt });
  if (raum === entry.raum) return null;
  const undo = changeEntries((list, stamp) => setRoom(list, entry.id, raum, stamp));
  raumLernen(entry.data.title, raum);
  showToast({ text: raumAktion(raum, haushalt), undo: pushUndo(`den Raum von ${entry.data.title}`, undo), undoneText: "Wie vorher", seconds: 4, small: true });
  return raum;
}
