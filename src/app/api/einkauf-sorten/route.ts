// Einkauf: Sorte für unbekannte Sachen per KI (A-067). Es gelten dieselben
// Regeln wie für Mia (`guard.ts`): KI nur mit Schlüssel UND Zugangscode,
// gemeinsames Tageslimit pro Gerät. Ohne KI (503) bleibt die Sache beim
// Hauptladen. Im Mock: nichts eingeordnet.

import Anthropic from "@anthropic-ai/sdk";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/begleitung/guard";
import type { AssistantErrorCode } from "@/lib/begleitung/protocol";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { SORTEN_SYSTEM, parseSortenAnfrage, parseSortenAntwort, sortenNachricht } from "@/lib/einkauf/sorten/ki";

export const maxDuration = 30;

/** Schnelles Modell (Alltag), per Umgebungsvariable änderbar */
const MODEL = process.env.SORTEN_MODEL || "claude-haiku-5-5";

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
  const anfrage = parseSortenAnfrage(body);
  const device = (body as { deviceId?: unknown }).deviceId;
  if (!anfrage || typeof device !== "string" || !/^[\w-]{8,64}$/.test(device)) return fail("fehler", 400);
  if (!mock && (!allowRequest(`sorten:${device}`, 2) || !allowRequest(`sorten-ip:${clientIp(request)}`, 6))) return fail("limit", 429);
  if (!takeDailySlot(request, device)) return fail("limit", 429);

  if (mock) return Response.json({ sorten: {} });
  try {
    const client = new Anthropic({ maxRetries: 1, timeout: 15_000 });
    const msg = await client.messages.create({ model: MODEL, max_tokens: 800, system: SORTEN_SYSTEM, messages: [{ role: "user", content: sortenNachricht(anfrage) }] });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    return Response.json({ sorten: parseSortenAntwort(text, anfrage) });
  } catch (e) {
    // Ins Log nur Art und Status – nie Schlüssel oder Inhalte
    console.error("Sorten: KI-Fehler", e instanceof Anthropic.APIError ? (e.status ?? "ohne Status") : e instanceof Error ? e.name : typeof e);
    return fail(e instanceof Anthropic.RateLimitError ? "limit" : "fehler", 502);
  }
}
