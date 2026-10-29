// Wundertüte mit Rätseln (A-064): Rätsel sind die vierte Sorte (Witz · Platt
// · Wissen · Rätsel). Die Rätsel behalten ihren eigenen Vorrat (`lib/raetsel`,
// Paket 001 als Quelle, `wasgibts.raetsel` mit „gesehen“ und Mias Nachschub)
// – hier wird nur gemischt, rein und testbar:
// - Die Kachel wechselt die Sorten der Reihe nach (nach einem Witz kommt
//   Platt, dann Wissen, dann ein Rätsel …); Sorten ohne Ungesehenes fallen
//   aus der Reihe. Karten mit passendem Anlass (Regen, Gericht …) kommen
//   innerhalb ihrer Sorte zuerst. Nie doppelt: was gezogen wird, gilt im jeweiligen Vorrat
//   als gesehen.
// - Filter „Rätsel“ auf der Seite zieht nur Rätsel, die anderen nur ihre Sorte.

import { RT_POOL, raetselVon, type RtStand } from "@/lib/raetsel/auswahl";
import { karteVon, naechste, passt, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { WT_POOL } from "@/lib/wundertuete/pool";
import { SORTE_IDS, type Eintrag, type Filter, type Sorte } from "@/lib/wundertuete/sorten";
import { merke, ungesehen, ziehe } from "@/lib/wundertuete/vorrat";

export type Beide = { wt: WtStand; rt: RtStand };

/** Die aktuelle Karte (aus der Wundertüte oder ein Rätsel) */
export function karteMix(b: Beide): Eintrag | undefined {
  const a = b.wt.aktuell;
  if (!a) return undefined;
  return a.raetsel ? raetselVon(b.rt, a.id) : karteVon(b.wt, a.id);
}

/** Ein Rätsel ziehen und als aktuelle Karte setzen */
function raetselZiehen(b: Beide, lage: Lage): { beide: Beide; karte: Eintrag } | null {
  const r = ziehe(RT_POOL, b.rt, { vorher: b.wt.aktuell?.raetsel ? b.wt.aktuell.id : null });
  if (!r) return null;
  return { beide: { wt: { ...b.wt, aktuell: { id: r.id, tag: lage.heute, raetsel: true } }, rt: merke({ ...b.rt, aktuell: { id: r.id, geloest: false } }, r.id) }, karte: r };
}

/** Eine Karte einer Wundertüten-Sorte ziehen */
function wtZiehen(b: Beide, lage: Lage, sorte: Sorte): { beide: Beide; karte: Eintrag } | null {
  const vorher = b.wt.aktuell?.raetsel ? null : b.wt.aktuell?.id;
  const k = ziehe(WT_POOL, b.wt, { filter: (x) => x.sorte === sorte, passt: (x) => passt(x, lage), vorher });
  if (!k) return null;
  return { beide: { ...b, wt: merke({ ...b.wt, aktuell: { id: k.id, tag: lage.heute } }, k.id) }, karte: k };
}

/**
 * „Noch eine ›“ bzw. die nächste Karte der Kachel: im Filter „Alles“ die
 * nächste Sorte nach der eben gezeigten (der Reihe nach, nie dieselbe Sorte
 * zweimal hintereinander, solange eine andere da ist). Nichts mehr da:
 * `karte` null, die aktuelle Karte fällt weg (sie wäre eine Wiederholung).
 */
export function naechsteMix(b: Beide, lage: Lage, filter: Filter = "alles"): { beide: Beide; karte: Eintrag | null } {
  if (filter === "raetsel") {
    const r = raetselZiehen(b, lage);
    return r ?? { beide: { ...b, wt: { ...b.wt, aktuell: null } }, karte: null };
  }
  if (filter !== "alles") {
    const r = naechste(b.wt, lage, filter);
    return { beide: { ...b, wt: r.stand }, karte: r.karte };
  }
  // Streng der Reihe nach; Karten mit passendem Anlass (Regen, Gericht …) kommen
  // innerhalb ihrer Sorte zuerst (`ziehe`)
  const vorher = karteMix(b)?.sorte;
  const start = vorher ? SORTE_IDS.indexOf(vorher) + 1 : 0;
  for (let i = 0; i < SORTE_IDS.length; i++) {
    const sorte = SORTE_IDS[(start + i) % SORTE_IDS.length];
    const r = sorte === "raetsel" ? raetselZiehen(b, lage) : wtZiehen(b, lage, sorte);
    if (r) return r;
  }
  return { beide: { ...b, wt: { ...b.wt, aktuell: null } }, karte: null };
}

/** Gibt es irgendwo noch Ungesehenes (für „kommt bald“)? */
const hatUngesehenes = (b: Beide, lage: Lage) => ungesehen(WT_POOL, b.wt, (x) => passt(x, lage)).length > 0 || ungesehen(RT_POOL, b.rt).length > 0;

/** Kachel wird gezeigt: am selben Tag bleibt die aktuelle Karte, an einem neuen Tag kommt die nächste */
export function tageskarteMix(b: Beide, lage: Lage): Beide {
  if (b.wt.aktuell?.tag === lage.heute && karteMix(b)) return b;
  // Alles gesehen und schon „kommt bald“: so lassen (nichts zu speichern)
  if (!b.wt.aktuell && b.wt.gesehen.length && !hatUngesehenes(b, lage)) return b;
  return naechsteMix(b, lage).beide;
}
