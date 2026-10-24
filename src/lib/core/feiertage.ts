// Gesetzliche Feiertage (bundesweit + Schleswig-Holstein), rein und ohne
// Liste zum Pflegen: feste Tage plus die beweglichen rund um Ostern
// (Gaußsche Osterformel, gregorianisch). Genutzt vom Beispiel-Tag (Feiertag
// = wie Sonntag).

import { addDays } from "@/lib/core/now";

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Ostersonntag eines Jahres als "YYYY-MM-DD" */
export function ostersonntag(jahr: number): string {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(jahr, monat, tag);
}

/** Feiertage eines Jahres: Datum → Name (bundesweit + Schleswig-Holstein) */
export function feiertage(jahr: number): Record<string, string> {
  const ostern = ostersonntag(jahr);
  return {
    [iso(jahr, 1, 1)]: "Neujahr",
    [addDays(ostern, -2)]: "Karfreitag",
    [ostern]: "Ostersonntag",
    [addDays(ostern, 1)]: "Ostermontag",
    [iso(jahr, 5, 1)]: "Tag der Arbeit",
    [addDays(ostern, 39)]: "Christi Himmelfahrt",
    [addDays(ostern, 49)]: "Pfingstsonntag",
    [addDays(ostern, 50)]: "Pfingstmontag",
    [iso(jahr, 10, 3)]: "Tag der Deutschen Einheit",
    [iso(jahr, 10, 31)]: "Reformationstag",
    [iso(jahr, 12, 25)]: "1. Weihnachtstag",
    [iso(jahr, 12, 26)]: "2. Weihnachtstag",
  };
}

/** Ist dieser Tag ("YYYY-MM-DD") ein gesetzlicher Feiertag in Schleswig-Holstein? */
export const istFeiertag = (tag: string) => tag in feiertage(Number(tag.slice(0, 4)));
