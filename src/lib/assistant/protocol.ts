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
};

export type AssistantReply = {
  reply: string;
  /** Kompletter Vorschlag (bisheriger + neue Änderungen) */
  ops: ChangeOp[];
};

export type AssistantError = { error: string };

export type AssistantStatus = {
  /** KI eingerichtet (API-Schlüssel gesetzt) oder Mock-Modus aktiv */
  configured: boolean;
  mock: boolean;
};

export const ASSISTANT_ENDPOINT = "/api/kuechenhelfer";

/** Grenzen, damit Anfragen klein und günstig bleiben */
export const LIMITS = {
  /** Zeichen pro Nachricht */
  messageChars: 1500,
  /** Mitgeschickte Chat-Nachrichten */
  historyTurns: 12,
  /** Größe der Anfrage in Bytes */
  requestBytes: 600_000,
};
