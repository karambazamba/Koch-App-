// Kreis Ostholstein abrufen – nur auf dem Server, allgemein (nie pro Person,
// keine Nutzerdaten gehen an den Kreis). Höflich: robots.txt, eigener
// User-Agent, höchstens 1 Anfrage pro Sekunde (bzw. Crawl-delay), nur nötige
// Seiten (Blättern über ofs_1, 25 je Seite, Schluss nach dem Zeitraum).
// Übernommen werden nur ID, Titel, Datum, Uhrzeit, Ort (Text), Link und die
// selbst abgeleiteten Kategorien. Die HTML-Auswertung steckt in parser.ts
// (wartet auf echte Beispielseiten) – bis dahin kommt hier nichts heraus.

import { APP_NAME } from "@/lib/core/app";
import { erkenneKategorien } from "@/lib/region/kategorien";
import { erkenneOrt } from "@/lib/region/orte";
import { letzterTag, sanitizeEvent, type RegionEvent } from "@/lib/region/model";
import { parseTermin } from "@/lib/region/zeit";
import { PARSER_BEREIT, parseDetail, parseListe, type DetailEintrag, type ListenEintrag } from "@/lib/region/kreisOh/parser";
import { leseRobots } from "@/lib/region/kreisOh/robots";

/** „Mia-App (mia.karamba-eis.de)“ – eigener User-Agent, damit der Kreis weiß, wer fragt */
export const USER_AGENT = `${APP_NAME}-App (mia.karamba-eis.de)`;
const KREIS_HOST = "https://www.kreis-oh.de";
const LISTE = "/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/";
/** Einträge je Listenseite */
export const JE_SEITE = 25;
/** Nie mehr als so viele Listenseiten je Lauf */
const MAX_SEITEN = 12;
/** Nie mehr als so viele Detailseiten je Lauf */
const MAX_DETAILS = 60;

/** Adresse einer Listenseite (ofs_1 = 0, 25, 50 …) */
export const listenUrl = (ofs: number) => `${KREIS_HOST}${LISTE}${ofs > 0 ? `?ofs_1=${ofs}` : ""}`;

export type Holer = (url: string) => Promise<{ status: number; text: string }>;

export type AbrufErgebnis = { events: RegionEvent[]; seiten: number; grund: "ok" | "leer" | "robots" | "fehler" | "wartet" };

/** Ein Listeneintrag (+ Detail, falls nötig) → Eintrag; null = Datum nicht lesbar */
export function zuEvent(e: ListenEintrag, detail: DetailEintrag | null, standardJahr: number): RegionEvent | null {
  const quelle = { ...e, ...(detail ?? {}) };
  const termin = parseTermin(quelle.datumText, quelle.zeitText, standardJahr);
  if (!termin) return null;
  const ort = quelle.ortText ?? "";
  return sanitizeEvent({
    id: `kreisoh-${e.id}`,
    quelle: "kreisoh",
    titel: quelle.titel,
    ...termin,
    ort,
    gemeinde: erkenneOrt(ort) ?? erkenneOrt(quelle.titel),
    link: e.link,
    kategorien: erkenneKategorien(quelle.titel, quelle.artText ?? ""),
  });
}

const schlafen = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Alles von heute bis `bis` (inklusive) holen – höflich, Seite für Seite */
export async function holeKreisOh(o: { heute: string; bis: string; holen: Holer; warten?: (ms: number) => Promise<void>; bereit?: boolean }): Promise<AbrufErgebnis> {
  // Ohne echten Parser kein einziger Abruf beim Kreis
  if (!(o.bereit ?? PARSER_BEREIT)) return { events: [], seiten: 0, grund: "wartet" };
  const warten = o.warten ?? schlafen;
  const jahr = Number(o.heute.slice(0, 4));
  let pause = 1000;
  let erste = true;
  const holen = async (url: string) => {
    if (!erste) await warten(pause);
    erste = false;
    return o.holen(url);
  };
  try {
    const robots = await holen(`${KREIS_HOST}/robots.txt`);
    const regeln = leseRobots(robots.status === 200 ? robots.text : null, USER_AGENT);
    pause = regeln.pauseMs;
    if (!regeln.erlaubt(LISTE)) return { events: [], seiten: 0, grund: "robots" };
    const events = new Map<string, RegionEvent>();
    let details = 0;
    let seiten = 0;
    for (let ofs = 0; seiten < MAX_SEITEN; ofs += JE_SEITE) {
      const res = await holen(listenUrl(ofs));
      seiten++;
      if (res.status !== 200) return { events: [...events.values()], seiten, grund: events.size ? "ok" : "fehler" };
      const seite = parseListe(res.text);
      let spaeter = 0;
      for (const eintrag of seite.eintraege) {
        let ev = zuEvent(eintrag, null, jahr);
        // Uhrzeit oder Ort fehlen in der Liste: einmal die Detailseite (wenn erlaubt)
        if ((!ev || (!eintrag.zeitText && !eintrag.ortText)) && details < MAX_DETAILS && regeln.erlaubt(new URL(eintrag.link).pathname)) {
          details++;
          const d = await holen(eintrag.link);
          if (d.status === 200) ev = zuEvent(eintrag, parseDetail(d.text), jahr) ?? ev;
        }
        if (!ev) continue;
        if (ev.datum > o.bis) spaeter++;
        if (letzterTag(ev) >= o.heute && ev.datum <= o.bis) events.set(ev.id, ev);
      }
      // Fertig: keine weitere Seite oder alles auf der Seite liegt nach dem Zeitraum
      if (!seite.weiter || !seite.eintraege.length || spaeter === seite.eintraege.length) break;
    }
    return { events: [...events.values()], seiten, grund: events.size ? "ok" : "leer" };
  } catch {
    return { events: [], seiten: 0, grund: "fehler" };
  }
}

/** Echter Abruf (Server): eigener User-Agent, 10 s Zeitlimit */
export const kreisHolen: Holer = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  return { status: res.status, text: res.status === 200 ? await res.text() : "" };
};
