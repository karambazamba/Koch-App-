// Namen statt Mail-Adresse (A-042): EINE Stelle für „wie heißt Person X“ und
// „wie heißt unser Haushalt“. Eine Mail-Adresse wird nie als Name gezeigt –
// nur klein unter „Angemeldet als“. Rein: Werte rein, Werte raus.

import { haushaltName, type Haushalt } from "@/lib/core/haushalt";
import type { CloudUser, HouseholdInfo, Member } from "@/lib/konten/model";

const NAME_MAX = 40;
const HAUSHALT_MAX = 60;

/** Sieht aus wie (ein Stück) Mail-Adresse */
const istMailArtig = (s: string | null | undefined) => typeof s === "string" && s.includes("@");

/** Teil vor dem @ (klein), sonst "" */
const lokalTeil = (email: string | null | undefined) => (email ?? "").split("@")[0].trim().toLowerCase();

/**
 * Vorschlag aus der Mail: Teil vor dem @, ohne Punkte, Zahlen und
 * Unterstriche, jedes Wort groß („felix.gabriel92@…“ → „Felix Gabriel“).
 * Gleiche Regel wie die Datenbank-Migration (`initcap`).
 */
export function nameAusMail(email: string | null | undefined): string {
  const words = lokalTeil(email)
    .replace(/[0-9]+/g, "")
    .replace(/[._+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return words.replace(/(^|[\s-])([a-zäöüß])/g, (_, sep: string, c: string) => sep + c.toUpperCase()).slice(0, NAME_MAX).trim();
}

/** Wie eine Person heißt – nie die Mail-Adresse ("" = kein Name bekannt) */
export function personName(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  return (istMailArtig(t) ? nameAusMail(t) : t).slice(0, NAME_MAX);
}

/** Name eines Mitglieds für die Anzeige (ohne Namen: „Ohne Namen“) */
export const mitgliedName = (m: Pick<Member, "displayName"> | null | undefined) => personName(m?.displayName) || "Ohne Namen";

/** Anfangsbuchstabe für den Avatar-Kreis */
export const anfangsbuchstabe = (name: string) => personName(name).charAt(0).toUpperCase() || "?";

/** Anzeigename für das Konto: Name aus dem Profil; leer = einmal fragen */
export const profilName = (name: string | null | undefined) => personName(name);

/** Nachfrage „Wie sollen dich die anderen sehen?“ nur ohne Profilnamen */
export const brauchtNamensfrage = (name: string | null | undefined) => !profilName(name);

// --- Haushaltsname ----------------------------------------------------------

type ProfilTeil = { householdName?: string | null; persons?: { name: string }[] | null };

/** Nachname aus dem Profil: Name des Haushalts (ohne „Familie“), sonst zweites Wort des eigenen Namens */
export function nachnameAusProfil(profile: ProfilTeil | null | undefined): string | null {
  const hh = personName(profile?.householdName).replace(/^familie\s+/i, "").trim();
  if (hh && !/\s/.test(hh)) return hh;
  const words = personName(profile?.persons?.[0]?.name).split(/\s+/).filter(Boolean);
  return words.length >= 2 ? words[words.length - 1] : null;
}

/**
 * Standard-Name je Haushaltsart: „Familie“ / „Wir zwei“ / „Privat“; mit
 * Nachname „Familie Gabriel“. Ein selbst gewählter Name aus dem Profil
 * („Villa Kunterbunt“, „Familie Müller“) gilt vor dem Standard.
 */
export function standardHaushaltsname(h: Haushalt, profile?: ProfilTeil | null): string {
  const eigen = personName(profile?.householdName);
  if (eigen) return (h === "familie" && !/^familie\s/i.test(eigen) ? `Familie ${eigen}` : eigen).slice(0, HAUSHALT_MAX);
  const nachname = nachnameAusProfil(profile);
  return (h === "familie" && nachname ? `Familie ${nachname}` : haushaltName(h)).slice(0, HAUSHALT_MAX);
}

/** Name eines Haushalts für die Anzeige: nie mit Mail, leer = Standard */
export function haushaltAnzeige(raw: string | null | undefined, standard: string): string {
  const t = (raw ?? "").trim();
  return !t || istMailArtig(t) ? standard : t;
}

// --- Einmalige Korrektur alter Konten (Migration) ----------------------------

/** Alter Anzeigename aus der Mail: enthält @ oder ist genau der Teil vor dem @ */
export function istMailName(name: string, email: string | null | undefined): boolean {
  const t = name.trim().toLowerCase();
  return istMailArtig(t) || (Boolean(t) && t === lokalTeil(email));
}

/** Alter Haushaltsname „Familie <mail…>“ (oder leer nach der Server-Migration) */
export function istMailHaushaltsname(name: string, email: string | null | undefined): boolean {
  const t = name.trim();
  if (!t || istMailArtig(t)) return true;
  const rest = t.replace(/^familie\s+/i, "");
  return rest !== t && istMailName(rest, email);
}

export type NamensKorrektur = { displayName?: string; householdName?: string };

/**
 * Was beim Anmelden einmal korrigiert wird: mein Anzeigename aus der Mail
 * (bzw. der von der Server-Migration bereinigte Teil vor dem @) → Name aus
 * dem Profil; Haushaltsname „Familie <mail>“ bzw. leer → Standard (nur
 * Erwachsene dürfen den Haushalt umbenennen).
 */
export function namensKorrektur(household: HouseholdInfo, user: CloudUser | null, profil: { name: string; standard: string }): NamensKorrektur {
  const out: NamensKorrektur = {};
  const email = user?.email ?? null;
  const mine = household.me.displayName.trim();
  const wunsch = profilName(profil.name);
  if (istMailName(mine, email)) out.displayName = wunsch || nameAusMail(email ?? mine) || nameAusMail(mine);
  else if (wunsch && wunsch !== mine && email && mine === nameAusMail(email)) out.displayName = wunsch;
  if (out.displayName === mine || !out.displayName) delete out.displayName;
  if (household.me.role === "erwachsener" && istMailHaushaltsname(household.name, email) && profil.standard !== household.name) out.householdName = profil.standard;
  return out;
}

/** Haushalt fürs Anzeigen und Speichern: kein Name mit Mail (alte Stände im Gerät) */
export function ohneMail(h: HouseholdInfo): HouseholdInfo {
  const clean = (m: Member): Member => (istMailArtig(m.displayName) ? { ...m, displayName: personName(m.displayName) } : m);
  return { ...h, name: istMailArtig(h.name) ? "" : h.name, members: h.members.map(clean), me: clean(h.me) };
}
