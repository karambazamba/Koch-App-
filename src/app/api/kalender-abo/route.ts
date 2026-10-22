// Kalender-Link (Abo) abrufen: POST { url } → { ics } – nur lesen. Schutz in
// `fetchFeed` (nur https/webcal, keine privaten Adressen, 5 MB, 10 s); dazu
// ein Limit pro IP. Der Link wird nie protokolliert. Testmodus: kalender.test.

import { lookup } from "node:dns/promises";
import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { FeedError, fetchFeed, normalizeFeedUrl } from "@/lib/kalender/abo/fetchFeed";
import { mockFeed } from "@/lib/kalender/abo/mockFeed";

export const maxDuration = 15;

export async function POST(request: Request) {
  if (!allowRequest(`kalender-abo:${clientIp(request)}`, 3)) return Response.json({ error: "Gerade kamen sehr viele Abrufe – gleich nochmal?" }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === "string" ? body.url.slice(0, 2000) : "";
  if (process.env.KUECHENHELFER_MOCK === "1") {
    const url = normalizeFeedUrl(raw);
    const mock = url ? mockFeed(url) : null;
    if (mock) return Response.json({ ics: mock });
  }
  try {
    const ics = await fetchFeed(raw, {
      lookup: async (host) => (await lookup(host, { all: true })).map((a) => a.address),
      fetch: (url, init) => fetch(url, init),
    });
    return Response.json({ ics }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof FeedError ? e.message : "Den Kalender konnte ich gerade nicht abrufen." }, { status: 400 });
  }
}
