// Küchenhelfer: Austausch zwischen App und Server (/api/kuechenhelfer).

import type { AssistantData, ChangeOp } from "./ops";

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
};

export type AssistantReply = {
  reply: string;
  /** Kompletter Vorschlag (bisheriger + neue Änderungen) */
  ops: ChangeOp[];
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
  access?: "ok" | "falsch";
};

export const ASSISTANT_ENDPOINT = "/api/lotte";
/** Header mit dem Zugangscode der Familie */
export const ACCESS_HEADER = "x-lotte-code";

/** Grenzen, damit Anfragen klein und günstig bleiben */
export const LIMITS = {
  /** Zeichen pro Nachricht */
  messageChars: 1500,
  /** Mitgeschickte Chat-Nachrichten */
  historyTurns: 12,
  /** Größe der Anfrage in Bytes */
  requestBytes: 400_000,
  /** Anfragen pro Gerät und Tag */
  dailyPerDevice: 100,
};
