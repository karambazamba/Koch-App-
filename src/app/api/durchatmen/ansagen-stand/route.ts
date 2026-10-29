// Für „Für Entwickler“ (A-061): Sind Mias Durchatmen-Ansagen eingerichtet,
// wie viele liegen schon im Bucket? Nur Zahlen, keine Schlüssel.

import { connection } from "next/server";
import { ansagenStand, ansagenUmgebung } from "@/lib/durchatmen/ansagenServer";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export async function GET() {
  await connection();
  return Response.json(await ansagenStand(ansagenUmgebung(process.env, { url: supabasePublic()?.url ?? null, key: supabaseSecret() })));
}
