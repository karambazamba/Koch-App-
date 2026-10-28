// Lotte: Austausch zwischen App und Server (/api/lotte).

import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import type { MailDraft } from "@/lib/begleitung/mail";
import type { StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";
import type { TipView } from "@/lib/tipps/model";
import type { Forecast } from "@/lib/wetter/forecast";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type AssistantRequest = {
  /** Zufällige Geräte-Kennung für das Rate-Limit */
  deviceId: string;
  /** Heutiges Datum auf dem Gerät, "YYYY-MM-DD" */
  today: string;
  /** Bisheriger Chat, die letzte Nachricht ist die neue Frage */
  messages: ChatTurn[];
  /** Noch nicht übernommener Vorschlag ("Anpassen") – wird weitergeführt */
  pending: ChangeOp[];
  data: AssistantData;
  /** Wie viele Gesundheits-Tipps diese Woche schon gezeigt wurden */
  tipsThisWeek?: number;
  /** Uhrzeit auf dem Gerät, "HH:MM" (sonst rechnet der Server mit Berlin) */
  clock?: string;
  /** Was gerade auf der Einkaufsliste steht (Namen, ohne Abgehaktes) */
  shoppingNames?: string[];
  /** Antwort Stück für Stück (NDJSON, siehe StreamEvent) */
  stream?: boolean;
  /** Nur Prüfstand (nie aus der App): feste Vorhersage statt Abruf */
  forecast?: Forecast | null;
};

/**
 * Gestreamte Antwort: eine JSON-Zeile pro Ereignis. "text" = nächstes Stück
 * der Antwort, "round" = neue Runde nach Werkzeugen (bisher Gezeigtes ist nur
 * Zwischenstand), "done" = fertige Antwort mit Vorschlag, "error" = Abbruch.
 */
export type StreamEvent =
  | { t: "text"; d: string }
  | { t: "round" }
  | { t: "done"; reply: string; ops: ChangeOp[]; mail?: MailDraft; chips?: string[]; tips?: TipView[]; usage?: AssistantUsage }
  | { t: "error"; error: AssistantErrorCode };

/** Verbrauch einer Anfrage (fürs Guthaben später): Modellgröße, hochgeschaltet, Kosten in Millionstel US-Dollar */
export type AssistantUsage = { size: "klein" | "gross"; upgraded: boolean; micro: number | null };

export type AssistantReply = {
  reply: string;
  usage?: AssistantUsage;
  /** Kompletter Vorschlag (bisheriger + neue Änderungen) */
  ops: ChangeOp[];
  /** Mail-Entwurf als eigene Karte (nie automatisch gesendet) */
  mail?: MailDraft;
  /** Tipps aus der Region als Karten unter der Antwort */
  tips?: TipView[];
  /** Antwort-Knöpfe (z. B. "Zusagen", "Absagen", "Nachfragen") */
  chips?: string[];
  /** Nur Server: „Kann ich noch nicht“-Wünsche (werden anonym gezählt, nie an die App geschickt) */
  wishes?: string[];
};

/** Warum es gerade nicht geht – die App zeigt nie Technik-Texte, nur ihre eigene Antwort */
export type AssistantErrorCode = "zugangscode" | "limit" | "aus" | "fehler";

export type AssistantError = { error: AssistantErrorCode };

export type AssistantStatus = {
  /** KI eingerichtet (API-Schlüssel und Zugangscode gesetzt) oder Mock-Modus aktiv */
  configured: boolean;
  mock: boolean;
  /** Der Server verlangt einen Zugangscode (APP_ACCESS_CODE) */
  needsCode: boolean;
  /** Nur wenn ein Code mitgeschickt wurde: stimmt er? */
  /** Code-Prüfung: passt, passt nicht, oder nach zu vielen Fehlversuchen kurz Pause */
  access?: "ok" | "falsch" | "pause";
  /** Mias Stimme und Ohr über den Server (fehlt = Browser) */
  stimme?: StimmeStatus;
};

export const ASSISTANT_ENDPOINT = "/api/lotte";
/** Header mit dem Zugangscode der Familie */
export const ACCESS_HEADER = "x-lotte-code";

/**
 * Zugangscode nachsichtig vergleichen: Groß/klein und Leerzeichen sind egal
 * („Sonne 42“ = „sonne42“). Gilt in App und Server gleich.
 */
export const normalisiereZugangscode = (code: string) => code.normalize("NFC").replace(/\s+/g, "").toLocaleLowerCase("de-DE");

/** Grenzen, damit Anfragen klein und günstig bleiben */
export const LIMITS = {
  /** Zeichen pro Nachricht (eingefügte Mails dürfen länger sein) */
  messageChars: 6000,
  /** Mitgeschickte Chat-Nachrichten (Gesprächsverlauf) */
  historyTurns: 10,
  /** Größe der Anfrage in Bytes */
  requestBytes: 400_000,
  /** Anfragen pro Gerät und Tag */
  dailyPerDevice: 100,
};
