// Tipps aus der Region: GET ?ort=Eutin&km=20&von=…&bis=…&heute=… → { source,
// ort, tips }. Bei TIPS_SOURCE=off nur { source: "off" } – dann zeigt die App
// nirgends etwas von Tipps. Keine Ortung: der Ort kommt aus den Einstellungen.

import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { tipsMode, tipsNear } from "@/lib/tipps/server";

export const maxDuration = 15;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = tipsMode();
  if (mode === "off" || url.searchParams.has("nurquelle")) return Response.json({ source: mode, ort: null, tips: [] });
  if (mode !== "demo" && !allowRequest(`tipps:${clientIp(request)}`, 3)) return Response.json({ error: "limit" }, { status: 429 });
  const ort = (url.searchParams.get("ort") ?? "Eutin").trim().slice(0, 60);
  const km = Math.min(40, Math.max(5, Number(url.searchParams.get("km")) || 20));
  const von = url.searchParams.get("von") ?? "";
  const bis = url.searchParams.get("bis") ?? "";
  const heute = url.searchParams.get("heute");
  if (!ort || /[<>{}]/.test(ort) || !DATE.test(von) || !DATE.test(bis) || bis < von) return Response.json({ error: "fehler" }, { status: 400 });
  // Höchstens 3 Wochen auf einmal
  if ((Date.parse(bis) - Date.parse(von)) / 86400000 > 21) return Response.json({ error: "fehler" }, { status: 400 });
  try {
    const data = await tipsNear({ ort, km, von, bis, today: mode === "demo" && heute && DATE.test(heute) ? heute : undefined });
    return Response.json(data, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
