// Kreis Ostholstein abrufen – nur auf dem Server, allgemein (nie pro Person,
// keine Nutzerdaten gehen an den Kreis). Höflich: robots.txt, eigener
// User-Agent, höchstens 1 Anfrage pro Sekunde (bzw. Crawl-delay), nur nötige
// Seiten. Die Liste nennt keinen Ort, deshalb wird je Gemeinde abgefragt
// (Suchformular `ort=247.<n>`, Zeitraum `dat_tv`/`dat_tb`, 25 je Seite,
// Blättern über ofs_1): so steht die Gemeinde fest, ohne jede Detailseite zu
// holen (zusammen etwa 40 Anfragen am Tag). Übernommen werden nur ID, Titel,
// Datum, Uhrzeit, Ort (Gemeinde), Link und die selbst abgeleiteten Kategorien.
// Die HTML-Auswertung steckt in parser.ts.

import { APP_NAME } from "@/lib/core/app";
import { erkenneKategorien } from "@/lib/region/kategorien";
import { erkenneOrt } from "@/lib/region/orte";
import { letzterTag, sanitizeEvent, type RegionEvent } from "@/lib/region/model";
import { parseTermin } from "@/lib/region/zeit";
import { dekodiere, PARSER_BEREIT, parseDetail, parseGemeinden, parseListe, type DetailEintrag, type Gemeinde, type ListenEintrag } from "@/lib/region/kreisOh/parser";
import { leseRobots } from "@/lib/region/kreisOh/robots";

/** „Mia-App (mia.karamba-eis.de)“ – eigener User-Agent, damit der Kreis weiß, wer fragt */
export const USER_AGENT = `${APP_NAME}-App (mia.karamba-eis.de)`;
const KREIS_HOST = "https://www.kreis-oh.de";
const LISTE = "/Bildung-Kultur-Sport/Kultur-erleben-Kultur-f%C3%B6rdern/Veranstaltungen/";
/** Einträge je Listenseite */
export const JE_SEITE = 25;
/** Nie mehr als so viele Listenseiten je Lauf (alle Gemeinden zusammen) */
const MAX_SEITEN = 70;
/** Nie mehr als so viele Detailseiten je Lauf (nur wenn das Datum in der Liste unlesbar ist) */
const MAX_DETAILS = 10;
/** Nach so vielen Millisekunden Schluss (die Server-Funktion darf 120 s) */
const MAX_DAUER_MS = 95_000;
/** Kreisweite Veranstaltungen (kein Ort im Kreis) */
const KREISWEIT = "Kreis Ostholstein";

/** Adresse einer Listenseite: Zeitraum von–bis, optional eine Gemeinde, ofs_1 = 0, 25, 50 … */
export function listenUrl(o: { von: string; bis: string; ort?: string; ofs?: number }): string {
  const q = new URLSearchParams({ ModID: "11", object: "tx,3906.4.1", La: "1", NavID: "2454.143", kat: "1,", dat_tv: o.von, dat_tb: o.bis, kuo: "1", sfvort: "1", bn: "1" });
  if (o.ort) q.set("ort", o.ort);
  if (o.ofs) q.set("ofs_1", String(o.ofs));
  return `${KREIS_HOST}${LISTE}index.php?${q}`;
}

export type Holer = (url: string) => Promise<{ status: number; text: string }>;

export type AbrufErgebnis = { events: RegionEvent[]; seiten: number; grund: "ok" | "leer" | "robots" | "fehler" | "wartet" };

/** Ein Listeneintrag (+ Detail, falls nötig) → Eintrag; null = Datum nicht lesbar */
export function zuEvent(e: ListenEintrag, detail: DetailEintrag | null, standardJahr: number, gemeinde?: string): RegionEvent | null {
  const quelle = { ...e, ...(detail ?? {}) };
  const termin = parseTermin(quelle.datumText, quelle.zeitText, standardJahr);
  if (!termin) return null;
  const ort = quelle.ortText ?? (gemeinde === KREISWEIT ? "Ostholstein" : (gemeinde ?? ""));
  return sanitizeEvent({
    id: `kreisoh-${e.id}`,
    quelle: "kreisoh",
    titel: quelle.titel,
    ...termin,
    ort,
    gemeinde: erkenneOrt(ort) ?? (gemeinde && gemeinde !== KREISWEIT ? erkenneOrt(gemeinde) : null) ?? erkenneOrt(quelle.titel),
    link: e.link,
    kategorien: erkenneKategorien(quelle.titel, quelle.artText ?? ""),
  });
}

const schlafen = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Alles von heute bis `bis` (inklusive) holen – höflich, Gemeinde für Gemeinde, Seite für Seite */
export async function holeKreisOh(o: { heute: string; bis: string; holen: Holer; warten?: (ms: number) => Promise<void>; bereit?: boolean; uhr?: () => number }): Promise<AbrufErgebnis> {
  if (!(o.bereit ?? PARSER_BEREIT)) return { events: [], seiten: 0, grund: "wartet" };
  const warten = o.warten ?? schlafen;
  const uhr = o.uhr ?? (() => performance.now());
  const beginn = uhr();
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
    if (!regeln.erlaubt(`${LISTE}index.php`)) return { events: [], seiten: 0, grund: "robots" };
    // Erste Seite ohne Gemeinde: liefert die Liste der Gemeinden
    const start = await holen(listenUrl({ von: o.heute, bis: o.bis }));
    let seiten = 1;
    if (start.status !== 200) return { events: [], seiten, grund: "fehler" };
    const gemeinden: Gemeinde[] = parseGemeinden(start.text);
    if (!gemeinden.length) return { events: [], seiten, grund: parseListe(start.text).eintraege.length ? "fehler" : "leer" };
    const events = new Map<string, RegionEvent>();
    let details = 0;
    let fehler = 0;
    for (const g of gemeinden) {
      for (let ofs = 0; seiten < MAX_SEITEN && uhr() - beginn < MAX_DAUER_MS; ofs += JE_SEITE) {
        const res = await holen(listenUrl({ von: o.heute, bis: o.bis, ort: g.wert, ofs }));
        seiten++;
        if (res.status !== 200) {
          fehler++;
          break;
        }
        const seite = parseListe(res.text);
        for (const eintrag of seite.eintraege) {
          let ev = zuEvent(eintrag, null, jahr, g.name);
          // Datum in der Liste unlesbar: einmal die Detailseite (wenn erlaubt)
          if (!ev && details < MAX_DETAILS && regeln.erlaubt(new URL(eintrag.link).pathname)) {
            details++;
            const d = await holen(eintrag.link);
            if (d.status === 200) ev = zuEvent(eintrag, parseDetail(d.text), jahr, g.name);
          }
          if (ev && letzterTag(ev) >= o.heute && ev.datum <= o.bis && !events.has(ev.id)) events.set(ev.id, ev);
        }
        if (!seite.weiter || !seite.eintraege.length) break;
      }
    }
    const grund = events.size ? "ok" : fehler ? "fehler" : "leer";
    return { events: [...events.values()], seiten, grund };
  } catch {
    return { events: [], seiten: 0, grund: "fehler" };
  }
}

/** Echter Abruf (Server): eigener User-Agent, 10 s Zeitlimit, Kodierung der Seite (ISO-8859-15) */
export const kreisHolen: Holer = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
  return { status: res.status, text: res.status === 200 ? dekodiere(await res.arrayBuffer(), res.headers.get("content-type")) : "" };
};
