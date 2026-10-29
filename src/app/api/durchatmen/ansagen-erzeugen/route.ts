// Durchatmen-Ansagen erzeugen (nur für Entwickler, A-051): POST mit
// „Authorization: Bearer <PRUEFSTAND_SECRET bzw. CRON_SECRET>“ (Knopf
// „Ansagen erzeugen“ unter Einstellungen → Daten & App → Für Entwickler).
// Erzeugt mit ELEVENLABS_API_KEY und MIA_VOICE_ID nur fehlende bzw. geänderte
// Ansagen und legt sie in den öffentlichen Bucket „durchatmen-ansagen“
// (`lib/durchatmen/ansagenServer.ts`). Schlüssel bleiben hier, ins Log nur Zahlen.

import { connection } from "next/server";
import { adminErlaubt } from "@/lib/begleitung/adminZugang";
import { ansagenErzeugen, ansagenUmgebung } from "@/lib/durchatmen/ansagenServer";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";

export const maxDuration = 300;

export async function POST(request: Request) {
  await connection();
  if (!adminErlaubt(request)) return Response.json({ error: "zugang" }, { status: 401 });
  const r = await ansagenErzeugen(ansagenUmgebung(process.env, { url: supabasePublic()?.url ?? null, key: supabaseSecret() }));
  if (r.status === "aus") return Response.json({ error: "aus" }, { status: 503 });
  console.log(`Durchatmen-Ansagen: ${r.neu} neu, ${r.schon} schon da, ${r.fehler} Fehler`);
  return Response.json(r);
}
