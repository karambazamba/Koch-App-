// Für die Push-Routen (A-069), nur Server: wer fragt (Sitzung des Kontos),
// welcher Haushalt, welches Abo gehört zu diesem Gerät. Gelesen wird ALS das
// Konto (RLS), der geheime Schlüssel bleibt in den Routen.

import { supabasePublic } from "@/lib/konten/serverEnv";
import { restClient, type Rest } from "@/lib/heute/mitteilungen/serverRest";

export type Fragender = { rest: Rest; url: string; household: string | null };

/** Sitzung aus „Authorization: Bearer …“; null = nicht angemeldet */
export async function fragender(request: Request): Promise<Fragender | null> {
  const pub = supabasePublic();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!pub || !token) return null;
  const rest = restClient(pub.url, pub.key, token);
  const me = await rest<{ household_id: string }[]>("members?select=household_id&limit=1").catch(() => null);
  if (!me?.ok) return null;
  return { rest, url: pub.url, household: me.data?.[0]?.household_id ?? null };
}

/** Eigenes Abo zu diesem Endpunkt (RLS: nur eigene) */
export async function eigenesAbo(f: Fragender, endpoint: string | null): Promise<string | null> {
  if (!endpoint || !endpoint.startsWith("https://") || endpoint.length > 1000) return null;
  const r = await f.rest<{ id: string }[]>(`push_abos?select=id&endpoint=eq.${encodeURIComponent(endpoint)}`).catch(() => null);
  return r?.data?.[0]?.id ?? null;
}
