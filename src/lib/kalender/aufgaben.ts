// Aufgaben: alles ist heute, eine Liste, Geschäftlich nur als Schild (Tafel 103/104/114, A-021).
// EINE Stelle für Aufgaben-Seite, Startseiten-Kachel, Kalender-Filter und Mia:
// - Kopfzeile „Heute · Mi 28. Okt“ (nach Feierabend „Heute Abend · Feierabend“).
// - Filter „Alle · Familie · Geschäftlich“ nur, wenn es geschäftliche
//   Einträge gibt; die Wahl merkt sich das Gerät (`aufgabenFilter.ts`).
//   Gefiltert steht unten leise „Familie · 5 ausgeblendet“.
// - Nach Feierabend (bzw. an freien Tagen) ruht die Arbeit: unten leise
//   „Geschäftlich · 5 für morgen“ – antippen blendet sie kurz ein.
// - Mia: „Was steht heute an?“ nennt kurz die Zahl und die ersten drei.
// Rein.

import { headerDate } from "@/lib/heute/kopfDatum";
import type { Room } from "@/lib/core/entries";
import { GESCHAEFTLICH, RAUM_WAHL, raumLabel, type Haushalt } from "@/lib/core/haushalt";
import type { DayItem } from "@/lib/kalender/model";

export type AufgabenFilter = "alle" | Room;

/** „Heute · Mi 28. Okt“ bzw. nach Feierabend „Heute Abend · Feierabend“ */
export function aufgabenKopf(today: string, feierabend: boolean): string {
  return feierabend ? "Heute Abend · Feierabend" : `Heute · ${headerDate(new Date(`${today}T12:00:00Z`)).replace(",", "")}`;
}

export type AufgabenAnsicht = {
  /** Was in der einen Liste steht */
  items: DayItem[];
  /** Chips „Alle · Familie · Geschäftlich“ (leer = keine) */
  chips: AufgabenFilter[];
  /** Wirksamer Filter (ohne Chips immer „alle“) */
  filter: AufgabenFilter;
  /** Durch den Filter ausgeblendet */
  ausgeblendet: number;
  /** Nach Feierabend ausgeblendete Arbeitsaufgaben („Geschäftlich · n für morgen“) */
  arbeitMorgen: number;
};

/**
 * Welche Chips: nur, wenn es geschäftliche Einträge gibt – dann „Alle ·
 * Familie · Geschäftlich“ (Aufgaben und Termine gleich). Wer nichts
 * Geschäftliches hat (Lisa), sieht nie Chips.
 */
export function raumChips(rooms: Room[]): AufgabenFilter[] {
  return rooms.includes("arbeit") ? ["alle", ...RAUM_WAHL] : [];
}

/** Name eines Chips: „Alle“, „Familie“/„Wir“, „Geschäftlich“ */
export const filterLabel = (f: AufgabenFilter, h: Haushalt = "familie") => (f === "alle" ? "Alle" : raumLabel(f, h));

/**
 * Die eine Liste: gefiltert nach Raum (nur mit Chips), nach Feierabend ohne
 * Arbeit – außer man blendet sie kurz ein.
 */
export function aufgabenAnsicht(items: DayItem[], o: { filter: AufgabenFilter; arbeitRuht: boolean; arbeitZeigen?: boolean }): AufgabenAnsicht {
  const arbeit = items.filter((i) => i.room === "arbeit").length;
  const basis = o.arbeitRuht && !o.arbeitZeigen ? items.filter((i) => i.room !== "arbeit") : items;
  const arbeitMorgen = o.arbeitRuht ? arbeit : 0;
  const chips = raumChips(basis.map((i) => i.room));
  if (!chips.length || o.filter === "alle" || !chips.includes(o.filter)) return { items: basis, chips, filter: "alle", ausgeblendet: 0, arbeitMorgen };
  const shown = basis.filter((i) => i.room === o.filter);
  return { items: shown, chips, filter: o.filter, ausgeblendet: basis.length - shown.length, arbeitMorgen };
}

/** Passt ein Eintrag zur Ansicht (für Geplant, Listen, Erledigt darunter)? */
export function passtZurAnsicht(i: Pick<DayItem, "room">, a: Pick<AufgabenAnsicht, "filter">, o: { arbeitRuht: boolean; arbeitZeigen?: boolean }): boolean {
  if (o.arbeitRuht && !o.arbeitZeigen && i.room === "arbeit") return false;
  return a.filter === "alle" || i.room === a.filter;
}

/** Leise Zeilen unten: „Familie · 5 ausgeblendet“, „Geschäftlich · 5 für morgen“, „Geplant · 1“ */
export const ausgeblendetText = (name: string, n: number) => `${name} · ${n} ausgeblendet`;
export const arbeitMorgenText = (n: number) => `${GESCHAEFTLICH} · ${n} für morgen`;
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
