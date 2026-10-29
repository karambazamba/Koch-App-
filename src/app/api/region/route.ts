// „Was los?“ für die App: GET ?heute=YYYY-MM-DD → { quelle, events, status }.
// Öffentlich (auch ohne Konto), 1 Stunde zwischengespeichert – die Liste ist
// für alle gleich, es geht nichts Persönliches hin oder her. `heute` wirkt
// nur bei Beispieldaten (Testbetrieb); sonst zählt der Server-Tag.
// Lief der Abruf noch nie (frisch ausgeliefert), holt diese Route ihn einmal
// nach der Antwort nach (`after`, siehe `ersterLauf`) und lässt sich bis
// dahin nur kurz zwischenspeichern.

import { after } from "next/server";
import { berlinTime } from "@/lib/core/now";
import { supabaseSecret } from "@/lib/konten/serverEnv";
import { ersterLauf, ladeRegion, nochNieGelaufen, regionQuelle, supabaseSpeicher } from "@/lib/region/server";

/** Reicht auch für den einmaligen ersten Abruf beim Kreis (etwa 45 s) */
export const maxDuration = 120;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const quelle = regionQuelle();
  const gefragt = new URL(request.url).searchParams.get("heute") ?? "";
  const heute = quelle === "demo" && DATE.test(gefragt) ? gefragt : berlinTime().iso;
  try {
    const antwort = await ladeRegion(heute, { quelle });
    const erst = quelle === "kreisoh" && (nochNieGelaufen(antwort.status) || antwort.status?.grund === "laeuft");
    if (erst) after(() => ersterLauf(heute, { quelle, speicher: supabaseSpeicher(supabaseSecret()) }).catch(() => false));
    const cache = quelle === "demo" ? "no-store" : erst ? "public, max-age=60, s-maxage=60" : "public, max-age=3600, s-maxage=3600";
    return Response.json(antwort, { headers: { "Cache-Control": cache } });
  } catch {
    return Response.json({ quelle, events: [], status: null }, { status: 502 });
  }
}
