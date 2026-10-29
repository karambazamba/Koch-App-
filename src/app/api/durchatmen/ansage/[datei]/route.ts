// Durchatmen-Ansagen ausliefern (A-061): GET /audio/durchatmen/<id>.mp3
// (Weiterleitung in next.config.ts auf diese Route) –
// liegt die Datei im öffentlichen Bucket, kommt sie von dort; fehlt sie, wird
// sie EINMAL auf dem Server mit Mias Stimme erzeugt und abgelegt. Nur IDs aus
// content/durchatmen/ansagen.json (nie freier Text) – die Kosten sind damit
// auf einmal je Satz begrenzt, deshalb ohne Zugangscode (auch Nutzer ohne
// Code hören Mia). Fehler bleiben still (404, die App spielt nur Klang).
// Schlüssel nur hier, ins Log nichts.

import { connection } from "next/server";
import { ansageIdAus, ansageUrl } from "@/lib/durchatmen/ansagen";
import { ansageSicherstellen, ansagenUmgebung } from "@/lib/durchatmen/ansagenServer";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 30;

const still = () => new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

export async function GET(request: Request, ctx: { params: Promise<{ datei: string }> }) {
  await connection();
  const id = ansageIdAus((await ctx.params).datei);
  if (!id) return still();
  // Nur der aktuelle Text-Hash (`t`) dieser Ansage – jeder andere Wert: 404, nichts wird erzeugt
  if (new URL(request.url).searchParams.get("t") !== new URL(ansageUrl(id)!, "http://x").searchParams.get("t")) return still();
  const r = await ansageSicherstellen(ansagenUmgebung(process.env, { url: supabasePublic()?.url ?? null, key: supabaseSecret() }), id, { mitTon: true });
  const ton = "ton" in r ? r.ton : undefined;
  if (!ton) return still();
  return new Response(ton, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" } });
}
