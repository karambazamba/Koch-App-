// „Was los?“ täglich um 5:00 Uhr Berlin (Vercel Cron, zwei Einträge 3:00 und
// 4:00 UTC – es läuft nur der, der in Berlin auf 5 Uhr fällt; Sommer- und
// Winterzeit). Nur mit CRON_SECRET (Vercel setzt den Header selbst).
// `?jetzt=1` = sofort (zum Testen von Hand, auch nur mit dem Geheimnis).
// Ins Protokoll nur Zahlen und ein Kurzwort, nie Inhalte.

import { berlinTime } from "@/lib/core/now";
import { supabaseSecret } from "@/lib/konten/serverEnv";
import { aktualisiereRegion, regionQuelle, supabaseSpeicher } from "@/lib/region/server";

export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "nein" }, { status: 401 });
  const { iso, minutes } = berlinTime();
  const sofort = new URL(request.url).searchParams.get("jetzt") === "1";
  if (!sofort && Math.floor(minutes / 60) !== 5) return Response.json({ uebersprungen: true });
  const t0 = Date.now();
  try {
    const r = await aktualisiereRegion({ quelle: regionQuelle(), heute: iso, speicher: supabaseSpeicher(supabaseSecret()) });
    console.info("Was los", { quelle: r.quelle, treffer: r.treffer, seiten: r.seiten, grund: r.grund, ms: Date.now() - t0 });
    return Response.json(r);
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
