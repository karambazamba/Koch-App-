// Durchatmen-Ansagen nachts vorab erzeugen (A-051, A-061): Vercel Cron, nur
// mit CRON_SECRET. Erzeugt mit ELEVENLABS_API_KEY und MIA_VOICE_ID nur
// fehlende bzw. geänderte Ansagen und legt sie in den öffentlichen Bucket
// „durchatmen-ansagen“ (`lib/durchatmen/ansagenServer.ts`). Sonst entstehen
// sie beim ersten Abspielen (`/api/durchatmen/ansage/<id>.mp3`). Schlüssel
// bleiben hier, ins Log nur Zahlen.

import { connection } from "next/server";
import { ansagenErzeugen, ansagenUmgebung } from "@/lib/durchatmen/ansagenServer";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 300;

const umgebung = () => ansagenUmgebung(process.env, { url: supabasePublic()?.url ?? null, key: supabaseSecret() });

/** Vercel Cron (nachts, A-061): alle fehlenden Ansagen vorab erzeugen – nur mit CRON_SECRET */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "nein" }, { status: 401 });
  const r = await ansagenErzeugen(umgebung());
  if (r.status === "ok") console.log(`Durchatmen-Ansagen (Cron): ${r.neu} neu, ${r.schon} schon da, ${r.fehler} Fehler`);
  return Response.json(r);
}
