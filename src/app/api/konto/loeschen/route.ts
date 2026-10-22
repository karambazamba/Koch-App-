// Konto löschen (DSGVO): POST mit „Authorization: Bearer <Sitzung>“. Der
// Server prüft die Sitzung bei Supabase und löscht das Konto mit dem geheimen
// Schlüssel (nie im Browser). Mitgliedschaft und Profil gehen mit (Fremd-
// schlüssel), ein leerer Haushalt wird gelöscht. Nichts wird protokolliert.

import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { kontenTest, supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { testKonten } from "@/lib/konten/testServer";

export async function POST(request: Request) {
  if (!allowRequest(`konto-loeschen:${clientIp(request)}`)) return Response.json({ error: "zu_viele" }, { status: 429 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  if (kontenTest()) return Response.json(testKonten({ action: "delete_account", token }));
  const pub = supabasePublic();
  const secret = supabaseSecret();
  if (!pub || !secret) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  try {
    const me = await fetch(`${pub.url}/auth/v1/user`, { headers: { apikey: pub.key, authorization: `Bearer ${token}` } });
    if (!me.ok) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
    const user = (await me.json()) as { id?: string };
    if (!user.id) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
    const del = await fetch(`${pub.url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE", headers: { apikey: secret, authorization: `Bearer ${secret}` } });
    if (!del.ok) return Response.json({ error: "fehler" }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
