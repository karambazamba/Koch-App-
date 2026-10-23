// Lotte – KI-API: POST = Frage stellen (Antwort Stück für Stück als NDJSON
// bzw. als JSON + vorgeschlagene Änderungen), GET = ist die KI eingerichtet,
// stimmt der Code?
// Der API-Schlüssel (ANTHROPIC_API_KEY) bleibt hier auf dem Server und gelangt
// nie in die App. Ohne Schlüssel oder ohne Zugangscode (APP_ACCESS_CODE) ist
// die KI aus – die App arbeitet dann mit ihren Regeln weiter.

import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { AssistantInputError, parseRequest, runAssistant, type CreateMessage, type ModelChoice } from "@/lib/begleitung/engine";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/begleitung/guard";
import { createMockModel } from "@/lib/begleitung/mock";
import { ACCESS_HEADER, LIMITS, type AssistantErrorCode, type AssistantStatus, type StreamEvent } from "@/lib/begleitung/protocol";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { cleanWish } from "@/lib/begleitung/wishTools";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 60;

/**
 * Modell fürs Gespräch: Haiku für Alltägliches, Sonnet für Planen, Rezepte,
 * Mails – Haiku schaltet selbst hoch, wenn eine Aufgabe zu groß wird.
 * LOTTE_MODEL legt ein festes Modell fest; LOTTE_SMALL_MODEL/LOTTE_LARGE_MODEL ändern die beiden.
 */
const FIXED = process.env.LOTTE_MODEL || process.env.KUECHENHELFER_MODEL;
const CHOICE: ModelChoice = FIXED || { small: process.env.LOTTE_SMALL_MODEL || "claude-haiku-5-5", large: process.env.LOTTE_LARGE_MODEL || "claude-sonnet-5-5" };

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
  const model: ModelChoice = mock ? "mock" : CHOICE;

  if (!req.stream) {
    try {
      const { wishes, ...result } = await runAssistant(req, create, model);
      void recordWishes(wishes, req.today);
      return Response.json(result);
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
        void recordWishes(result.wishes, req.today);
        send({ t: "done", reply: result.reply, ops: result.ops, mail: result.mail, chips: result.chips, tips: result.tips, usage: result.usage });
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

/**
 * „Kann ich noch nicht“-Wünsche anonym zählen (Tabelle mia_wuensche: Text +
 * Datum, keine Person, kein Haushalt, keine IP). Ohne Supabase passiert
 * nichts; Fehler werden still verschluckt. Nie Inhalte ins Log.
 */
async function recordWishes(wishes: string[] | undefined, today: string): Promise<void> {
  const clean = (wishes ?? []).map(cleanWish).filter((w): w is string => w !== null).slice(0, 3);
  const pub = supabasePublic();
  const secret = supabaseSecret();
  if (!clean.length || !pub || !secret) return;
  try {
    await fetch(`${pub.url}/rest/v1/mia_wuensche`, {
      method: "POST",
      headers: { apikey: secret, authorization: `Bearer ${secret}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(clean.map((text) => ({ text, tag: today }))),
    });
  } catch {
    // still – Zählen ist nur Statistik
  }
}
