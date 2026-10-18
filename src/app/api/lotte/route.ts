// Lotte (Küchenhelfer) – KI-API: POST = Frage stellen (liefert Antwort +
// vorgeschlagene Änderungen), GET = ist die KI eingerichtet, stimmt der Code?
// Der API-Schlüssel (ANTHROPIC_API_KEY) bleibt hier auf dem Server und gelangt
// nie in die App. Ohne Schlüssel oder ohne Zugangscode (APP_ACCESS_CODE) ist
// die KI aus – die App arbeitet dann mit ihren Regeln weiter.

import { createHash, timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { AssistantInputError, parseRequest, runAssistant, type CreateMessage } from "@/lib/assistant/engine";
import { createMockModel } from "@/lib/assistant/mock";
import { ACCESS_HEADER, LIMITS, type AssistantErrorCode, type AssistantStatus } from "@/lib/assistant/protocol";
import { allowRequest, codeAttemptsLeft, noteWrongCode } from "@/lib/assistant/rateLimit";

export const maxDuration = 60;

/** Standard: das aktuelle Haiku-Modell (schnell, günstig), per Umgebungsvariable änderbar */
const MODEL = process.env.LOTTE_MODEL || process.env.KUECHENHELFER_MODEL || "claude-haiku-5-5";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Zugangscode in konstanter Zeit vergleichen */
function codeMatches(given: string | null): boolean {
  const expected = process.env.APP_ACCESS_CODE?.trim();
  if (!expected || !given) return false;
  return timingSafeEqual(digest(given.trim()), digest(expected));
}

function setup() {
  const mock = process.env.KUECHENHELFER_MOCK === "1";
  const needsCode = Boolean(process.env.APP_ACCESS_CODE?.trim());
  // Echte KI nur mit Schlüssel UND Zugangscode – sonst könnte jeder sie nutzen
  const configured = mock || (Boolean(process.env.ANTHROPIC_API_KEY) && needsCode);
  return { mock, needsCode, configured };
}

const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unbekannt";

/** Prüft den mitgeschickten Code; null = in Ordnung */
function checkAccess(request: Request): AssistantErrorCode | null {
  const { needsCode } = setup();
  if (!needsCode) return null;
  const ip = clientIp(request);
  if (!codeAttemptsLeft(ip)) return "limit";
  if (codeMatches(request.headers.get(ACCESS_HEADER))) return null;
  noteWrongCode(ip);
  return "zugangscode";
}

const fail = (code: AssistantErrorCode, status: number) => Response.json({ error: code }, { status });

export async function GET(request: Request) {
  await connection(); // zur Laufzeit prüfen, nicht beim Bauen
  const { mock, needsCode, configured } = setup();
  const status: AssistantStatus = { configured, mock, needsCode };
  if (configured && needsCode && request.headers.has(ACCESS_HEADER)) {
    status.access = checkAccess(request) === null ? "ok" : "falsch";
  }
  return Response.json(status);
}

export async function POST(request: Request) {
  const { configured, mock } = setup();
  if (!configured) return fail("aus", 503);
  const denied = checkAccess(request);
  if (denied) return fail(denied, denied === "limit" ? 429 : 401);

  const raw = await request.text();
  if (raw.length > LIMITS.requestBytes) return fail("fehler", 413);
  let req;
  try {
    req = parseRequest(JSON.parse(raw));
  } catch (e) {
    if (!(e instanceof AssistantInputError)) console.error("Lotte: Anfrage ungültig");
    return fail("fehler", 400);
  }

  // Testmodus kostet nichts – dort keine Mengengrenzen
  if (!mock && (!allowRequest(`gerät:${req.deviceId}`) || !allowRequest(`ip:${clientIp(request)}`, 3))) return fail("limit", 429);

  let create: CreateMessage;
  if (mock) {
    create = createMockModel();
  } else {
    const client = new Anthropic({ maxRetries: 1, timeout: 45_000 });
    create = (params) => client.beta.messages.create(params);
  }

  try {
    return Response.json(await runAssistant(req, create, mock ? "mock" : MODEL));
  } catch (e) {
    // Ins Log nur Art und Status – nie Schlüssel oder Inhalte
    if (e instanceof Anthropic.APIError) {
      console.error("Lotte: KI-Fehler", e.status ?? "ohne Status", e.constructor.name);
      if (e instanceof Anthropic.RateLimitError) return fail("limit", 429);
      return fail("fehler", 502);
    }
    console.error("Lotte: Fehler", e instanceof Error ? e.name : typeof e);
    return fail("fehler", 500);
  }
}
