// Erinnerungen bei geschlossener App (A-069), rein: der ehrliche Status für
// Einstellungen → Mitteilungen, die Test-Erinnerung und die Art eines
// Versands fürs Protokoll (nie Inhalt). Server und Gerät nutzen dasselbe.

import type { PushMessage } from "@/lib/heute/mitteilungen/versand";

/** Letzter Versand-Lauf gilt als „läuft“, wenn er höchstens so alt ist */
const LAUF_FRISCH_MS = 5 * 60_000;

/** Was der Server über den Versand weiß (`/api/push/status`) */
export type ServerStatus = {
  /** pg_cron, pg_net und der Zeitplan „mia-push-senden“ sind da */
  zeitplan: boolean;
  /** Der Zeitplan kennt die Adresse der App */
  ziel: boolean;
  /** ISO-Zeit des letzten Versand-Laufs */
  letzterLauf: string | null;
  /** Dieses Gerät hat ein Abo beim Server */
  abo: boolean;
};

export type StatusEingang = {
  homescreen: boolean;
  erlaubt: boolean;
  konto: boolean;
  /** null = nicht abfragbar (offline, kein Konto, Server ohne Supabase) */
  server: ServerStatus | null;
  nowMs: number;
};

export type StatusZeile = { id: "homescreen" | "erlaubt" | "konto" | "zu"; label: string; ja: boolean; hilfe: string | null };

/** Läuft der Versand gerade (letzter Lauf vor weniger als 5 Min)? */
export const laeuftVersand = (letzterLauf: string | null, nowMs: number) => Boolean(letzterLauf && nowMs - Date.parse(letzterLauf) < LAUF_FRISCH_MS && nowMs - Date.parse(letzterLauf) > -LAUF_FRISCH_MS);

/** „Mia schickt auch bei geschlossener App“: Zeitplan + Abo + frischer Lauf */
export const schicktGeschlossen = (s: ServerStatus | null, nowMs: number) => Boolean(s && s.zeitplan && s.ziel && s.abo && laeuftVersand(s.letzterLauf, nowMs));

/** Hilfe-Satz, wenn „Mia schickt auch bei geschlossener App“ nein ist */
function zuHilfe(e: StatusEingang, name: string): string {
  if (!e.erlaubt) return "Zuerst Mitteilungen erlauben.";
  if (!e.konto) return "Dafür braucht es ein Konto (Einstellungen → Familie). Ohne Konto erinnere ich nur, während die App läuft.";
  if (!e.server) return "Ich erreiche den Server gerade nicht. Später nochmal reinschauen.";
  if (!e.server.abo) return "Dieses Handy ist noch nicht angemeldet. Einmal „Test“ tippen, dann melde ich es an.";
  if (!e.server.zeitplan || !e.server.ziel) return `Der Zeitplan im Server ist aus. Bis er läuft, erinnere ich, während ${name} läuft.`;
  return "Der Server hat sich seit ein paar Minuten nicht gemeldet. Bis dahin erinnere ich, während die App läuft.";
}

/** Die vier Zeilen in Klartext, bei jedem „nein“ ein Satz, was zu tun ist */
export function statusZeilen(e: StatusEingang, name: string): StatusZeile[] {
  const zu = schicktGeschlossen(e.server, e.nowMs);
  return [
    { id: "homescreen", label: "Auf dem Homescreen", ja: e.homescreen, hilfe: e.homescreen ? null : `Auf dem iPhone: Teilen → „Zum Home-Bildschirm“, dann ${name} dort öffnen.` },
    { id: "erlaubt", label: "Mitteilungen erlaubt", ja: e.erlaubt, hilfe: e.erlaubt ? null : `In den Einstellungen des Handys bei ${name} „Mitteilungen“ erlauben.` },
    { id: "konto", label: "Mit Konto verbunden", ja: e.konto, hilfe: e.konto ? null : "Unter Einstellungen → Familie mit der E-Mail anmelden." },
    { id: "zu", label: `${name} schickt auch bei geschlossener App`, ja: zu, hilfe: zu ? null : zuHilfe(e, name) },
  ];
}

/** Art eines Versands fürs Protokoll (nie Inhalt) */
export function artVon(key: string): string {
  if (key.startsWith("test:")) return "test";
  if (key.startsWith("erinnerung:")) return "erinnerung";
  if (key.includes(":pin:")) return "pinnwand";
  if (key.includes(":abgeben:")) return "abgeben";
  if (/^(unterwegs|einkauf|antwort):/.test(key)) return "einkauf";
  return "sonstiges";
}

/** „Test: in 1 Minute erinnern“ – die Mitteilung, wenn sie fällig ist */
export const testNachricht = (aboId: string, testId: string, title: string): PushMessage => ({
  aboId,
  key: `test:${testId}`,
  payload: { title, body: "Test geklappt. So kommen meine Erinnerungen, auch wenn die App zu ist.", href: "/profil/mitteilungen", tag: `test:${testId}` },
});
