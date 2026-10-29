// Rätsel als Pakete (A-052): `content/raetsel/paket-001.json` (bis zu 500,
// kindertauglich, deutsch, je `{ id, frage, loesung }`), `paket-002.json` …
// Neue Pakete hinten dazulegen (Datei + eine Zeile hier). IDs `ra-NNN` sind
// fest (sie stehen in gespeicherten und geteilten Ständen, die ersten 55
// kamen aus der Wundertüte und behalten ihre ID).

import type { Paket } from "@/lib/wundertuete/vorrat";
import paket001 from "@/content/raetsel/paket-001.json";

/** Ein Rätsel, wie es im Paket steht (die Lösung mit genau einem **fetten** Wort) */
export type RaetselRoh = { id: string; frage: string; loesung: string };

/** Höchstens so viele Rätsel je Paket */
export const PAKET_GROESSE = 500;

/** Alle Pakete, ältestes zuerst */
export const RAETSEL_PAKETE = [paket001] as Paket<RaetselRoh>[];
