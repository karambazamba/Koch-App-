// Abo eines Geräts speichern (POST) bzw. löschen (DELETE) – mit der Sitzung
// des Kontos („Authorization: Bearer …“). Gespeichert wird ALS dieses Konto
// über push_abo_speichern() (setzt Konto und Haushalt selbst, ersetzt den
// Eintrag eines anderen Kontos auf demselben Gerät); gelöscht mit RLS. Nichts
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
    // A-069: über push_abo_speichern() (security definer) – das Upsert über PostgREST setzte auch endpoint,
    // dafür hat „authenticated“ kein UPDATE-Recht (42501 → 403). Konto und Haushalt setzt die Funktion selbst.
    const saved = await user.rest("rpc/push_abo_speichern", { method: "POST", body: { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_settings: settings } });
    if (saved.ok) return Response.json({ ok: true });
    if ((saved.data as { code?: string } | null)?.code === "28000") return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
    // A-069: genau sagen, woran es liegt (Tabelle fehlt, RLS/Konto abgelehnt)
    const error = saved.status === 404 ? "tabelle_fehlt" : saved.status === 401 || saved.status === 403 ? "abgelehnt" : "fehler";
    return Response.json({ error }, { status: saved.status === 401 || saved.status === 403 ? 403 : 502 });
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
