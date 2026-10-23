// Spendentopf – reine Logik (ohne React, auch auf dem Server nutzbar): Region
// aus Wohnort/PLZ, Zeitplan, Stimmen, Betrag und wann die Beitrags-Frage kommt.

import { addDays } from "@/lib/core/now";
import { FALLBACK_REGION, POT_PROJECTS, REGIONS, SCHEDULE, type PotProject, type Region } from "@/lib/spendentopf/regions";

export const regionById = (id: string | null | undefined): Region | null => REGIONS.find((r) => r.id === id) ?? null;

const norm = (s: string) => s.toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Region aus einem Wohnort bzw. einer PLZ („23701“, „22301 Hamburg“, „Eutin“) – oder null */
export function regionForPlace(text: string | null | undefined): Region | null {
  if (!text) return null;
  const plz = text.match(/\b(\d{5})\b/)?.[1];
  if (plz) {
    const byPlz = REGIONS.filter((r) => r.plz_list.some((p) => plz.startsWith(p))).sort((a, b) => Math.max(...b.plz_list.filter((p) => plz.startsWith(p)).map((p) => p.length)) - Math.max(...a.plz_list.filter((p) => plz.startsWith(p)).map((p) => p.length)))[0];
    if (byPlz) return byPlz;
  }
  const t = norm(text.replace(/\d+/g, ""));
  if (!t) return null;
  return REGIONS.find((r) => norm(r.name) === t || r.orte.some((o) => norm(o) === t)) ?? REGIONS.find((r) => r.orte.some((o) => t.includes(norm(o)) || norm(o).includes(t))) ?? null;
}

/** Regionen für die Suche „Ort oder Postleitzahl“ (leer = alle; aktive zuerst) */
export function searchRegions(query: string): Region[] {
  const order = { aktiv: 0, bald: 1, sucht_paten: 2 } as const;
  const q = norm(query);
  const hit = q ? regionForPlace(query) : null;
  const list = q ? REGIONS.filter((r) => r === hit || norm(r.name).includes(q) || r.orte.some((o) => norm(o).includes(q)) || r.plz_list.some((p) => q.startsWith(p) || p.startsWith(q))) : REGIONS;
  return [...list].sort((a, b) => order[a.status] - order[b.status]);
}

export type PotPhase = "vorschlagen" | "abstimmen" | "uebergabe" | "ruhe";

const day = (year: number, md: string) => `${year}-${md}`;

/** Wo im Jahr wir stehen: 1.–14.11. Vorschlagen, 15.–30.11. Abstimmen, bis 12.12. Übergabe */
export function potPhase(today: string): PotPhase {
  const y = Number(today.slice(0, 4));
  if (today >= day(y, SCHEDULE.vorschlagenVon) && today <= day(y, SCHEDULE.vorschlagenBis)) return "vorschlagen";
  if (today >= day(y, SCHEDULE.abstimmenVon) && today <= day(y, SCHEDULE.abstimmenBis)) return "abstimmen";
  if (today > day(y, SCHEDULE.abstimmenBis) && today <= day(y, SCHEDULE.uebergabe)) return "uebergabe";
  return "ruhe";
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** „noch X Tage“ – nur während der Abstimmung (inkl. heute) */
export function voteDaysLeft(today: string): number | null {
  return potPhase(today) === "abstimmen" ? daysBetween(today, day(Number(today.slice(0, 4)), SCHEDULE.abstimmenBis)) + 1 : null;
}

/** Der Topf, um den es geht: eigene Region, wenn sie einen hat – sonst die unterstützte */
export function activePot(region: Region | null, support: string | null): Region | null {
  if (region?.status === "aktiv") return region;
  const s = regionById(support);
  return s?.status === "aktiv" ? s : null;
}

export const projectsFor = (regionId: string, year: number): PotProject[] => POT_PROJECTS.filter((p) => p.region_id === regionId && p.jahr === year);

/** Stimmen je Projekt inklusive der eigenen (eine Stimme pro Familie und Jahr) */
export function projectVotes(projects: PotProject[], ownVote: string | null): { project: PotProject; votes: number; share: number; mine: boolean }[] {
  const counted = projects.map((p) => ({ project: p, votes: p.stimmen + (p.id === ownVote ? 1 : 0), mine: p.id === ownVote }));
  const max = Math.max(1, ...counted.map((c) => c.votes));
  return counted.map((c) => ({ ...c, share: c.votes / max }));
}

/** Abstimmen geht nur in der Abstimmungszeit, für ein Projekt dieses Jahres im aktiven Topf */
export function canVote(today: string, pot: Region | null, projectId: string): boolean {
  return Boolean(pot) && potPhase(today) === "abstimmen" && projectsFor(pot!.id, Number(today.slice(0, 4))).some((p) => p.id === projectId);
}

/** Betrag im Topf: bisher + eigener zugesagter Monatsbeitrag */
export const potTotal = (pot: Region, pledge: number | null) => pot.bisher + (pledge ?? 0);

export const euro = (n: number) => `${new Intl.NumberFormat("de-DE").format(n)} €`;

// --- Beitrags-Frage „Gemeinsam für <Region>“ ----------------------------------

const ASK_AFTER_DAYS = 28;
const ASK_MAX = 3;

export type AskState = { since: string | null; asked: number; next: string | null; done: boolean };

/** Fällig nach ca. 4 Wochen Nutzung; „Später“ = in 4 Wochen erneut, höchstens 3× insgesamt */
export function askDue(a: AskState, today: string, hasPledge: boolean): boolean {
  if (hasPledge || a.done || !a.since || a.asked >= ASK_MAX) return false;
  return today >= (a.next ?? addDays(a.since, ASK_AFTER_DAYS));
}

export function askLater(a: AskState, today: string): AskState {
  const asked = a.asked + 1;
  return { ...a, asked, next: addDays(today, ASK_AFTER_DAYS), done: asked >= ASK_MAX };
}

/** Feste Texte – nie „an KARAMBA“ */
export const POT_TEXTS = {
  share: "100 % für Projekte in deiner Region",
  everyEuro: "Jeder Euro geht in deine Region",
  free: "Die App ist kostenlos. KARAMBA zahlt Server & KI. Keine Werbung, kein Abo, keine Daten verkauft.",
  /** Überschrift der Beitrags-Frage – nie so, als bezahle man die App: das Geld geht in die Region */
  together: (region?: string | null) => `Gemeinsam für ${region ?? "Ostholstein"}`,
  askText: "Jeder Euro geht in den Spendentopf – für Projekte in deiner Region.",
  thanks: "Danke! Wir melden uns, sobald Beiträge möglich sind.",
  stillFree: "Die App bleibt für dich trotzdem komplett kostenlos.",
};

/** Fallback-Region für „… unterstützen“ */
export const fallbackRegion = () => regionById(FALLBACK_REGION)!;
