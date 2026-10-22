// Tipps aus der Region: Veranstaltungen in der Nähe (Märkte, Kinderkino,
// Laternenumzüge …). Eine eigene Ebene – KEINE Termine, bis jemand „In unseren
// Kalender“ oder „Übernehmen“ tippt. Rein (ohne React), damit Server, Lotte
// und Tests gleich rechnen. Form wie die spätere Supabase-Tabelle `tips`.

import { KARAMBA_VERANSTALTER } from "./karamba";
import { filtersOf, type TipFilter } from "./categories";

export type Tip = {
  id: string;
  quelle: "demo" | "tldb";
  quelle_id: string;
  titel: string;
  kurztext: string;
  /** "YYYY-MM-DDTHH:MM" (Ortszeit Berlin) */
  beginn: string;
  ende: string | null;
  ganztags: boolean;
  ort_name: string;
  adresse: string;
  lat: number;
  lng: number;
  /** Kategorien der Quelle (Zuordnung zu unseren Filtern in categories.ts) */
  kategorien: string[];
  fuer_kinder: boolean;
  drinnen: boolean | null;
  kostenlos: boolean;
  preis_text: string | null;
  alter_ab: number | null;
  url: string | null;
  veranstalter: string | null;
  lizenz: string;
  urheber: string | null;
  bild_url: string | null;
  bild_lizenz: string | null;
  aktualisiert_am: string;
};

/** Ein Tipp, wie die App ihn bekommt: mit Entfernung zum eigenen Ort */
export type TipView = Tip & { km: number; karamba: boolean };

export const TIP_RADII = [5, 10, 20, 40] as const;
export type TipRadius = (typeof TIP_RADII)[number];

/** Nur offen lizenzierte Einträge (CC0, CC BY, CC BY-SA) */
export function openLicense(lizenz: string | null | undefined): boolean {
  const l = (lizenz ?? "").toUpperCase().replace(/\s+/g, " ");
  return /^CC0(\s|$)/.test(l) || /^CC BY(-SA)?(\s|$)/.test(l) || /PUBLIC DOMAIN/.test(l);
}

/** CC BY / CC BY-SA verlangen den Urheber in der Ansicht */
export const needsAttribution = (lizenz: string) => /^CC BY(-SA)?(\s|$)/i.test(lizenz.trim());

/** Entfernung in km (Haversine) */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export const isKaramba = (t: Pick<Tip, "veranstalter">) => Boolean(t.veranstalter && KARAMBA_VERANSTALTER.some((k) => norm(t.veranstalter!) === norm(k)));

/** Tipps im Umkreis, mit Entfernung, nach Beginn sortiert */
export function nearTips(tips: Tip[], home: { lat: number; lng: number }, km: number): TipView[] {
  return sortTips(
    tips
      .filter((t) => openLicense(t.lizenz))
      .map((t) => ({ ...t, km: Math.round(distanceKm(home, t) * 10) / 10, karamba: isKaramba(t), bild_url: t.bild_url && openLicense(t.bild_lizenz) ? t.bild_url : null }))
      .filter((t) => t.km <= km),
  );
}

/** Nach Beginn; KARAMBA wird nicht bevorzugt – nur bei gleicher Zeit zuerst */
export function sortTips<T extends Pick<Tip, "beginn" | "titel"> & { karamba?: boolean }>(tips: T[]): T[] {
  return [...tips].sort((a, b) => a.beginn.localeCompare(b.beginn) || Number(Boolean(b.karamba)) - Number(Boolean(a.karamba)) || a.titel.localeCompare(b.titel));
}

export const tipDate = (t: Pick<Tip, "beginn">) => t.beginn.slice(0, 10);
export const tipTime = (t: Pick<Tip, "beginn" | "ganztags">) => (t.ganztags ? null : t.beginn.slice(11, 16).replace(/^0/, ""));

// --- Zeiträume ---------------------------------------------------------------------

export type TipRange = "heute" | "wochenende" | "woche";

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** 0 = Mo … 6 = So */
export const weekday = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Von–bis (inklusive) für Heute | Wochenende | Diese Woche */
export function rangeFor(range: TipRange, today: string): { von: string; bis: string } {
  const wd = weekday(today);
  if (range === "heute") return { von: today, bis: today };
  if (range === "woche") return { von: today, bis: addDays(today, 6 - wd) };
  // Wochenende: Fr–So; ab Freitag das laufende, sonst das kommende
  const fri = addDays(today, 4 - wd);
  return { von: wd >= 4 ? today : fri, bis: addDays(fri, 2) };
}

/** Montag–Donnerstag „Tipps diese Woche“, sonst „Tipps fürs Wochenende“ */
export const tileTitle = (today: string) => (weekday(today) <= 3 ? "Tipps diese Woche" : "Tipps fürs Wochenende");
const tileRange = (today: string): TipRange => (weekday(today) <= 3 ? "woche" : "wochenende");

/** Schlüssel des Wochenendes (Datum des Samstags) – für „an diesem Wochenende nicht mehr zeigen“ */
export function weekendKey(today: string): string {
  const wd = weekday(today);
  return addDays(today, wd === 6 ? -1 : 5 - wd);
}

/** „Gemerkt“: gemerkte Tipps ab heute, nach Zeit (Vergangenes fällt still weg) */
export function rememberedTips<T extends Pick<Tip, "id" | "beginn" | "titel"> & { karamba?: boolean }>(tips: T[], gemerkt: string[], today: string): T[] {
  return sortTips(tips.filter((t) => gemerkt.includes(t.id) && tipDate(t) >= today));
}

export const inRange = (t: Pick<Tip, "beginn">, von: string, bis: string) => tipDate(t) >= von && tipDate(t) <= bis;

/** Nach Tag gruppiert (Abschnitte „Samstag, 24. Oktober“) */
export function groupByDay<T extends Pick<Tip, "beginn">>(tips: T[]): { date: string; tips: T[] }[] {
  const out: { date: string; tips: T[] }[] = [];
  for (const t of tips) {
    const d = tipDate(t);
    const last = out[out.length - 1];
    if (last?.date === d) last.tips.push(t);
    else out.push({ date: d, tips: [t] });
  }
  return out;
}

export function matchesFilters(t: Tip, filters: TipFilter[]): boolean {
  const own = filtersOf(t);
  return filters.every((f) => own.includes(f));
}

/** Kachel: zwei Tipps, höchstens EIN KARAMBA-Eintrag pro Woche */
export function tileTips(tips: TipView[], today: string, count = 2): TipView[] {
  const { von, bis } = rangeFor(tileRange(today), today);
  const list = tips.filter((t) => inRange(t, von, bis));
  const out: TipView[] = [];
  let karamba = false;
  for (const t of list) {
    if (t.karamba && karamba) continue;
    if (t.karamba) karamba = true;
    out.push(t);
    if (out.length >= count) break;
  }
  return out;
}

/**
 * Tipp für die Jetzt-Karte: Freitag ab 12 Uhr bis Sonntag 12 Uhr, höchstens
 * einmal pro Wochenende (weggewischt = dieses Wochenende nicht mehr). Passt
 * zum Wetter (Regen → drinnen, Sonne → draußen), mit Kindern „Für Kinder“ zuerst.
 * KARAMBA-Aktionen schlägt die Karte nie von sich aus vor (keine Werbung).
 */
export function jetztTip(tips: TipView[], o: { today: string; minutes: number; rainy: boolean | null; kids: boolean; hiddenWeekend: string | null }): TipView | null {
  const wd = weekday(o.today);
  const inWindow = (wd === 4 && o.minutes >= 12 * 60) || wd === 5 || (wd === 6 && o.minutes < 12 * 60);
  if (!inWindow || o.hiddenWeekend === weekendKey(o.today)) return null;
  const { bis } = rangeFor("wochenende", o.today);
  const nowStamp = `${o.today}T${String(Math.floor(o.minutes / 60)).padStart(2, "0")}:${String(o.minutes % 60).padStart(2, "0")}`;
  const left = tips.filter((t) => !t.karamba && tipDate(t) <= bis && (t.ganztags ? tipDate(t) >= o.today : t.beginn >= nowStamp));
  const score = (t: TipView) => (o.rainy === true ? (t.drinnen === true ? 4 : t.drinnen === false ? -4 : 0) : o.rainy === false ? (t.drinnen === false ? 2 : 0) : 0) + (o.kids && t.fuer_kinder ? 3 : 0) - t.km / 20;
  return [...left].sort((a, b) => score(b) - score(a) || a.beginn.localeCompare(b.beginn))[0] ?? null;
}

/** „Wollen wir Sa 15 Uhr zum Kinderkino?“ */
export function pinboardText(t: Pick<Tip, "titel" | "beginn" | "ganztags">): string {
  const day = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][weekday(tipDate(t))];
  const time = tipTime(t);
  const at = time ? ` ${time.replace(/:00$/, "")} Uhr` : "";
  return `Wollen wir ${day}${at} zu „${t.titel}“?`.slice(0, 140);
}

/** Antwort auf eine Frage (ohne KI): bis zu 3 Tipps aus dem Zeitraum/Ort/Filter */
export function answerTips(tips: TipView[], q: { von: string; bis: string; filters: TipFilter[]; ort: string | null }): TipView[] {
  return tips
    .filter((t) => inRange(t, q.von, q.bis) && matchesFilters(t, q.filters) && (!q.ort || norm(t.ort_name).includes(norm(q.ort)) || norm(t.adresse).includes(norm(q.ort))))
    .slice(0, 3);
}
