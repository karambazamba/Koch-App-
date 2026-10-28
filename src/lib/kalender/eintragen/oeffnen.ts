// EIN Fenster „Neue Aufgabe“ und EIN Fenster „Neuer Termin“ (Tafel 114):
// jeder Einstieg (＋ auf der Startseiten-Kachel, ＋ oben auf der Aufgaben-
// bzw. Termin-Seite, ＋ im Kalender, Dein Tag, Beispiel-Tag, „Bearbeiten“)
// öffnet es NUR hierüber. Die Schnelleingabe (`core/schnelleingabe`) zeigt
// dann `AufgabeFenster` bzw. `TerminFenster` – ein anderes Formular gibt es nicht.

import { openQuick } from "@/lib/core/schnelleingabe";
import type { CalendarEntry } from "@/lib/kalender/model";

/** Neue Aufgabe (`date` = ab diesem Tag) bzw. neuer Termin (`date` = vorgewählter Tag) */
export const neuEintragen = (art: "aufgabe" | "termin", date?: string) => openQuick({ kind: art, ...(date ? { date } : {}) });

/** Bestehenden Eintrag im selben Fenster ändern */
export const eintragAendern = (entry: CalendarEntry) => openQuick({ kind: entry.typ, entry });
