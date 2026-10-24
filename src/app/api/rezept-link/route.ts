// Rezept-Link lesen: POST { url } → { rezept } – nur Titel, Bild-Adresse,
// Portionen, Zutaten und Quelle (schema.org/Recipe). Derselbe Schutz wie bei
// Kalender-Links (`fetchPage`: nur https, keine privaten Adressen, 5 MB,
// 10 s) und ein Limit pro IP. Nichts wird gespeichert oder protokolliert.
// Testmodus: rezept.test.

import { lookup } from "node:dns/promises";
import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { FeedError, fetchPage, normalizeFeedUrl } from "@/lib/kalender/abo/fetchFeed";
import { readRecipePage } from "@/lib/essen/rezeptLink/lesen";
import { mockRezeptSeite } from "@/lib/essen/rezeptLink/mock";

export const maxDuration = 15;

const NICHTS = "Auf der Seite finde ich kein Rezept – magst du mir die Zutaten einfach sagen?";

export async function POST(request: Request) {
  if (!allowRequest(`rezept-link:${clientIp(request)}`, 5)) return Response.json({ error: "Gerade kamen sehr viele Links – gleich nochmal?" }, { status: 429 });
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === "string" ? body.url.slice(0, 2000).trim() : "";
  const url = normalizeFeedUrl(raw);
  if (!url) return Response.json({ error: "Das ist kein Link – er beginnt mit https://." }, { status: 400 });
  try {
    const mock = process.env.KUECHENHELFER_MOCK === "1" ? mockRezeptSeite(url) : null;
    const html =
      mock ??
      (await fetchPage(url.toString(), {
        lookup: async (host) => (await lookup(host, { all: true })).map((a) => a.address),
        fetch: (u, init) => fetch(u, init),
      }));
    const rezept = readRecipePage(html, url.toString());
    if (!rezept) return Response.json({ error: NICHTS }, { status: 404 });
    return Response.json({ rezept }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof FeedError ? e.message : "Die Seite konnte ich gerade nicht öffnen." }, { status: 400 });
  }
}
