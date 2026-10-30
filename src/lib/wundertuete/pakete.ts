// Inhalte der Wundertüte als Pakete (A-049/A-052): `content/wundertuete/
// paket-001.json` (bis zu 500 Karten: Witze, Plattdeutsch, Angeberwissen),
// `paket-002.json` … Neue Pakete werden hinten dazugelegt (Datei + eine Zeile
// hier; `tests/wundertuete/pakete.test.ts` merkt, wenn sie fehlt). Jede
// Karte hat eine feste ID, die sich nie ändert und nie neu vergeben wird.
// Paket 002 (A-068): jede Sorte hat mindestens 180 feste Karten; der
// KI-Nachschub ist danach nur noch Reserve für Witze und Rätsel. Neue Karten
// werden vorher gegen alle vorhandenen geprüft (`tests/wundertuete/paket002.test.ts`).

import type { Paket } from "@/lib/wundertuete/vorrat";
import type { Eintrag } from "@/lib/wundertuete/sorten";
import paket001 from "@/content/wundertuete/paket-001.json";
import paket002 from "@/content/wundertuete/paket-002.json";

/** Höchstens so viele Karten je Paket */
export const PAKET_GROESSE = 500;

/** Alle Pakete, ältestes zuerst */
export const PAKETE = [paket001, paket002] as Paket<Eintrag>[];
