// Touristische Landesdatenbank Schleswig-Holstein (TLDB-SH, Tourismus-Agentur
// SH, Zugang über infomax). GERÜST – wird angeschlossen, sobald der Zugang da
// ist. Zugangsdaten nur als Umgebungsvariablen in Vercel (TIPS_API_KEY,
// TIPS_API_URL), nie im Code, nie im Client.
//
// Erwartetes Format (zu klären mit infomax, siehe Fragen im PR):
// - Abruf je Zeitraum + Gebiet (bbox oder Landkreise), seitenweise
// - je Veranstaltung: ID, Titel, Kurz-/Langtext, Termine (Beginn/Ende, ganztägig,
//   Serien als Einzeltermine?), Ort (Name, Adresse, Koordinaten), Kategorien,
//   Zielgruppe (Kinder/Familie, Alter), drinnen/draußen, Eintritt (kostenlos/
//   Preis-Text), Veranstalter, Link, Lizenz (CC0/CC BY/CC BY-SA) + Urheber,
//   Bild-URL mit eigener Lizenz, Änderungsdatum
// Zuordnung der Kategorien: ../categories.ts (CATEGORY_MAP).

import type { Tip } from "@/lib/tipps/model";
import type { TipArea, TipSource } from "@/lib/tipps/sources/types";

export class TldbTipSource implements TipSource {
  readonly id = "tldb" as const;

  constructor(private readonly url = process.env.TIPS_API_URL, private readonly key = process.env.TIPS_API_KEY) {}

  async fetchRange(von: string, bis: string, gebiet: TipArea): Promise<Tip[]> {
    if (!this.url || !this.key) return [];
    // TODO: Abruf (von, bis, gebiet.bbox) mit this.key, Seiten durchgehen und
    // jeden Eintrag mit toTip() umwandeln. Nur offen lizenzierte Einträge
    // übernehmen (nearTips filtert zusätzlich).
    void von;
    void bis;
    void gebiet;
    return [];
  }
}

/** @public Ein Eintrag der Landesdatenbank → Tip (Feldnamen folgen, sobald das Format feststeht) */
export function toTip(raw: Record<string, unknown>, stamp: string): Tip | null {
  void raw;
  void stamp;
  // TODO: Felder zuordnen (siehe Kommentar oben)
  return null;
}
