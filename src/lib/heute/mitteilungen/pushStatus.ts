// Erinnerungen bei geschlossener App (A-069), rein: der ehrliche Status für
// Einstellungen → Mitteilungen, die Test-Erinnerung und die Art eines
// Versands fürs Protokoll (nie Inhalt). Server und Gerät nutzen dasselbe.

import type { PushMessage } from "@/lib/heute/mitteilungen/versand";

/** Letzter Versand-Lauf gilt als „läuft“, wenn er höchstens so alt ist */
const LAUF_FRISCH_MS = 5 * 60_000;

/** Warum die Anmeldung dieses Geräts nicht geklappt hat (A-069) */
export const ANMELDE_FEHLER = ["schluessel_fehlt", "schluessel_ungueltig", "tabelle_fehlt", "push_abgelehnt", "konto_abgelehnt", "abo_abgelehnt", "kein_service_worker", "server_fehler", "offline"] as const;
export type AnmeldeFehler = (typeof ANMELDE_FEHLER)[number];

/** Satz je Ursache – was zu tun ist (ohne Technik, wo es geht) */
export function anmeldeText(code: AnmeldeFehler, name: string): string {
  return {
    schluessel_fehlt: "Auf dem Server ist der geheime Supabase-Schlüssel nicht hinterlegt (Vercel → Einstellungen → Umgebungsvariablen). Ohne ihn kann ich dieses Handy nicht anmelden.",
    schluessel_ungueltig: "Der Server-Schlüssel für Supabase passt nicht mehr (in Vercel neu verbinden). Bis dahin erinnere ich, während die App läuft.",
    tabelle_fehlt: "Die Server-Datenbank ist noch nicht auf Stand (Migration nicht gelaufen). Bis dahin erinnere ich, während die App läuft.",
    push_abgelehnt: `Das Handy hat die Anmeldung für Mitteilungen abgelehnt. ${name} vom Homescreen löschen, neu hinlegen und Mitteilungen erlauben.`,
    konto_abgelehnt: "Die Anmeldung im Konto ist abgelaufen. Unter Einstellungen → Familie einmal ab- und wieder anmelden.",
    abo_abgelehnt: "Der Server hat das Handy nicht angenommen (Konto ohne Haushalt oder ohne Rechte). Unter Einstellungen → Familie prüfen, ob du im Haushalt bist.",
    kein_service_worker: `${name} läuft noch nicht ganz im Hintergrund. Einmal ganz schließen und neu öffnen.`,
    server_fehler: "Der Server hat sich verschluckt. Gleich nochmal versuchen.",
    offline: "Gerade keine Verbindung. Gleich nochmal versuchen.",
  }[code];
}

/** Was der Server über den Versand weiß (`/api/push/status`) */
export type ServerStatus = {
  /** Migration 20261112120000_push_zuverlaessig ist gelaufen (Status-Abfrage vorhanden) */
  migration?: boolean;
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
  /** Letzter Fehler-Code der Anmeldung dieses Geräts (null = keiner) */
  anmeldung?: AnmeldeFehler | null;
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
  if (!e.server) return e.anmeldung ? anmeldeText(e.anmeldung, name) : "Ich erreiche den Server gerade nicht. Später nochmal reinschauen.";
  if (e.server.migration === false) return anmeldeText("tabelle_fehlt", name);
  if (!e.server.abo) return e.anmeldung ? anmeldeText(e.anmeldung, name) : "Dieses Handy ist noch nicht angemeldet. Einmal „Test“ tippen, dann melde ich es an.";
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
