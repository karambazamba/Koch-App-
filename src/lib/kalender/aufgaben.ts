// Aufgaben: alles ist heute, eine Liste, Arbeit nur als Schild (Tafel 103/104).
// EINE Stelle für Aufgaben-Seite, Startseiten-Kachel und Mia:
// - Kopfzeile „Heute · Mi 28. Okt“ (nach Feierabend „Heute Abend · Feierabend“).
// - Filter „Alle · Familie · Arbeit“ nur, wenn es heute Arbeitsaufgaben gibt;
//   die Wahl merkt sich das Gerät (`aufgabenFilter.ts`). Gefiltert steht
//   unten leise „Familie · 5 ausgeblendet“.
// - Nach Feierabend (bzw. an freien Tagen) ruht die Arbeit: ohne Chips, unten
//   leise „Arbeit · 5 für morgen“ – antippen blendet sie kurz ein.
// - Mia: „Was steht heute an?“ nennt kurz die Zahl und die ersten drei.
// Rein.

import { headerDate } from "@/lib/heute/kopfDatum";
import type { DayItem } from "@/lib/kalender/model";

export type AufgabenFilter = "alle" | "familie" | "arbeit";

/** „Heute · Mi 28. Okt“ bzw. nach Feierabend „Heute Abend · Feierabend“ */
export function aufgabenKopf(today: string, feierabend: boolean): string {
  return feierabend ? "Heute Abend · Feierabend" : `Heute · ${headerDate(new Date(`${today}T12:00:00Z`)).replace(",", "")}`;
}

export type AufgabenAnsicht = {
  /** Was in der einen Liste steht */
  items: DayItem[];
  /** Chips „Alle · Familie · Arbeit“ zeigen? */
  chips: boolean;
  /** Wirksamer Filter (ohne Arbeitsaufgaben immer „alle“) */
  filter: AufgabenFilter;
  /** Durch den Filter ausgeblendet */
  ausgeblendet: number;
  /** Nach Feierabend ausgeblendete Arbeitsaufgaben („Arbeit · n für morgen“) */
  arbeitMorgen: number;
};

/**
 * Die eine Liste: gefiltert nach Raum (nur, wenn es Arbeitsaufgaben gibt),
 * nach Feierabend ohne Arbeit – außer man blendet sie kurz ein.
 */
export function aufgabenAnsicht(items: DayItem[], o: { filter: AufgabenFilter; arbeitRuht: boolean; arbeitZeigen?: boolean }): AufgabenAnsicht {
  const arbeit = items.filter((i) => i.room === "arbeit").length;
  if (o.arbeitRuht) return { items: o.arbeitZeigen ? items : items.filter((i) => i.room !== "arbeit"), chips: false, filter: "alle", ausgeblendet: 0, arbeitMorgen: arbeit };
  if (!arbeit || o.filter === "alle") return { items, chips: arbeit > 0, filter: "alle", ausgeblendet: 0, arbeitMorgen: 0 };
  const shown = items.filter((i) => i.room === o.filter);
  return { items: shown, chips: true, filter: o.filter, ausgeblendet: items.length - shown.length, arbeitMorgen: 0 };
}

/** Leise Zeilen unten: „Familie · 5 ausgeblendet“, „Arbeit · 5 für morgen“, „Geplant · 1“ */
export const ausgeblendetText = (name: string, n: number) => `${name} · ${n} ausgeblendet`;
export const arbeitMorgenText = (n: number) => `Arbeit · ${n} für morgen`;
export const geplantText = (n: number) => `Geplant · ${n}`;

const joinList = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);

/** Kurz die Zahl und die ersten drei: „eine Aufgabe: Müll“ bzw. „3 Aufgaben, zuerst Müll, Rad und Steuer“ („“ ohne) */
export function aufgabenKurz(items: DayItem[], wo = ""): string {
  const bei = wo ? ` ${wo}` : "";
  const namen = joinList(items.slice(0, 3).map((i) => i.title));
  if (!items.length) return "";
  return items.length === 1 ? `eine Aufgabe${bei}: ${namen}` : `${items.length} Aufgaben${bei}, zuerst ${namen}`;
}

/** Für Mia: „3 Aufgaben, zuerst Müll, Kita-Formular und Rad.“ (`wo` = „bei der Arbeit“ o. Ä.) */
export function aufgabenSatz(items: DayItem[], wo = ""): string {
  const kurz = aufgabenKurz(items, wo);
  return kurz ? `${kurz[0].toUpperCase()}${kurz.slice(1)}.` : `Gerade liegt${wo ? ` ${wo}` : ""} keine Aufgabe an.`;
}

/** Ruht die Arbeit nach Uhr (Server/Mia, ohne Arbeitstage): ab „Feierabend ab“ bis 5 Uhr */
export function feierabendNachUhr(minutes: number, feierabendAb = "20:00"): boolean {
  const ab = Number(feierabendAb.slice(0, 2)) * 60 + Number(feierabendAb.slice(3, 5));
  return minutes < 5 * 60 || minutes >= ab;
}
