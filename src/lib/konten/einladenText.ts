// Einladungs-Link verständlich (A-042): „Link gilt 14 Tage, bis Mi, 11. Nov.“
// und je offenem Link eine Zeile „Link für Erwachsene · gilt bis Mi, 11. Nov. ·
// 1× benutzt“. Die Laufzeit kommt aus dem Ablaufdatum des Servers
// (`expiresAt`), nur ohne Antwort aus `LINK_TAGE`. Rein: Werte rein, Werte raus.

import type { InviteLink, Role } from "@/lib/konten/model";

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" });
const DAY = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" });
const MONTH_NR = new Intl.DateTimeFormat("de-DE", { month: "numeric", timeZone: "Europe/Berlin" });
/** Monat kurz wie im Deutschen üblich (fest, weil Browser hier verschieden kürzen) */
const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
const DAY_MS = 86_400_000;

/** „Mi, 11. Nov.“ (Wochentag kurz, Tag, Monat kurz wie im Deutschen üblich: „Mai“, „Juni“ ohne Punkt) */
export function linkDatum(date: Date): string {
  return `${WEEKDAY.format(date).replace(/\.$/, "")}, ${DAY.format(date).replace(/\.$/, "")}. ${MONTHS[Number(MONTH_NR.format(date).replace(/\D/g, "")) - 1] ?? ""}`;
}

/** Ganze Tage bis zum Ablauf (mindestens 1) */
export const linkTage = (expiresAt: string, nowMs: number) => Math.max(1, Math.round((Date.parse(expiresAt) - nowMs) / DAY_MS));

/** „Link gilt 14 Tage, bis Mi, 11. Nov.“ */
export function linkGilt(expiresAt: string, nowMs: number): string {
  const tage = linkTage(expiresAt, nowMs);
  return `Link gilt ${tage} ${tage === 1 ? "Tag" : "Tage"}, bis ${linkDatum(new Date(expiresAt))}`;
}

const fuer = (role: Role) => (role === "kind" ? "Link für ein Kind" : "Link für Erwachsene");

/** Eine Zeile je offenem Link: „Link für Erwachsene · gilt bis Mi, 11. Nov. · 1× benutzt“ */
export function linkZeile(l: Pick<InviteLink, "role" | "expiresAt" | "uses">): string {
  const teile = [fuer(l.role), `gilt bis ${linkDatum(new Date(l.expiresAt))}`];
  if (l.uses > 0) teile.push(`${l.uses}× benutzt`);
  return teile.join(" · ");
}

/** Der eben erstellte Link: der mit dem spätesten Ablauf */
export const neuesterLink = (links: InviteLink[]): InviteLink | null => links.reduce<InviteLink | null>((a, l) => (!a || l.expiresAt > a.expiresAt ? l : a), null);
