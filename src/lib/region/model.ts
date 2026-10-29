// „Was los?“ (A-055, Tafel 142): Veranstaltungen in der Umgebung – rein,
// ohne React, gleich für Server, App, Mia und Tests. Form wie die
// Supabase-Tabelle `region_events`. Übernommen werden NUR: ID, Titel, Datum,
// Uhrzeit von–bis bzw. ganztags, Ort (Text), Link, Kategorien – keine
// Beschreibungen, keine Bilder.

import { WEEKDAYS_SHORT_MO } from "@/lib/core/days";
import { addDays } from "@/lib/core/now";
import { WAS_LOS, WAS_LOS_TIPPS, sortBy } from "@/lib/core/sort";
import type { Haushalt } from "@/lib/core/haushalt";
import { KATEGORIEN, type Filter, type Kategorie } from "@/lib/region/kategorien";
import { erkenneOrt } from "@/lib/region/orte";

export type RegionQuelle = "kreisoh" | "demo" | "aus";

export type RegionEvent = {
  /** „kreisoh-<FID>“ bzw. „demo-…“ (Beispieldaten nur im Testbetrieb) */
  id: string;
  quelle: "kreisoh" | "demo";
  titel: string;
  /** Erster Tag "YYYY-MM-DD" */
  datum: string;
  /** Letzter Tag bei mehrtägigen („bis 15.11.“), sonst null */
  bis_datum: string | null;
  /** "HH:MM" oder null (ganztags) */
  beginn: string | null;
  ende: string | null;
  ganztags: boolean;
  /** Ort als Text, wie die Quelle ihn nennt */
  ort: string;
  /** Erkannte Gemeinde (für den Umkreis), null = unbekannt */
  gemeinde: string | null;
  /** Detailseite bei der Quelle */
  link: string | null;
  kategorien: Kategorie[];
};

/** Ein Treffer mit dem Tag, an dem er gezeigt wird (Mias Karten, Wochenend-Tipps) */
export type WasLosKarte = { event: RegionEvent; tag: string };

/** Wie viele Tage voraus (heute + 14) */
export const TAGE_VORAUS = 14;

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const UHR = /^([01]\d|2[0-3]):[0-5]\d$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Nur saubere Einträge (vom Server, aus der Datenbank oder vom Parser) */
export function sanitizeEvent(raw: unknown): RegionEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id, 80);
  const titel = text(r.titel, 160);
  const datum = typeof r.datum === "string" ? r.datum.slice(0, 10) : "";
  if (!id || !titel || !DATUM.test(datum)) return null;
  const bis = typeof r.bis_datum === "string" && DATUM.test(r.bis_datum.slice(0, 10)) && r.bis_datum.slice(0, 10) > datum ? r.bis_datum.slice(0, 10) : null;
  const beginn = typeof r.beginn === "string" && UHR.test(r.beginn.slice(0, 5)) ? r.beginn.slice(0, 5) : null;
  const ende = beginn && typeof r.ende === "string" && UHR.test(r.ende.slice(0, 5)) && r.ende.slice(0, 5) > beginn ? r.ende.slice(0, 5) : null;
  const link = typeof r.link === "string" && /^https:\/\/[^\s<>"]+$/.test(r.link) ? r.link.slice(0, 500) : null;
  const kategorien = (Array.isArray(r.kategorien) ? r.kategorien : []).filter((k): k is Kategorie => KATEGORIEN.includes(k as Kategorie));
  const ort = text(r.ort, 160);
  return {
    id,
    quelle: r.quelle === "demo" ? "demo" : "kreisoh",
    titel,
    datum,
    bis_datum: bis,
    beginn,
    ende,
    ganztags: !beginn,
    ort,
    gemeinde: typeof r.gemeinde === "string" && r.gemeinde ? r.gemeinde : erkenneOrt(ort),
    link,
    kategorien: kategorien.length ? [...new Set(kategorien)] : ["sonstiges"],
  };
}

/** Letzter Tag eines Eintrags */
export const letzterTag = (e: Pick<RegionEvent, "datum" | "bis_datum">) => e.bis_datum ?? e.datum;

/** Läuft an einem Tag? */
const anTag = (e: RegionEvent, tag: string) => e.datum <= tag && letzterTag(e) >= tag;

const minuten = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Heute schon vorbei? (Ende, sonst Beginn + 2 Std.) */
function vorbei(e: RegionEvent, heute: string, jetzt: number): boolean {
  if (letzterTag(e) < heute) return true;
  if (e.ganztags || letzterTag(e) > heute || e.datum < heute) return false;
  return minuten(e.ende ?? e.beginn!) + (e.ende ? 0 : 120) <= jetzt;
}

export type Reiter = "heute" | "wochenende" | "zwei";

/** 0 = Mo … 6 = So */
export const wochentag = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Wochenende = Freitag ab 15 Uhr bis Sonntag (ab Freitag das laufende) */
export function wochenendeVon(heute: string): { von: string; bis: string } {
  const wt = wochentag(heute);
  const freitag = addDays(heute, wt <= 4 ? 4 - wt : -(wt - 4));
  return { von: wt >= 4 ? heute : freitag, bis: addDays(freitag, 2) };
}

/** Zeitraum eines Reiters (inklusive) */
export function reiterZeitraum(reiter: Reiter, heute: string): { von: string; bis: string } {
  if (reiter === "heute") return { von: heute, bis: heute };
  if (reiter === "wochenende") return wochenendeVon(heute);
  return { von: heute, bis: addDays(heute, TAGE_VORAUS) };
}

/** Passt zum Wochenende? Freitags erst ab 15 Uhr (Ganztägiges zählt ab Samstag) */
function amWochenende(e: RegionEvent, tag: string): boolean {
  if (wochentag(tag) !== 4) return true;
  return !e.ganztags && e.beginn! >= "15:00";
}

export type Tagesgruppe = { tag: string; events: RegionEvent[] };


/**
 * Liste eines Reiters nach Tagen: jeder Eintrag einmal, am ersten passenden
 * Tag im Zeitraum (Mehrtägiges also nicht jeden Tag neu). Heute schon
 * Vorbeies fällt still weg. `jetzt` = Minuten seit Mitternacht.
 */
export function nachTagen(events: RegionEvent[], reiter: Reiter, heute: string, jetzt: number, filter: Filter = "alles"): Tagesgruppe[] {
  const { von, bis } = reiterZeitraum(reiter, heute);
  const gruppen = new Map<string, RegionEvent[]>();
  for (const e of events) {
    if (filter !== "alles" && !e.kategorien.includes(filter)) continue;
    if (vorbei(e, heute, jetzt)) continue;
    let tag = e.datum < von ? von : e.datum;
    if (reiter === "wochenende") while (tag <= bis && tag <= letzterTag(e) && !amWochenende(e, tag)) tag = addDays(tag, 1);
    if (tag > bis || tag > letzterTag(e) || !anTag(e, tag)) continue;
    gruppen.set(tag, [...(gruppen.get(tag) ?? []), e]);
  }
  return [...gruppen.keys()].sort().map((tag) => ({ tag, events: sortBy(gruppen.get(tag)!, ...WAS_LOS) }));
}

/** Gibt es in den nächsten 14 Tagen etwas? (für den Mini-Kreis) */
export function hatEintraege14Tage(events: RegionEvent[], heute: string, jetzt = 0): boolean {
  return nachTagen(events, "zwei", heute, jetzt).length > 0;
}

/** Ist „Was los?“ zu sehen? Quelle an, Baustein an, etwas in 14 Tagen */
export function wasLosSichtbar(o: { quelle: RegionQuelle | undefined; baustein: boolean; events: RegionEvent[]; heute: string; jetzt?: number }): boolean {
  return Boolean(o.quelle && o.quelle !== "aus" && o.baustein && hatEintraege14Tage(o.events, o.heute, o.jetzt ?? 0));
}

/** Nur Orte im Umkreis (unbekannte Gemeinde: erst bei 30 km) und nur gewünschte Kategorien */
export function imUmkreis(events: RegionEvent[], orte: string[], o: { umkreis: number; kategorienAus: Kategorie[] }): RegionEvent[] {
  return events.filter((e) => (e.gemeinde ? orte.includes(e.gemeinde) : o.umkreis >= 30) && e.kategorien.some((k) => !o.kategorienAus.includes(k)));
}

const MONATE_KURZ = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** „Sa 31. Okt“ */
export function tagKurz(tag: string): string {
  return `${WEEKDAYS_SHORT_MO[wochentag(tag)]} ${Number(tag.slice(8, 10))}. ${MONATE_KURZ[Number(tag.slice(5, 7)) - 1]}`;
}

/** Abschnitt der Liste: „HEUTE · DO 29. OKT“ bzw. „SA 31. OKT“ (Großschrift per CSS) */
export const tagTitel = (tag: string, heute: string) => (tag === heute ? `Heute · ${tagKurz(tag)}` : tag === addDays(heute, 1) ? `Morgen · ${tagKurz(tag)}` : tagKurz(tag));

/** Linke Spalte: „11:30“ bzw. „ganztags“ */
export const zeitSpalte = (e: RegionEvent) => e.beginn ?? "ganztags";

/** Detail oben: „Sa 31. Okt · 17:00“ bzw. „… · 10:00 – 12:00“ / „… · ganztags“ */
export function wannText(e: RegionEvent, tag = e.datum): string {
  const zeit = e.ganztags ? "ganztags" : e.ende ? `${e.beginn} – ${e.ende}` : e.beginn!;
  return `${tagKurz(tag)} · ${zeit}${e.bis_datum ? ` · bis ${tagKurz(e.bis_datum)}` : ""}`;
}

/** Zettel für die Pinnwand: „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“ */
export function pinnwandZettel(e: RegionEvent, tag = e.datum): string {
  const wann = `${WEEKDAYS_SHORT_MO[wochentag(tag)]}${e.beginn ? ` ${e.beginn}` : ""}`;
  return `${wann} ${e.titel} · Wer kommt mit?`.slice(0, 140);
}

/** Daten für einen Familientermin (Raum Familie, Link zur Quelle) */
export function terminDaten(e: RegionEvent, tag = e.datum): { title: string; date: string; start: string; end?: string; place?: string; link?: string; endDate?: string } {
  return {
    title: e.titel,
    date: tag,
    start: e.beginn ?? "",
    ...(e.ende ? { end: e.ende } : {}),
    ...(e.ort ? { place: e.ort } : {}),
    ...(e.link ? { link: e.link } : {}),
    ...(e.ganztags && e.bis_datum && e.bis_datum > tag ? { endDate: e.bis_datum } : {}),
  };
}

/** Quelle unten im Fenster */
export const quellenZeile = (quelle: RegionQuelle | undefined) => (quelle === "demo" ? "Beispieldaten (Testbetrieb) · Quelle: Kreis Ostholstein" : "Quelle: Kreis Ostholstein · kreis-oh.de");
export const OHNE_GEWAEHR = "Angaben vom Kreis Ostholstein, ohne Gewähr";
export const KREIS_SEITE = "https://www.kreis-oh.de/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/";

/**
 * Jetzt-Karte freitags („Wochenende planen?“, A-054 hängt das ein): höchstens
 * 2 Tipps fürs Wochenende. Familie: „für Kinder“ zuerst; dann Draußen/Markt
 * vor dem Rest, früher vor später. Nur Einträge mit Uhrzeit oder an einem
 * Wochenend-Tag; Beispieldaten nur, wenn sie übergeben werden (Testbetrieb).
 */
export function wochenendTipps(events: RegionEvent[], haushalt: Haushalt, heute: string, jetzt = 0): WasLosKarte[] {
  const liste = nachTagen(events, "wochenende", heute, jetzt).flatMap((g) => g.events.map((e) => ({ e, tag: g.tag })));
  const punkte = (e: RegionEvent) => (haushalt === "familie" && e.kategorien.includes("kinder") ? 4 : 0) + (e.kategorien.includes("draussen") || e.kategorien.includes("markt") ? 2 : 0) + (e.ganztags ? -1 : 0);
  return sortBy(liste.map((x) => ({ ...x, punkte: punkte(x.e) })), ...WAS_LOS_TIPPS)
    .slice(0, 2)
    .map((x) => ({ event: x.e, tag: x.tag }));
}

/**
 * Hinweis für „Für Entwickler“: „Was los?: Quelle liefert nichts“, wenn der
 * letzte Lauf keine Treffer hatte (oder noch keiner lief); null = alles gut
 * bzw. Quelle aus. Nutzer sehen das nie – für sie bleibt der Kreis weg.
 */
export function quellenHinweis(quelle: RegionQuelle | undefined, status: { treffer: number; grund: string } | null): string | null {
  if (quelle !== "kreisoh") return null;
  if (status && status.treffer > 0) return null;
  const warum = !status ? "noch kein Lauf" : status.grund === "wartet" ? "Parser wartet auf echte Beispielseiten" : status.grund === "laeuft" ? "erster Abruf läuft" : status.grund === "robots" ? "robots.txt verbietet den Abruf" : status.grund === "fehler" ? "Seite nicht erreichbar" : "0 Treffer";
  return `Was los?: Quelle liefert nichts (${warum})`;
}
