// Prüfstand (nur für Admin): POST { von, bis } mit „Authorization: Bearer
// <PRUEFSTAND_SECRET bzw. CRON_SECRET>“ schickt die Prüfsätze von–bis (höchstens
// 3 je Aufruf, damit Vercel nicht abbricht) durch die echte Mia-Engine mit dem echten Modell und bewertet
// sie. Mit `art: "ton"` laufen die 30 Sätze des Prüfstands „Ton“ (nur der
// Klang wird bewertet, `pruefstand/ton.ts`). Der KI-Schlüssel bleibt hier; ins Log nur Zahlen, nie Inhalte. Ohne
// Geheimnis ist die Route aus.

import Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { runAssistant, type CreateMessage, type ModelChoice } from "@/lib/begleitung/engine";
import { aiSetup } from "@/lib/begleitung/guard";
import { createMockModel } from "@/lib/begleitung/mock";
import { PRUEFSAETZE, type PruefSatz } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte, quote, type PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";
import { bewerteTon, TON_SAETZE, type TonSatz } from "@/lib/begleitung/pruefstand/ton";
import { PRUEF_HEUTE, PRUEF_UHR, pruefHaushalt, pruefWetter } from "@/lib/begleitung/pruefstand/haushalt";

export const maxDuration = 300;

const BATCH = 3;
const CHOICE: ModelChoice = process.env.LOTTE_MODEL || { small: process.env.LOTTE_SMALL_MODEL || "claude-haiku-5-5", large: process.env.LOTTE_LARGE_MODEL || "claude-sonnet-5-5" };

/** Zugang nur mit eigenem Geheimnis (zeitkonstanter Vergleich) */
function allowed(request: Request): boolean {
  const secret = process.env.PRUEFSTAND_SECRET || process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  await connection();
  if (!allowed(request)) return Response.json({ error: "zugang" }, { status: 401 });
  const { configured, mock } = aiSetup();
  if (!configured) return Response.json({ error: "aus" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { von?: unknown; bis?: unknown; art?: unknown };
  const ton = body.art === "ton";
  const saetze: (PruefSatz | TonSatz)[] = ton ? TON_SAETZE : PRUEFSAETZE;
  const von = Math.max(0, Math.floor(Number(body.von) || 0));
  const bis = Math.min(saetze.length, von + BATCH, Math.floor(Number(body.bis) || saetze.length));
  const client = mock ? null : new Anthropic({ maxRetries: 1, timeout: 55_000 });
  const create: CreateMessage = mock ? createMockModel() : (params) => client!.beta.messages.create(params) as never;
  const results: PruefErgebnis[] = [];
  for (const satz of saetze.slice(von, bis)) {
    const t0 = Date.now();
    try {
      const reply = await runAssistant(
        // Je Satz die passende Ausgangslage, Wetter aus der festen Test-Vorhersage
        { deviceId: "pruefstand", today: PRUEF_HEUTE, clock: PRUEF_UHR, messages: [{ role: "user", text: satz.text }], pending: [], data: pruefHaushalt(satz.lage), forecast: pruefWetter() },
        create,
        mock ? "mock" : CHOICE,
      );
      results.push("art" in satz ? bewerteTon(satz, reply, Date.now() - t0) : bewerte(satz, reply, Date.now() - t0));
    } catch {
      results.push({ text: satz.text, ok: false, gruende: ["Fehler beim Aufruf"], ms: Date.now() - t0, antwort: "", ops: [] });
    }
  }
  console.info("Prüfstand", { art: ton ? "ton" : "aktion", von, bis, richtig: results.filter((r) => r.ok).length, gesamt: results.length });
  return Response.json({ von, bis, gesamt: saetze.length, quote: quote(results), results });
}
