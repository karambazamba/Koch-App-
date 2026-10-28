// Zugangscode für Mias KI gleich am Anfang (SOFORT-Auftrag, A-027): EIN ruhiger
// Bildschirm „Fast geschafft.“ nach Hallo und „Für wen“ bzw. beim nächsten
// Öffnen für Bestandsnutzer ohne Code. „Später“ wird gemerkt; dann kommt
// derselbe Bildschirm einmal beim ersten KI-Versuch (je Sitzung). Wer per
// Einladung kommt, startet mit „Später“ (`codeErstBeimKiVersuch`): Mail-Code →
// Startseite → Zugangscode erst beim ersten KI-Versuch. Im Chat gibt es keine
// eigene Abfrage mehr. Der Code selbst wird nur auf dem Server geprüft
// (`zugang.ts` → `/api/lotte`, Header, nie URL; nachsichtig).

import { readRaw, writeRaw } from "@/lib/core/localStore";
import type { StorageKey } from "@/lib/core/storage";
import { useExternalStore } from "@/lib/core/useExternalStore";

const LATER_KEY: StorageKey = "wasgibts.zugangscode.spaeter";

/** Texte des Bildschirms (überall „Zugangscode“, nie „Testcode“) */
export const CODE_TEXTE = {
  titel: "Fast geschafft.",
  aendern: "Zugangscode ändern",
  satz: "Gib deinen Zugangscode ein, dann kann ich zuhören und mitdenken.",
  feld: "Zugangscode",
  hinweis: "Groß/klein und Leerzeichen sind egal.",
  knopf: "Fertig",
} as const;

type Request = { open: boolean; change: boolean };
let request: Request = { open: false, change: false };
/** Je Sitzung höchstens einmal von selbst beim KI-Versuch */
let askedOnAttempt = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function codeLater(): boolean {
  try {
    return readRaw(LATER_KEY) === "1";
  } catch {
    return false;
  }
}

/** „Später“ gewählt (bzw. zurückgesetzt, sobald der Code stimmt) */
export function setCodeLater(on: boolean) {
  try {
    writeRaw(LATER_KEY, on ? "1" : null);
  } catch {
    // ohne Speicher gilt „Später“ bis zum Neuladen
  }
  emit();
}

/** Bildschirm öffnen – `change` = aus den Einstellungen („Zugangscode ändern“) */
export function requestCodeScreen(change = false) {
  request = { open: true, change };
  emit();
}

export function closeCodeScreen() {
  request = { open: false, change: false };
  emit();
}

/**
 * Einladungs-Weg (/e/…): nicht gleich nach dem Beitreten fragen, sondern erst
 * beim ersten KI-Versuch – wie nach „Später“.
 */
export function codeErstBeimKiVersuch() {
  setCodeLater(true);
}

/** Ein KI-Versuch ohne Code (Mia, Chat, Sprechen …): einmal je Sitzung den Bildschirm zeigen */
export function onKiVersuchOhneCode() {
  if (askedOnAttempt) return;
  askedOnAttempt = true;
  requestCodeScreen();
}

/**
 * Muss der Bildschirm jetzt stehen? (rein)
 * `askCode`: KI eingerichtet und braucht einen Code, der fehlt bzw. nicht passt;
 * `ready`: Profil da, Hallo/Zustimmung durch, keine Rechtsseite.
 */
export function codeScreenNoetig(o: { askCode: boolean; later: boolean; requested: boolean; ready: boolean }): boolean {
  if (!o.ready) return false;
  return o.requested || (o.askCode && !o.later);
}

export function useCodeScreenState(): Request & { later: boolean } {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    codeScreenState,
    () => SERVER,
  );
}

const SERVER = { open: false, change: false, later: true };
let last: Request & { later: boolean } = SERVER;
/** Aktueller Stand (gleiches Objekt, solange sich nichts ändert) */
export function codeScreenState(): Request & { later: boolean } {
  const later = codeLater();
  if (last.open !== request.open || last.change !== request.change || last.later !== later) last = { ...request, later };
  return last;
}

/** Für Tests: Sitzung zurücksetzen @public */
export function resetCodeAbfrageForTests() {
  request = { open: false, change: false };
  askedOnAttempt = false;
  last = SERVER;
}
