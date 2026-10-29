// Mias Wundertüte (A-022, neu mit A-052): drei Sorten – Witze, Plattdeutsch,
// Angeberwissen (Rätsel sind ein eigener Bereich, `lib/raetsel`). Je Sorte
// Kopf, Farbe aus der Kachel-Palette (Tafel 108, `data-tone`), Symbol und
// Wasserzeichen. Rein, ohne Oberfläche.

import type { Karte } from "@/lib/wundertuete/vorrat";

/** Die Sorten (feste Schlüssel, nie umbenennen: stehen in gespeicherten Ständen) */
export type Sorte = "witz" | "platt" | "angeberwissen";

export type Eintrag = Karte<Sorte>;

export type SorteMeta = {
  id: Sorte;
  /** Titel der Kachel (Tafel 140: Platt hat einen eigenen, sonst „Wundertüte“) */
  titel: string;
  /** Kleine Sorte über dem Text (bei Platt steckt sie schon im Titel) */
  label: string | null;
  /** Name im Filter der Seite */
  filter: string;
  /** Kurzform des Titels, wenn er nicht in die Zeile passt (nie „…“) */
  kurz: string;
  /** Symbol im Kopf und als Wasserzeichen (Tafel 140: Platt = Anker, sonst Geschenk) */
  symbol: "gift" | "anchor";
  /** Farbton der Palette (Tafel 108) und wessen Tokens er trägt */
  tone: "notizen" | "aufgaben" | "sport";
  /** Hat eine Lösung zum Aufdecken (sonst steht die Pointe gleich darunter) */
  frage: boolean;
  /** Quelle Pflicht (Fakten, Platt-Bedeutungen) – nie angezeigt */
  quellePflicht: boolean;
  /** Darf Mia per KI nachlegen? (nur Witze) */
  ki: boolean;
};

export const SORTEN: SorteMeta[] = [
  { id: "witz", titel: "Wundertüte", label: "Witz", filter: "Witze", kurz: "Wundertüte", symbol: "gift", tone: "notizen", frage: false, quellePflicht: false, ki: true },
  { id: "platt", titel: "Platt för Plietsche", label: null, filter: "Plattdeutsch", kurz: "Platt", symbol: "anchor", tone: "aufgaben", frage: true, quellePflicht: true, ki: false },
  { id: "angeberwissen", titel: "Wundertüte", label: "Angeberwissen", filter: "Angeberwissen", kurz: "Wundertüte", symbol: "gift", tone: "sport", frage: true, quellePflicht: true, ki: false },
];

export const SORTE_IDS: Sorte[] = SORTEN.map((s) => s.id);

export const sorteMeta = (id: Sorte): SorteMeta => SORTEN.find((s) => s.id === id)!;

/** Filter der Seite: Alles · Witze · Plattdeutsch · Angeberwissen */
export type Filter = "alles" | Sorte;
export const FILTER: { id: Filter; label: string }[] = [{ id: "alles", label: "Alles" }, ...SORTEN.map((s) => ({ id: s.id as Filter, label: s.filter }))];

/** Kachel unten bei Karten mit Lösung (die Seite zeigt sie dann groß) */
export const ANTIPPEN = "Antippen für die Lösung";

/** Nichts Ungesehenes mehr (und Mia hat gerade nichts Neues): nie eine Wiederholung */
export const KOMMT_BALD: Record<Filter, string> = {
  alles: "Neue Wundertüte kommt bald.",
  witz: "Neue Witze kommen bald.",
  platt: "Neues Plattdeutsch kommt bald.",
  angeberwissen: "Neues Angeberwissen kommt bald.",
};

/** Antwort in Teile: fett ist, was in **…** steht */
export function antwortTeile(text: string): { text: string; fett: boolean }[] {
  return text
    .split(/\*\*/)
    .map((t, i) => ({ text: t, fett: i % 2 === 1 }))
    .filter((t) => t.text);
}

/** Text ohne Fett-Zeichen (Vorlesen, Teilen, Mia) */
export const ohneFett = (text: string) => text.replace(/\*\*/g, "");

/** Text fürs Teilen-Menü: Karte und darunter „Von <Name>“ – ohne Gedankenstrich, ohne Fett-Zeichen */
export function teilText(x: Pick<Eintrag, "sorte" | "vorne" | "hinten">, name: string): string {
  const frage = x.sorte === "angeberwissen" ? `Wusstest du? ${x.vorne}` : x.vorne;
  return `${frage}\n${ohneFett(x.hinten ?? "")}\n\nVon ${name}`.trim();
}

/** Name in Kachel-Auswahl und „Mehr Funktionen“ (Tafel 116): „<Name>s Wundertüte“ */
export const wundertueteName = (helper: string) => `${helper}s Wundertüte`;
