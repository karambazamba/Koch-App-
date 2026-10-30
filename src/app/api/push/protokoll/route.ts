// „Für Entwickler“ → Mitteilungen (A-069): letzter Versand-Lauf, Zahl der
// Abos im eigenen Haushalt und die letzten 10 Versände des Haushalts – nur
// Zeit, Art und Status, nie Inhalt. Nur mit Sitzung.

import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { restClient } from "@/lib/heute/mitteilungen/serverRest";
import { fragender } from "@/lib/heute/mitteilungen/pushKonto";

type Zeile = { at: string; art: string; status: string };

export async function GET(request: Request) {
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  const f = await fragender(request);
  if (!f) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  if (!f.household) return Response.json({ letzterLauf: null, abos: 0, versaende: [] });
  const admin = restClient(pub.url, key);
  try {
    const [lauf, abos, versaende] = await Promise.all([
      admin<{ at: string }[]>("push_laeufe?select=at&order=at.desc&limit=1"),
      admin<{ id: string }[]>(`push_abos?select=id&household_id=eq.${f.household}`),
      admin<Zeile[]>(`push_protokoll?select=at,art,status&household_id=eq.${f.household}&order=at.desc&limit=10`),
    ]);
    return Response.json({ letzterLauf: lauf.data?.[0]?.at ?? null, abos: abos.data?.length ?? 0, versaende: versaende.data ?? [] });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
