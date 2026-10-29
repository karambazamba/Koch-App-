// Mias Nachschub (A-052): neue Witze (Wundertüte) und Rätsel per KI, damit
// „Noch eine ›“ nie eine Wiederholung zeigt. Nur Witze und Rätsel – Platt
// und Angeberwissen kommen nur geprüft aus Paketen. Es gelten dieselben
// Regeln wie für Mia (`guard.ts`): KI nur mit Schlüssel UND Zugangscode,
// gemeinsames Tageslimit pro Gerät. Sonst 503/401/429 – die App zeigt dann
// „Neue … kommen bald.“, nie eine Wiederholung. Im Testmodus
// (`KUECHENHELFER_MOCK=1`) feste Karten. Der Schlüssel bleibt auf dem Server;
// ins Protokoll nur Art und Status.

import Anthropic from "@anthropic-ai/sdk";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/begleitung/guard";
import { alltagsModell } from "@/lib/begleitung/modellwahl";
import type { AssistantErrorCode } from "@/lib/begleitung/protocol";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { kiKarten, mockKarten, parseKiAnfrage, pruefeKiKarte } from "@/lib/wundertuete/kiKarte";

export const maxDuration = 30;

const fail = (code: AssistantErrorCode, status: number) => Response.json({ error: code }, { status });

export async function POST(request: Request) {
  const { configured, mock } = aiSetup();
  if (!configured) return fail("aus", 503);
  const denied = checkAccess(request);
  if (denied) return fail(denied, denied === "limit" ? 429 : 401);

  const raw = await request.text();
  if (raw.length > 1000) return fail("fehler", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("fehler", 400);
  }
  const req = parseKiAnfrage(body);
  const device = (body as { deviceId?: unknown }).deviceId;
  if (!req || typeof device !== "string" || !/^[\w-]{8,64}$/.test(device)) return fail("fehler", 400);

  if (!mock && (!allowRequest(`nachschub:${device}`) || !allowRequest(`nachschub-ip:${clientIp(request)}`, 3))) return fail("limit", 429);
  if (!takeDailySlot(request, device)) return fail("limit", 429);

  if (mock) return Response.json({ karten: mockKarten(req).flatMap((k) => pruefeKiKarte(req.art, k) ?? []) });
  try {
    const client = new Anthropic({ maxRetries: 1, timeout: 20_000 });
    return Response.json({ karten: await kiKarten(req, (params) => client.messages.create(params), alltagsModell()) });
  } catch (e) {
    console.error("Nachschub: KI-Fehler", e instanceof Anthropic.APIError ? (e.status ?? "ohne Status") : e instanceof Error ? e.name : typeof e);
    return fail(e instanceof Anthropic.RateLimitError ? "limit" : "fehler", 502);
  }
}
