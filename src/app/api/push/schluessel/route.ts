// Öffentlicher VAPID-Schlüssel für Web Push (Tafel 77). Beim ersten Aufruf
// erzeugt der Server das Schlüsselpaar und das Cron-Zeichen selbst und legt
// sie NUR in Supabase ab (push_config, nur Service-Rolle). Der private
// Schlüssel verlässt den Server nie und wird nie ausgegeben oder geloggt.
// Ohne Supabase-Variablen: 503 – die App bleibt bei Mitteilungen, solange sie offen ist.
// Auf der echten App (VERCEL_ENV=production) zieht die Adresse für den
// Zeitplan (base_url) immer nach, damit pg_cron nie eine Vorschau aufruft.

import webpush from "web-push";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { randomToken, restClient } from "@/lib/heute/mitteilungen/serverRest";

type Config = { vapid_public: string; base_url: string | null };

export async function GET(request: Request) {
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  const rest = restClient(pub.url, key);
  const origin = new URL(request.url).origin;
  try {
    const found = await rest<Config[]>("push_config?select=vapid_public,base_url&id=eq.1");
    let row = found.data?.[0] ?? null;
    if (!row) {
      const keys = webpush.generateVAPIDKeys();
      const made = await rest<Config[]>("push_config?select=vapid_public,base_url", { method: "POST", prefer: "return=representation,resolution=ignore-duplicates", body: { id: 1, vapid_public: keys.publicKey, vapid_private: keys.privateKey, cron_token: randomToken(), base_url: origin } });
      row = made.data?.[0] ?? (await rest<Config[]>("push_config?select=vapid_public,base_url&id=eq.1")).data?.[0] ?? null;
    } else if (origin.startsWith("https://") && (!row.base_url || (process.env.VERCEL_ENV === "production" && row.base_url !== origin))) {
      // A-069: Der Zeitplan ruft immer die echte App auf – stand hier eine Vorschau-Adresse (geschützt), lief er ins Leere
      await rest("push_config?id=eq.1", { method: "PATCH", body: { base_url: origin } });
    }
    return row ? Response.json({ key: row.vapid_public }) : Response.json({ error: "fehler" }, { status: 502 });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
