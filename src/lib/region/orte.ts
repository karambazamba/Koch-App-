// „Was los?“ (A-055): Orte im Kreis Ostholstein mit ungefähren Koordinaten,
// Schreibweisen (Ortsteile, Kurzformen) und die Orte je Wohnort + Umkreis
// (5 / 15 / 30 km). Rein, ohne Netz. Erweiterbar: neue Orte in `ORTE`, feste
// Listen je Wohnort in `UMKREIS_LISTEN` (sonst zählt die Luftlinie).

import { regionForPlace } from "@/lib/spendentopf/model";

export const UMKREISE = [5, 15, 30] as const;
export type Umkreis = (typeof UMKREISE)[number];
export const STANDARD_UMKREIS: Umkreis = 15;

type Ort = { name: string; lat: number; lng: number; auch?: string[] };

/** Gemeinden im Kreis Ostholstein (Name wie er angezeigt wird) */
const ORTE: Ort[] = [
  { name: "Eutin", lat: 54.1376, lng: 10.6181, auch: ["Fissau", "Sielbeck", "Neudorf bei Eutin"] },
  { name: "Bad Malente-Gremsmühlen", lat: 54.1725, lng: 10.5594, auch: ["Bad Malente", "Malente", "Gremsmühlen"] },
  { name: "Süsel", lat: 54.0836, lng: 10.7019, auch: ["Bujendorf", "Gothendorf"] },
  { name: "Scharbeutz", lat: 54.0219, lng: 10.7461, auch: ["Haffkrug", "Pönitz", "Gleschendorf"] },
  { name: "Ahrensbök", lat: 54.0128, lng: 10.5806 },
  { name: "Schönwalde am Bungsberg", lat: 54.1839, lng: 10.755, auch: ["Schönwalde", "Bungsberg"] },
  { name: "Kasseedorf", lat: 54.1667, lng: 10.7167 },
  { name: "Stockelsdorf", lat: 53.8923, lng: 10.6469 },
  { name: "Bosau", lat: 54.095, lng: 10.4344 },
  { name: "Bad Schwartau", lat: 53.9186, lng: 10.6975, auch: ["Rensefeld"] },
  { name: "Ratekau", lat: 53.95, lng: 10.7333, auch: ["Sereetz", "Techau", "Pansdorf"] },
  { name: "Timmendorfer Strand", lat: 53.9946, lng: 10.7808, auch: ["Timmendorf", "Niendorf/Ostsee"] },
  { name: "Sierksdorf", lat: 54.0667, lng: 10.7667 },
  { name: "Neustadt in Holstein", lat: 54.1063, lng: 10.8137, auch: ["Neustadt i. H.", "Neustadt i.H.", "Neustadt"] },
  { name: "Altenkrempe", lat: 54.1333, lng: 10.8 },
  { name: "Schashagen", lat: 54.1333, lng: 10.8833 },
  { name: "Lensahn", lat: 54.2167, lng: 10.8833 },
  { name: "Grömitz", lat: 54.15, lng: 10.95, auch: ["Cismar"] },
  { name: "Kellenhusen", lat: 54.1917, lng: 11.0667 },
  { name: "Dahme", lat: 54.2219, lng: 11.0817 },
  { name: "Riepsdorf", lat: 54.2333, lng: 10.9667 },
  { name: "Grube", lat: 54.2333, lng: 11.0167 },
  { name: "Wangels", lat: 54.2667, lng: 10.7667, auch: ["Weißenhäuser Strand"] },
  { name: "Göhl", lat: 54.2833, lng: 10.9333 },
  { name: "Oldenburg in Holstein", lat: 54.2925, lng: 10.8869, auch: ["Oldenburg i. H.", "Oldenburg i.H.", "Oldenburg"] },
  { name: "Heiligenhafen", lat: 54.3739, lng: 10.9797 },
  { name: "Großenbrode", lat: 54.3631, lng: 11.0817 },
  { name: "Fehmarn", lat: 54.4372, lng: 11.1919, auch: ["Burg auf Fehmarn", "Burg a. F."] },
];

/** Feste Listen je Wohnort (Vorgabe aus dem Auftrag), sonst Luftlinie */
const UMKREIS_LISTEN: Record<string, Partial<Record<Umkreis, string[]>>> = {
  Eutin: {
    5: ["Eutin", "Bad Malente-Gremsmühlen"],
    15: ["Eutin", "Bad Malente-Gremsmühlen", "Süsel", "Scharbeutz", "Ahrensbök", "Schönwalde am Bungsberg", "Kasseedorf", "Stockelsdorf"],
  },
};

const klein = (s: string) =>
  s
    .toLowerCase()
    .replace(/[-–/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Alle Schreibweisen, längste zuerst (damit „Bad Malente“ vor „Malente“ greift) */
const SCHREIBWEISEN: { text: string; ort: string }[] = ORTE.flatMap((o) => [o.name, ...(o.auch ?? [])].map((text) => ({ text: klein(text), ort: o.name }))).sort((a, b) => b.text.length - a.text.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Welcher Ort steckt in einem Text („Treffpunkt Tourist-Info, Markt 19, Eutin“
 * → Eutin)? Bei mehreren gewinnt der zuletzt genannte (Adressen enden mit dem
 * Ort); null = keiner aus der Liste.
 */
export function erkenneOrt(text: string | null | undefined): string | null {
  const t = ` ${klein(text ?? "")} `;
  let best: { ort: string; at: number; len: number } | null = null;
  for (const s of SCHREIBWEISEN) {
    const re = new RegExp(`(?<![a-zäöüß])${escape(s.text)}(?![a-zäöüß])`, "g");
    for (const m of t.matchAll(re)) {
      const at = m.index ?? 0;
      // Später genannt gewinnt; an derselben Stelle die längere Schreibweise
      if (!best || at > best.at + best.len - 1 || (at === best.at && s.text.length > best.len)) best = { ort: s.ort, at, len: s.text.length };
    }
  }
  return best?.ort ?? null;
}

/** Liegt der Wohnort in Ostholstein? (Ortsname, Ortsteil oder Postleitzahl) */
export function inOstholstein(wohnort: string | null | undefined): boolean {
  if (!wohnort?.trim()) return false;
  return erkenneOrt(wohnort) !== null || regionForPlace(wohnort)?.id === "ostholstein";
}

const ortVon = (name: string) => ORTE.find((o) => o.name === name) ?? null;

function km(a: Ort, b: Ort): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Orte im Umkreis eines Wohnorts (feste Liste, sonst Luftlinie); leer = Wohnort unbekannt */
export function orteImUmkreis(wohnort: string | null | undefined, umkreis: Umkreis): string[] {
  const name = erkenneOrt(wohnort);
  const home = name ? ortVon(name) : null;
  if (!home) return [];
  const fest = UMKREIS_LISTEN[home.name]?.[umkreis];
  if (fest) return fest;
  const kleiner = UMKREISE.filter((u) => u < umkreis).flatMap((u) => UMKREIS_LISTEN[home.name]?.[u] ?? []);
  const nah = ORTE.filter((o) => km(home, o) <= umkreis).map((o) => o.name);
  return [...new Set([home.name, ...kleiner, ...nah])];
}

/** Anzeigename des Wohnorts („Malente“ → „Bad Malente-Gremsmühlen“, sonst wie eingegeben) */
export const wohnortName = (wohnort: string) => erkenneOrt(wohnort) ?? wohnort.trim();
