// Abo eines Geräts speichern (POST) bzw. löschen (DELETE) – mit der Sitzung
// des Kontos („Authorization: Bearer …“). Geschrieben wird ALS dieses Konto,
// RLS sorgt dafür, dass nur eigene Abos im eigenen Haushalt gehen. Nichts
// wird protokolliert.

import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { supabasePublic } from "@/lib/konten/serverEnv";
import { restClient } from "@/lib/heute/mitteilungen/serverRest";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

async function asUser(request: Request) {
  const pub = supabasePublic();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!pub || !token) return null;
  return { rest: restClient(pub.url, pub.key, token) };
}

export async function POST(request: Request) {
  if (!allowRequest(`push-abo:${clientIp(request)}`)) return Response.json({ error: "zu_viele" }, { status: 429 });
  const user = await asUser(request);
  if (!user) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { subscription?: Sub; settings?: unknown };
  const endpoint = str(body.subscription?.endpoint, 1000);
  const p256dh = str(body.subscription?.keys?.p256dh, 200);
  const auth = str(body.subscription?.keys?.auth, 100);
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) return Response.json({ error: "ungueltig" }, { status: 400 });
  const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
  try {
    const me = await user.rest<{ household_id: string }[]>("members?select=household_id&limit=1");
    if (!me.ok) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
    // RLS zeigt nur Mitglieder des eigenen Haushalts – alle haben denselben
    const household = me.data?.[0]?.household_id ?? null;
    const saved = await user.rest("push_abos?on_conflict=endpoint", { method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: { endpoint, p256dh, auth, household_id: household, settings } });
    return saved.ok ? Response.json({ ok: true }) : Response.json({ error: "fehler" }, { status: 502 });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await asUser(request);
  if (!user) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
  const endpoint = str(body.endpoint, 1000);
  if (!endpoint) return Response.json({ error: "ungueltig" }, { status: 400 });
  const res = await user.rest(`push_abos?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE" }).catch(() => null);
  return res?.ok ? Response.json({ ok: true }) : Response.json({ error: "fehler" }, { status: 502 });
}
