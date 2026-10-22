// Sind Konten eingerichtet? Zur Laufzeit aus den Vercel-Variablen (nicht beim
// Bauen): { mode: "supabase", url, key } (nur öffentliche Werte), "test"
// (Durchklick) oder "aus" – dann läuft die App wie bisher nur auf dem Gerät.

import { connection } from "next/server";
import { kontenTest, supabasePublic } from "@/lib/konten/serverEnv";

export async function GET() {
  await connection(); // zur Laufzeit prüfen, nicht beim Bauen
  if (kontenTest()) return Response.json({ mode: "test" }, { headers: { "Cache-Control": "no-store" } });
  const pub = supabasePublic();
  return Response.json(pub ? { mode: "supabase", url: pub.url, key: pub.key } : { mode: "aus" }, { headers: { "Cache-Control": "no-store" } });
}
