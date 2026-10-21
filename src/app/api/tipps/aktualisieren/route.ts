// Täglicher Abruf der Tipps (Vercel Cron, früh morgens): lädt die nächsten 21
// Tage für Schleswig-Holstein. Nur mit CRON_SECRET (Vercel setzt den Header
// selbst); später schreibt dieser Abruf in die Supabase-Tabelle `tips`.

import { refreshTips, tipsMode } from "@/lib/tipps/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "nein" }, { status: 401 });
  if (tipsMode() === "off") return Response.json({ source: "off", count: 0 });
  try {
    return Response.json({ source: tipsMode(), count: await refreshTips() });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
