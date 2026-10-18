// Kennenlernen: freie Antwort → feste Struktur per Claude (wenn eingerichtet).
// Ohne Schlüssel antwortet die Route mit 503 – die App erkennt dann selbst
// (Regeln). Im Mock liefert sie das Regel-Ergebnis.

import Anthropic from "@anthropic-ai/sdk";
import { aiRecognize, parseRecognizeRequest, ruleRecognize } from "@/lib/onboarding/ai";
import { allowRequest } from "@/lib/assistant/rateLimit";

export const maxDuration = 30;

/** Schnelles Modell fürs Herauslesen, per Umgebungsvariable änderbar */
const MODEL = process.env.KENNENLERNEN_MODEL || "claude-haiku-5-5";

const error = (message: string, code: number) => Response.json({ error: message }, { status: code });

export async function POST(request: Request) {
  const mock = process.env.KUECHENHELFER_MOCK === "1";
  if (!mock && !process.env.ANTHROPIC_API_KEY) return error("Die KI ist noch nicht eingerichtet.", 503);

  const raw = await request.text();
  if (raw.length > 4000) return error("Die Anfrage ist zu groß.", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error("Die Anfrage war ungültig.", 400);
  }
  const req = parseRecognizeRequest(body);
  const device = (body as { deviceId?: unknown }).deviceId;
  if (!req || typeof device !== "string" || !/^[\w-]{8,64}$/.test(device)) return error("Die Anfrage war ungültig.", 400);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unbekannt";
  // Kennenlernen braucht viele kurze Anfragen → eigener, großzügigerer Zähler
  if (!allowRequest(`kennenlernen:${device}`, 3) || !allowRequest(`kennenlernen-ip:${ip}`, 9)) {
    return error("Kurze Pause bitte.", 429);
  }

  if (mock) return Response.json(ruleRecognize(req));
  try {
    const client = new Anthropic({ maxRetries: 1, timeout: 20_000 });
    return Response.json(await aiRecognize(req, (params) => client.messages.create(params), MODEL));
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("Kennenlernen API-Fehler", e.status, e.message);
    else console.error("Kennenlernen Fehler", e);
    return error("Die KI hat gerade ein Problem.", 502);
  }
}
