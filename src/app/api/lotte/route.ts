// Lotte – KI-API: POST = Frage stellen (Antwort Stück für Stück als NDJSON
// bzw. als JSON + vorgeschlagene Änderungen), GET = ist die KI eingerichtet,
// stimmt der Code?
// Der API-Schlüssel (ANTHROPIC_API_KEY) bleibt hier auf dem Server und gelangt
// nie in die App. Ohne Schlüssel oder ohne Zugangscode (APP_ACCESS_CODE) ist
// die KI aus – die App arbeitet dann mit ihren Regeln weiter.

import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { AssistantInputError, parseRequest, runAssistant, type CreateMessage } from "@/lib/lotte/engine";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/lotte/guard";
import { createMockModel } from "@/lib/lotte/mock";
import { ACCESS_HEADER, LIMITS, type AssistantErrorCode, type AssistantStatus, type StreamEvent } from "@/lib/lotte/protocol";
import { allowRequest } from "@/lib/lotte/rateLimit";

export const maxDuration = 60;

/** Fürs Gespräch das aktuelle Sonnet (klug und schnell), per Umgebungsvariable änderbar */
const MODEL = process.env.LOTTE_MODEL || process.env.KUECHENHELFER_MODEL || "claude-sonnet-5-5";

const fail = (code: AssistantErrorCode, status: number) => Response.json({ error: code }, { status });

export async function GET(request: Request) {
  await connection(); // zur Laufzeit prüfen, nicht beim Bauen
  const { mock, needsCode, configured } = aiSetup();
  const status: AssistantStatus = { configured, mock, needsCode };
  if (configured && needsCode && request.headers.has(ACCESS_HEADER)) {
    status.access = checkAccess(request) === null ? "ok" : "falsch";
  }
  return Response.json(status);
}

export async function POST(request: Request) {
  const { configured, mock } = aiSetup();
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
  if (!mock && (!allowRequest(`lotte:${req.deviceId}`) || !allowRequest(`lotte-ip:${clientIp(request)}`, 3))) return fail("limit", 429);
  if (!takeDailySlot(request, req.deviceId)) return fail("limit", 429);

  let create: CreateMessage;
  if (mock) {
    create = createMockModel();
  } else {
    const client = new Anthropic({ maxRetries: 1, timeout: 55_000 });
    // Gestreamt: Text geht sofort weiter, am Ende die vollständige Nachricht
    create = (params, onText) => {
      const stream = client.beta.messages.stream(params);
      if (onText) stream.on("text", (delta) => onText(delta));
      return stream.finalMessage();
    };
  }
  const model = mock ? "mock" : MODEL;

  if (!req.stream) {
    try {
      return Response.json(await runAssistant(req, create, model));
    } catch (e) {
      const code = errorCode(e);
      return fail(code, code === "limit" ? 429 : 502);
    }
  }

  // Antwort Stück für Stück: eine JSON-Zeile pro Ereignis
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await runAssistant(req, create, model, { onText: (d) => send({ t: "text", d }), onRound: () => send({ t: "round" }) });
        send({ t: "done", reply: result.reply, ops: result.ops });
      } catch (e) {
        send({ t: "error", error: errorCode(e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Fehlerart für die App; ins Log nur Art und Status – nie Schlüssel oder Inhalte */
function errorCode(e: unknown): AssistantErrorCode {
  if (e instanceof Anthropic.APIError) {
    console.error("Lotte: KI-Fehler", e.status ?? "ohne Status", e.constructor.name);
    return e instanceof Anthropic.RateLimitError ? "limit" : "fehler";
  }
  console.error("Lotte: Fehler", e instanceof Error ? e.name : typeof e);
  return "fehler";
}
