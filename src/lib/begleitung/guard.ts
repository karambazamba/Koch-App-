// Gemeinsamer Schutz für ALLE KI-Aufrufe (Lotte und Kennenlernen): KI nur mit
// API-Schlüssel UND Zugangscode, Code-Prüfung in konstanter Zeit, ein
// gemeinsames Tageslimit pro Gerät. Nur auf dem Server verwenden.

import { createHash, timingSafeEqual } from "node:crypto";
import { ACCESS_HEADER, type AssistantErrorCode } from "@/lib/begleitung/protocol";
import { allowDaily, codeAttemptsLeft, noteWrongCode } from "@/lib/begleitung/rateLimit";

export function aiSetup() {
  const mock = process.env.KUECHENHELFER_MOCK === "1";
  const needsCode = Boolean(process.env.APP_ACCESS_CODE?.trim());
  // Echte KI nur mit Schlüssel UND Zugangscode – sonst könnte jeder sie nutzen
  const configured = mock || (Boolean(process.env.ANTHROPIC_API_KEY) && needsCode);
  return { mock, needsCode, configured };
}

export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unbekannt";

const digest = (s: string) => createHash("sha256").update(s).digest();

function codeMatches(given: string | null): boolean {
  const expected = process.env.APP_ACCESS_CODE?.trim();
  if (!expected || !given) return false;
  return timingSafeEqual(digest(given.trim()), digest(expected));
}

/** Prüft den mitgeschickten Zugangscode; null = in Ordnung */
export function checkAccess(request: Request): AssistantErrorCode | null {
  if (!aiSetup().needsCode) return null;
  const given = request.headers.get(ACCESS_HEADER);
  // Ohne Code: einfach ablehnen – zählt nicht als Fehlversuch
  if (!given?.trim()) return "zugangscode";
  const ip = clientIp(request);
  if (!codeAttemptsLeft(ip)) return "limit";
  if (codeMatches(given)) return null;
  noteWrongCode(ip);
  return "zugangscode";
}

/**
 * Eine KI-Anfrage dieses Geräts zählen – gemeinsames Tageslimit für alle
 * KI-Aufrufe (pro Gerät, großzügiger pro Adresse). Der Testmodus kostet nichts.
 */
export function takeDailySlot(request: Request, deviceId: string): boolean {
  if (aiSetup().mock) return true;
  return allowDaily(`gerät:${deviceId}`) && allowDaily(`ip:${clientIp(request)}`, 3);
}
