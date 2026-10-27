// Öffnen = Startseite (Auftrag „Navigation: immer zur Startseite“): Kaltstart
// oder Rückkehr aus dem Hintergrund nach mehr als 5 Minuten → Heute. Unter
// 5 Minuten bleibt man, wo man war. Ausnahmen: laufender Kochmodus, und Links,
// die man gerade bewusst öffnet (Einladung, Anmelden, Rechtliches, alles mit
// Angaben in der Adresse wie geteilte Rezepte oder „+ Butter“).

import { readRaw, writeRaw } from "@/lib/core/localStore";
import { now } from "@/lib/core/now";
import type { StorageKey } from "@/lib/core/storage";

const KEY: StorageKey = "wasgibts.zuletztweg";
export const HEIM_MS = 5 * 60_000;

/** Bleiben immer, wo sie sind */
const BLEIBT = ["/kochbuch/kochen", "/e/", "/einladung", "/beitreten", "/auth", "/anmelden", "/konto", "/datenschutz", "/impressum", "/nutzungsbedingungen"];

/** Ist das die Startseite „Heute“ (nicht Kalender/Essen)? */
export function istHeute(url: string): boolean {
  const [path, query = ""] = url.split("?");
  if (path !== "/") return false;
  const seite = new URLSearchParams(query).get("seite");
  return !seite || seite === "heute";
}

/** Rein: soll die App beim Öffnen bzw. Zurückkommen auf die Startseite? */
export function zurStartseite(url: string, wegSeit: number | null, jetzt: number): boolean {
  if (wegSeit === null || jetzt - wegSeit <= HEIM_MS) return false;
  const [path, query = ""] = url.split("?");
  if (istHeute(url)) return false;
  if (BLEIBT.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`))) return false;
  // Kalender/Essen-Reiter dürfen zurück auf Heute, andere Angaben in der Adresse nicht
  if (path !== "/" && query) return false;
  return true;
}

/** Die App geht in den Hintergrund (bzw. wird geschlossen) */
export const merkeWeg = () => writeRaw(KEY, String(now().getTime()));

/** Wieder da: vergessen (sonst würde ein späteres Neuladen mitten in der Nutzung umleiten) */
export const vergissWeg = () => writeRaw(KEY, null);

/** Seit wann die App weg war (`null` = noch nie) */
export function wegSeit(): number | null {
  const n = Number(readRaw(KEY));
  return Number.isFinite(n) && n > 0 ? n : null;
}
