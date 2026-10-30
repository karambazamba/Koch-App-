// „Test: in 1 Minute erinnern“ (A-069): legt für das eigene Abo dieses Geräts
// eine Test-Erinnerung an, die der nächste Versand-Lauf nach einer Minute
// schickt – so lässt sich die App schließen und prüfen. Nur mit Sitzung,
// höchstens alle paar Sekunden; gespeichert wird nur Abo und Zeit.

import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { now } from "@/lib/core/now";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { restClient } from "@/lib/heute/mitteilungen/serverRest";
import { eigenesAbo, fragender } from "@/lib/heute/mitteilungen/pushKonto";

export async function POST(request: Request) {
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  if (!allowRequest(`push-test:${clientIp(request)}`, 3)) return Response.json({ error: "zu_viele" }, { status: 429 });
  const f = await fragender(request);
  if (!f) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
  const abo = await eigenesAbo(f, typeof body.endpoint === "string" ? body.endpoint : null);
  if (!abo) return Response.json({ error: "kein_abo" }, { status: 404 });
  const faellig = new Date(now().getTime() + 60_000).toISOString();
  const res = await restClient(pub.url, key)("push_tests", { method: "POST", prefer: "return=minimal", body: { abo_id: abo, faellig } }).catch(() => null);
  return res?.ok ? Response.json({ ok: true, faellig }) : Response.json({ error: "fehler" }, { status: 502 });
}
