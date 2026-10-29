// „Was los?“ für die App: GET ?heute=YYYY-MM-DD → { quelle, events, status }.
// Öffentlich (auch ohne Konto), 1 Stunde zwischengespeichert – die Liste ist
// für alle gleich, es geht nichts Persönliches hin oder her. `heute` wirkt
// nur bei Beispieldaten (Testbetrieb); sonst zählt der Server-Tag.

import { berlinTime } from "@/lib/core/now";
import { ladeRegion, regionQuelle } from "@/lib/region/server";

export const maxDuration = 15;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const quelle = regionQuelle();
  const gefragt = new URL(request.url).searchParams.get("heute") ?? "";
  const heute = quelle === "demo" && DATE.test(gefragt) ? gefragt : berlinTime().iso;
  try {
    const antwort = await ladeRegion(heute, { quelle });
    return Response.json(antwort, { headers: { "Cache-Control": quelle === "demo" ? "no-store" : "public, max-age=3600, s-maxage=3600" } });
  } catch {
    return Response.json({ quelle, events: [], status: null }, { status: 502 });
  }
}
