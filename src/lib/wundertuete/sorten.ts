// Mias Wundertüte (A-022, Tafel 116): sieben Sorten, je mit eigenem Kopf
// (lucide-Symbol + Name in Großbuchstaben), Farbe aus der Kachel-Palette
// (Tafel 108, über `data-tone` = Tokens `--app-tile-<kachel>`), kurzem
// Hinweis unten links und Tageszeit. Rein, ohne Oberfläche.

/** Die sieben Sorten (feste Schlüssel, nie umbenennen: stehen in gespeicherten IDs) */
export type Sorte = "angeberwissen" | "platt" | "raetsel" | "heute100" | "tischrunde" | "schaetzmal" | "werzuerst";

/** Anlass: der Eintrag kommt NUR, wenn er passt (und dann zuerst) */
export type Anlass = {
  /** Wetter heute (Regen inkl. Niesel/Schauer/Gewitter) */
  wetter?: "regen" | "schnee" | "sonne";
  saison?: "fruehling" | "sommer" | "herbst" | "winter";
  /** 0 = Sonntag … 6 = Samstag */
  wochentag?: number;
  /** Stichwörter im Gericht des Tages (klein geschrieben, Teilwort genügt) */
  gericht?: string[];
  /** Name des Feiertags (Teilwort, z. B. „Neujahr“) */
  feiertag?: string;
};

/**
 * Ein Eintrag der Wundertüte. `hinten` = Antwort (genau EIN Wort/eine Zahl in
 * **…** = fett), fehlt bei Tischrunde und Wer zuerst. `quelle` = Pflicht bei
 * Fakten, Zahlen und Jahrestagen (Angeberwissen, Platt, Schätz mal, Heute vor
 * 100 Jahren); wird nie angezeigt. `tag` = „MM-TT“ und `jahr` (nur Heute vor 100 Jahren).
 */
export type Eintrag = {
  id: string;
  sorte: Sorte;
  vorne: string;
  hinten?: string;
  quelle?: string;
  anlass?: Anlass;
  tag?: string;
  /** Jahr des Ereignisses (Heute vor 100 Jahren: nur im Jahr `jahr` + 100) */
  jahr?: number;
};

export type SorteMeta = {
  id: Sorte;
  /** Name im Kopf (Anzeige in Großbuchstaben über TILE_LABEL) */
  name: string;
  /** Kurzform im Kopf, wenn der Name nicht ganz in die Zeile passt (S auf schmalen Handys; nie „…“) */
  kurz: string;
  /** Symbol (lucide), aufgelöst in der Kachel */
  symbol: "lightbulb" | "anchor" | "puzzle" | "calendar" | "message" | "scale" | "dice";
  /** Farbton der Palette (Tafel 108) und wessen Tokens er trägt (`data-tone`) */
  farbe: "flieder" | "mint" | "vanille" | "sand" | "pfirsich" | "lavendel" | "rose";
  tone: "sport" | "aufgaben" | "notizen" | "timer" | "essen" | "termine" | "pinnwand";
  /** Kurzer Hinweis unten links */
  hinweis: string;
  /** Noch kürzer, wenn die Frage sonst auf ganz schmalen Handys nicht ganz passt (nur wo der Hinweis lang ist) */
  hinweisKurz?: string;
  /** tags = 6–17 Uhr, abends = ab 17 Uhr (nur zu zweit/Familie), immer = am belegten Tag */
  zeit: "tags" | "abends" | "immer";
  /** Hat eine Rückseite (Antwort)? Ohne: Antippen = nächste Karte */
  rueckseite: boolean;
  /** Quelle Pflicht (Fakten, Zahlen, Jahrestage, Platt-Bedeutungen) */
  quellePflicht: boolean;
};

export const SORTEN: SorteMeta[] = [
  { id: "angeberwissen", name: "Angeberwissen", kurz: "Wissen", symbol: "lightbulb", farbe: "flieder", tone: "sport", hinweis: "Tagsüber", zeit: "tags", rueckseite: true, quellePflicht: true },
  { id: "platt", name: "Platt för Plietsche", kurz: "Platt", symbol: "anchor", farbe: "mint", tone: "aufgaben", hinweis: "„Plietsch“ = schlau", zeit: "tags", rueckseite: true, quellePflicht: true },
  { id: "raetsel", name: "Rätselstunde", kurz: "Rätsel", symbol: "puzzle", farbe: "vanille", tone: "notizen", hinweis: "Kinder raten zuerst", zeit: "tags", rueckseite: true, quellePflicht: false },
  { id: "heute100", name: "Heute vor 100 Jahren", kurz: "Damals", symbol: "calendar", farbe: "sand", tone: "timer", hinweis: "Zum Staunen", zeit: "immer", rueckseite: true, quellePflicht: true },
  { id: "tischrunde", name: "Tischrunde", kurz: "Tischrunde", symbol: "message", farbe: "pfirsich", tone: "essen", hinweis: "Abends, zum Essen", zeit: "abends", rueckseite: false, quellePflicht: false },
  { id: "schaetzmal", name: "Schätz mal!", kurz: "Schätz mal!", symbol: "scale", farbe: "lavendel", tone: "termine", hinweis: "Wer am nächsten dran ist, gewinnt", hinweisKurz: "Am nächsten dran gewinnt", zeit: "abends", rueckseite: true, quellePflicht: true },
  { id: "werzuerst", name: "Wer zuerst", kurz: "Wer zuerst", symbol: "dice", farbe: "rose", tone: "pinnwand", hinweis: "Mini-Spiel, 1 Minute", zeit: "abends", rueckseite: false, quellePflicht: false },
];

export const SORTE_IDS: Sorte[] = SORTEN.map((s) => s.id);

export const sorteMeta = (id: Sorte): SorteMeta => SORTEN.find((s) => s.id === id)!;

/** Hinweis unten links: Angeberwissen abends (allein) nicht „Tagsüber“ */
export const hinweisFuer = (id: Sorte, abends: boolean) => (id === "angeberwissen" && abends ? "Zum Weitererzählen" : sorteMeta(id).hinweis);

/** Kurzform des Hinweises (gleich dem Hinweis, wo es keine gibt) */
export const hinweisKurzFuer = (id: Sorte, abends: boolean) => sorteMeta(id).hinweisKurz ?? hinweisFuer(id, abends);

/** Antwort in Teile: fett ist, was in **…** steht */
export function antwortTeile(text: string): { text: string; fett: boolean }[] {
  return text
    .split(/\*\*/)
    .map((t, i) => ({ text: t, fett: i % 2 === 1 }))
    .filter((t) => t.text);
}

/** Text ohne Fett-Zeichen (Vorlesen, Teilen, Mia) */
export const ohneFett = (text: string) => text.replace(/\*\*/g, "");

/**
 * Text fürs Teilen-Menü (Rückseite): „Wusstest du? Frage Antwort“ und
 * darunter „Von <Name>“ – ohne Gedankenstrich, ohne Fett-Zeichen.
 */
export function teilText(x: Eintrag, name: string): string {
  const frage = x.sorte === "raetsel" ? `Rätsel: ${x.vorne}` : `Wusstest du? ${x.vorne}`;
  return `${frage}\n${ohneFett(x.hinten ?? "")}\n\nVon ${name}`.trim();
}

/** Name in Kachel-Auswahl und „Mehr Funktionen“ (Tafel 116): „<Name>s Wundertüte“ */
export const wundertueteName = (helper: string) => `${helper}s Wundertüte`;
