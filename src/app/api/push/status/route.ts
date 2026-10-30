// Ehrlicher Status für Einstellungen → Mitteilungen (A-069): läuft der
// Zeitplan im Server (pg_cron + pg_net + „mia-push-senden“), kennt er die
// Adresse der App, wann war der letzte Versand-Lauf, hat DIESES Gerät ein
// Abo? Nur mit Sitzung; nur Technik, nie Inhalte.

import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { restClient } from "@/lib/heute/mitteilungen/serverRest";
import { eigenesAbo, fragender } from "@/lib/heute/mitteilungen/pushKonto";
import type { ServerStatus } from "@/lib/heute/mitteilungen/pushStatus";

export async function GET(request: Request) {
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  const f = await fragender(request);
  if (!f) return Response.json({ error: "nicht_angemeldet" }, { status: 401 });
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  const admin = restClient(pub.url, key);
  try {
    const [abo, zeitplan, lauf] = await Promise.all([
      eigenesAbo(f, endpoint),
      admin<{ cron?: boolean; net?: boolean; job?: boolean; ziel?: boolean }>("rpc/push_cron_status", { method: "POST", body: {} }),
      admin<{ at: string }[]>("push_laeufe?select=at&order=at.desc&limit=1"),
    ]);
    const z = zeitplan.data ?? {};
    const status: ServerStatus = { zeitplan: Boolean(z.cron && z.net && z.job), ziel: Boolean(z.ziel), letzterLauf: lauf.data?.[0]?.at ?? null, abo: Boolean(abo) };
    return Response.json(status);
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
