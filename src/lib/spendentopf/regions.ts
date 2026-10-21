// Spendentopf: Regionen und Projekte als Datensätze – Feldnamen wie die
// späteren Supabase-Tabellen `regions` und `pot_projects`. Eine neue Region
// wird nur hier (später in der Tabelle) freigeschaltet – kein neuer Code.
// Solange es keine Konten gibt, sind Betrag und Stimmen Beispielwerte
// (`beispiel: true`) und werden in der App als Beispiel gekennzeichnet.

export type RegionStatus = "aktiv" | "bald" | "sucht_paten";

export type Region = {
  id: string;
  name: string;
  /** PLZ-Anfänge (z. B. "237" = 237xx) */
  plz_list: string[];
  /** Orte, an denen die Region am Wetter-Ort erkannt wird */
  orte: string[];
  status: RegionStatus;
  pate_name: string | null;
  pate_text: string | null;
  /** Leer = Anzeige „Stiftung vor Ort“ */
  stiftung_name: string | null;
  /** Bisher im Topf in diesem Jahr (Euro) */
  bisher: number;
  beispiel?: boolean;
  /** Eine Zeile Info in „Region wählen“ */
  info: string;
};

export type PotProject = { id: string; region_id: string; jahr: number; titel: string; icon: "ball" | "book" | "flame" | "heart" | "tree"; kurztext: string; stimmen: number };

const KARAMBA = "KARAMBA";
export const PATE_MAIL = "mia@karamba-eis.de";
/** Wohin Beiträge gehen, solange die eigene Region noch keinen Topf hat */
export const FALLBACK_REGION = "ostholstein";

export const REGIONS: Region[] = [
  {
    id: "ostholstein",
    name: "Ostholstein",
    plz_list: ["2363", "2366", "2368", "2369", "2370", "2371", "2372", "2373", "2374", "2375", "2376", "2377"],
    orte: ["Eutin", "Malente", "Bad Malente", "Neustadt in Holstein", "Scharbeutz", "Timmendorfer Strand", "Bad Schwartau", "Ratekau", "Grömitz", "Oldenburg in Holstein", "Fehmarn", "Heiligenhafen", "Lensahn", "Süsel", "Ahrensbök"],
    status: "aktiv",
    pate_name: KARAMBA,
    pate_text: "schlägt Projekte vor, übergibt am 12. Dezember",
    stiftung_name: null,
    bisher: 2344,
    beispiel: true,
    info: "Topf läuft – abstimmen im November",
  },
  { id: "ploen", name: "Kreis Plön", plz_list: ["2421", "2422", "2423", "2430", "2432"], orte: ["Plön", "Preetz", "Lütjenburg", "Schönberg"], status: "bald", pate_name: null, pate_text: null, stiftung_name: null, bisher: 0, info: "Pate gefunden – Topf startet bald" },
  { id: "luebeck", name: "Lübeck", plz_list: ["235"], orte: ["Lübeck", "Travemünde"], status: "bald", pate_name: null, pate_text: null, stiftung_name: null, bisher: 0, info: "Stiftung gefunden – Topf startet bald" },
  { id: "kiel", name: "Kiel", plz_list: ["241"], orte: ["Kiel"], status: "sucht_paten", pate_name: null, pate_text: null, stiftung_name: null, bisher: 0, info: "Sucht einen Paten vor Ort" },
  { id: "hamburg-nord", name: "Hamburg-Nord", plz_list: ["222", "223", "224"], orte: ["Hamburg", "Barmbek", "Winterhude", "Eppendorf", "Langenhorn", "Fuhlsbüttel", "Ohlsdorf", "Alsterdorf", "Uhlenhorst"], status: "sucht_paten", pate_name: null, pate_text: null, stiftung_name: null, bisher: 0, info: "Sucht einen Paten vor Ort" },
];

export const POT_PROJECTS: PotProject[] = [
  { id: "oh-bolzplatz", region_id: "ostholstein", jahr: 2026, titel: "Neue Tore für den Bolzplatz", icon: "ball", kurztext: "Damit nach der Schule wieder gekickt wird", stimmen: 41 },
  { id: "oh-lese-ecke", region_id: "ostholstein", jahr: 2026, titel: "Lese-Ecke in der Kita", icon: "book", kurztext: "Kissen, Regal und viele neue Bücher", stimmen: 33 },
  { id: "oh-jugendfeuerwehr", region_id: "ostholstein", jahr: 2026, titel: "Jugendfeuerwehr: Zeltlager", icon: "flame", kurztext: "Ein Wochenende Zeltlager für alle", stimmen: 26 },
];

/** Zeitplan je Jahr (Tag im Jahr, konfigurierbar) */
export const SCHEDULE = { vorschlagenVon: "11-01", vorschlagenBis: "11-14", abstimmenVon: "11-15", abstimmenBis: "11-30", uebergabe: "12-12" };
