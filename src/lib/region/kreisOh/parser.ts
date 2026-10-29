// Kreis Ostholstein, Veranstaltungskalender: HTML → Rohdaten.
//
// ┌──────────────────────────────────────────────────────────────────────┐
// │ WARTET AUF ECHTE BEISPIELSEITEN.                                     │
// │ www.kreis-oh.de ist aus der Arbeitsumgebung gesperrt (Netz-Regel),   │
// │ die HTML-Struktur ist deshalb unbekannt. Bis gespeicherte Seiten     │
// │ unter tests/fixtures/kreis-oh/ liegen (Liste ofs_1=0, ofs_1=25,      │
// │ eine Detailseite), liefern `parseListe` und `parseDetail` sicher     │
// │ NICHTS. Dann greift „0 Treffer → alte Daten bleiben, Hinweis im      │
// │ Entwickler-Bereich, Kreis bleibt ausgeblendet“. Nichts hier raten!   │
// └──────────────────────────────────────────────────────────────────────┘
//
// Was schon steht und nicht vom HTML abhängt: die ID aus dem Link
// (FID=3906.<id>.1), Adressen/Blättern (urls.ts), Text-Auswertung für
// Datum/Uhrzeit (../zeit.ts), Ort (../orte.ts) und Kategorie
// (../kategorien.ts). Der Parser muss nur Text-Stücke je Eintrag liefern.

/** Ein Eintrag der Liste – nur Text, ausgewertet wird in abruf.ts */
export type ListenEintrag = {
  /** Aus FID=3906.<id>.1 */
  id: string;
  titel: string;
  /** z. B. „Do, 29.10.2026“ oder „29.10.2026 bis 15.11.2026“ */
  datumText: string;
  /** z. B. „10:00 – 12:00 Uhr“, „ganztägig“; null = steht im Datumstext bzw. nur im Detail */
  zeitText: string | null;
  ortText: string | null;
  /** Art der Veranstaltung, falls die Seite sie nennt (für die Kategorie) */
  artText: string | null;
  /** Absoluter Link zur Detailseite */
  link: string;
};

export type ListenSeite = { eintraege: ListenEintrag[]; weiter: boolean };

export type DetailEintrag = Omit<ListenEintrag, "link">;

/** Ist der Parser an echten Seiten gebaut? Solange false: nichts abrufen (siehe abruf.ts) */
export const PARSER_BEREIT = false;

/** @public ID aus einem Link mit FID=3906.<id>.1 (auch URL-kodiert); null = keiner – für parseListe, sobald echte Seiten da sind */
export function idAusLink(href: string): string | null {
  let text = href;
  try {
    text = decodeURIComponent(href);
  } catch {
    // kaputt kodiert: so lassen
  }
  const m = text.match(/FID=3906\.(\d{1,12})\.1(?!\d)/);
  return m ? m[1] : null;
}

/** Listen-Seite → Einträge + „gibt es eine nächste Seite?“ (WARTET AUF ECHTE BEISPIELSEITEN) */
export function parseListe(html: string): ListenSeite {
  // Absichtlich leer, bis echte Seiten vorliegen: lieber nichts als Falsches.
  void html;
  return { eintraege: [], weiter: false };
}

/** Detailseite → Text-Stücke (WARTET AUF ECHTE BEISPIELSEITEN) */
export function parseDetail(html: string): DetailEintrag | null {
  void html;
  return null;
}
