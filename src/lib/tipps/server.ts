// Tipps aus der Region – nur auf dem Server. Der Schalter TIPS_SOURCE wählt
// die Quelle: off (Standard: nirgends etwas von Tipps zu sehen) | demo
// (Beispieldaten, als Beispiel gekennzeichnet) | tldb (Landesdatenbank SH).
// Zwischengespeichert (6 Std.); der tägliche Abruf (/api/tipps/aktualisieren,
// Vercel Cron) füllt den Speicher früh morgens für die nächsten 21 Tage –
// mit Supabase landen die Daten später in der Tabelle `tips`.

import { berlinTime } from "../core/now";
import { geocode, weatherMock } from "../wetter/server";
import { nearTips, type Tip, type TipView } from "./model";
import { DemoTipSource } from "./sources/demo";
import { TldbTipSource } from "./sources/tldb";
import { SCHLESWIG_HOLSTEIN, type TipSource } from "./sources/types";

export type TipsMode = "off" | "demo" | "tldb";

export function tipsMode(): TipsMode {
  const v = (process.env.TIPS_SOURCE ?? "off").trim().toLowerCase();
  return v === "demo" || v === "tldb" ? v : "off";
}

function source(mode: TipsMode, today: string): TipSource | null {
  if (mode === "demo") return new DemoTipSource(today);
  if (mode === "tldb") return new TldbTipSource();
  return null;
}

/** Orte, die ohne Netz bekannt sind (der Rest über das Geocoding des Wetters) */
const TOWNS: Record<string, { name: string; lat: number; lng: number }> = {
  eutin: { name: "Eutin", lat: 54.1376, lng: 10.6181 },
  malente: { name: "Malente", lat: 54.1725, lng: 10.5594 },
  "bad malente-gremsmühlen": { name: "Malente", lat: 54.1725, lng: 10.5594 },
  plön: { name: "Plön", lat: 54.1622, lng: 10.4217 },
  "bad segeberg": { name: "Bad Segeberg", lat: 53.9363, lng: 10.3087 },
  scharbeutz: { name: "Scharbeutz", lat: 54.0219, lng: 10.7461 },
  "neustadt in holstein": { name: "Neustadt in Holstein", lat: 54.1063, lng: 10.8137 },
  "timmendorfer strand": { name: "Timmendorfer Strand", lat: 53.9946, lng: 10.7808 },
  lübeck: { name: "Lübeck", lat: 53.8655, lng: 10.6866 },
  kiel: { name: "Kiel", lat: 54.3233, lng: 10.1228 },
  flensburg: { name: "Flensburg", lat: 54.7937, lng: 9.4469 },
  neumünster: { name: "Neumünster", lat: 54.0714, lng: 9.99 },
  oldenburg: { name: "Oldenburg in Holstein", lat: 54.2925, lng: 10.8869 },
};

async function placeCoords(ort: string): Promise<{ name: string; lat: number; lng: number } | null> {
  const key = ort.trim().toLowerCase();
  if (TOWNS[key]) return TOWNS[key];
  if (weatherMock()) return null;
  const hit = await geocode(ort);
  return hit ? { name: hit.name, lat: hit.lat, lng: hit.lon } : null;
}

const TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; tips: Tip[] }>();

/** Alle Tipps von–bis in Schleswig-Holstein (aus dem Speicher oder frisch) */
async function loadTips(von: string, bis: string, today = berlinTime().iso): Promise<Tip[]> {
  const mode = tipsMode();
  const src = source(mode, today);
  if (!src) return [];
  const key = `${mode}|${today}|${von}|${bis}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.tips;
  const tips = await src.fetchRange(von, bis, SCHLESWIG_HOLSTEIN);
  cache.set(key, { at: Date.now(), tips });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return tips;
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Täglicher Abruf: die nächsten 21 Tage */
export async function refreshTips(): Promise<number> {
  const today = berlinTime().iso;
  cache.clear();
  return (await loadTips(today, addDays(today, 21), today)).length;
}

export type TipsAnswer = { source: TipsMode; ort: { name: string; lat: number; lng: number } | null; tips: TipView[] };

/** Tipps im Umkreis eines Ortes */
export async function tipsNear(q: { ort: string; km: number; von: string; bis: string; today?: string }): Promise<TipsAnswer> {
  const mode = tipsMode();
  if (mode === "off") return { source: "off", ort: null, tips: [] };
  const ort = await placeCoords(q.ort);
  if (!ort) return { source: mode, ort: null, tips: [] };
  const tips = await loadTips(q.von, q.bis, q.today);
  return { source: mode, ort, tips: nearTips(tips, ort, q.km) };
}
