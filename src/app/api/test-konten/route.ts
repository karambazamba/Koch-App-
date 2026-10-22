// Nur für den Durchklick (KONTEN_TEST=1, nie in Produktion): Konten und
// Haushalt im Speicher des Testservers – gleiche Regeln wie die Datenbank.
// `admin_code` liefert den zuletzt verschickten Anmelde-Code (statt E-Mail).

import { kontenTest } from "@/lib/konten/serverEnv";
import { testKonten } from "@/lib/konten/testServer";

export async function POST(request: Request) {
  if (!kontenTest()) return Response.json({ error: "aus" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return Response.json(testKonten(body));
}
