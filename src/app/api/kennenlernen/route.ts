// Kennenlernen: freie Antwort → feste Struktur per Claude (wenn eingerichtet).
// Es gelten dieselben Regeln wie für Lotte (`guard.ts`): KI nur mit Schlüssel
// UND Zugangscode, gemeinsames Tageslimit pro Gerät. Sonst 503/401/429 – die
// App erkennt dann selbst (Regeln). Im Mock liefert sie das Regel-Ergebnis.

import Anthropic from "@anthropic-ai/sdk";
import { aiRecognize, parseRecognizeRequest, ruleRecognize } from "@/lib/einstellungen/onboarding/ai";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/begleitung/guard";
import type { AssistantErrorCode } from "@/lib/begleitung/protocol";
import { allowRequest } from "@/lib/begleitung/rateLimit";

export const maxDuration = 30;

/** Schnelles Modell fürs Herauslesen, per Umgebungsvariable änderbar */
const MODEL = process.env.KENNENLERNEN_MODEL || "claude-haiku-5-5";

const fail = (code: AssistantErrorCode, status: number) => Response.json({ error: code }, { status });

export async function POST(request: Request) {
  const { configured, mock } = aiSetup();
  if (!configured) return fail("aus", 503);
  const denied = checkAccess(request);
  if (denied) return fail(denied, denied === "limit" ? 429 : 401);

  const raw = await request.text();
  if (raw.length > 4000) return fail("fehler", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("fehler", 400);
  }
  const req = parseRecognizeRequest(body);
  const device = (body as { deviceId?: unknown }).deviceId;
  if (!req || typeof device !== "string" || !/^[\w-]{8,64}$/.test(device)) return fail("fehler", 400);

  // Kennenlernen braucht viele kurze Anfragen → eigener, großzügigerer Kurzzeit-Zähler
  if (!mock && (!allowRequest(`kennenlernen:${device}`, 3) || !allowRequest(`kennenlernen-ip:${clientIp(request)}`, 9))) {
    return fail("limit", 429);
  }
  // Gemeinsames Tageslimit mit Lotte
  if (!takeDailySlot(request, device)) return fail("limit", 429);

  if (mock) return Response.json(ruleRecognize(req));
  try {
    const client = new Anthropic({ maxRetries: 1, timeout: 20_000 });
    return Response.json(await aiRecognize(req, (params) => client.messages.create(params), MODEL));
  } catch (e) {
    // Ins Log nur Art und Status – nie Schlüssel oder Inhalte
    console.error("Kennenlernen: KI-Fehler", e instanceof Anthropic.APIError ? (e.status ?? "ohne Status") : e instanceof Error ? e.name : typeof e);
    return fail(e instanceof Anthropic.RateLimitError ? "limit" : "fehler", 502);
  }
}
