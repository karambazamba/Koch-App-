// Küchenhelfer-API: POST = Frage stellen (liefert Antwort + vorgeschlagene
// Änderungen), GET = ist die KI eingerichtet? Der API-Schlüssel bleibt hier
// auf dem Server (ANTHROPIC_API_KEY, z. B. in Vercel gesetzt).

import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { AssistantInputError, parseRequest, runAssistant, type CreateMessage } from "@/lib/assistant/engine";
import { createMockModel } from "@/lib/assistant/mock";
import { LIMITS, type AssistantError, type AssistantStatus } from "@/lib/assistant/protocol";
import { allowRequest } from "@/lib/assistant/rateLimit";

export const maxDuration = 60;

/** Modell laut Wunsch: Sonnet (aktuell), per Umgebungsvariable änderbar */
const MODEL = process.env.KUECHENHELFER_MODEL || "claude-sonnet-5-5";

function status(): AssistantStatus {
  const mock = process.env.KUECHENHELFER_MOCK === "1";
  return { configured: mock || Boolean(process.env.ANTHROPIC_API_KEY), mock };
}

const error = (message: string, code: number) => Response.json({ error: message } satisfies AssistantError, { status: code });

export async function GET() {
  await connection(); // zur Laufzeit prüfen, nicht beim Bauen
  return Response.json(status());
}

export async function POST(request: Request) {
  const { configured, mock } = status();
  if (!configured) return error("Die KI ist noch nicht eingerichtet.", 503);

  const raw = await request.text();
  if (raw.length > LIMITS.requestBytes) return error("Die Anfrage ist zu groß.", 413);
  let req;
  try {
    req = parseRequest(JSON.parse(raw));
  } catch (e) {
    return error(e instanceof AssistantInputError ? e.message : "Die Anfrage war ungültig.", 400);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unbekannt";
  if (!allowRequest(`gerät:${req.deviceId}`) || !allowRequest(`ip:${ip}`, 3)) {
    return error("Kurze Pause bitte – du hast gerade sehr viele Fragen gestellt. Versuch es gleich noch einmal.", 429);
  }

  let create: CreateMessage;
  if (mock) {
    create = createMockModel();
  } else {
    const client = new Anthropic({ maxRetries: 1, timeout: 50_000 });
    create = (params) => client.beta.messages.create(params);
  }

  try {
    return Response.json(await runAssistant(req, create, mock ? "mock" : MODEL));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return error("Die KI ist gerade sehr gefragt. Bitte gleich noch einmal versuchen.", 429);
    if (e instanceof Anthropic.AuthenticationError) return error("Der KI-Zugang ist falsch eingerichtet (API-Schlüssel prüfen).", 502);
    if (e instanceof Anthropic.APIConnectionTimeoutError) return error("Das hat zu lange gedauert. Versuch es mit einer kürzeren Frage.", 504);
    if (e instanceof Anthropic.APIError) {
      console.error("Küchenhelfer API-Fehler", e.status, e.message);
      return error("Die KI hat gerade ein Problem. Bitte später noch einmal versuchen.", 502);
    }
    console.error("Küchenhelfer Fehler", e);
    return error("Da ist etwas schiefgelaufen. Bitte noch einmal versuchen.", 500);
  }
}
