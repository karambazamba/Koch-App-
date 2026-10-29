// npm run ansagen – Durchatmen-Ansagen (A-051) auf dem Server erzeugen lassen.
// Das Skript erzeugt selbst NICHTS und kennt keinen ElevenLabs-Schlüssel: es
// ruft nur die geschützte Route /api/durchatmen/ansagen-erzeugen auf (die legt
// die Dateien in den öffentlichen Bucket „durchatmen-ansagen“). Einfacher geht
// es in der App: Einstellungen → Daten & App → Für Entwickler → „Ansagen
// erzeugen“.
//
//   MIA_URL=https://mia.karamba-eis.de PRUEFSTAND_SECRET=… npm run ansagen
//   npm run ansagen -- --liste        nur zeigen, welche Sätze es gibt

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { saetze } = JSON.parse(readFileSync(join(ROOT, "content/durchatmen/ansagen.json"), "utf8"));

if (process.argv.includes("--liste")) {
  for (const [id, text] of Object.entries(saetze)) console.log(`${id}  „${text}“`);
  console.log(`${Object.keys(saetze).length} Ansagen.`);
  process.exit(0);
}

const url = process.env.MIA_URL?.trim().replace(/\/+$/, "");
const geheim = (process.env.PRUEFSTAND_SECRET || process.env.CRON_SECRET || "").trim();
if (!url || !geheim) {
  console.log("Dafür braucht es MIA_URL und das Prüfstand-Geheimnis (PRUEFSTAND_SECRET).");
  console.log("Einfacher: in der App unter Für Entwickler → „Ansagen erzeugen“. Bis dahin spricht die Stimme des Handys.");
  process.exit(0);
}

const r = await fetch(`${url}/api/durchatmen/ansagen-erzeugen`, { method: "POST", headers: { authorization: `Bearer ${geheim}` } }).catch(() => null);
if (!r) {
  console.log("Server nicht erreichbar.");
  process.exit(1);
}
if (r.status === 401) console.log("Das Geheimnis passt nicht.");
else if (r.status === 503) console.log("Auf dem Server fehlt der Stimmen-Schlüssel, die Stimme oder Supabase (in Vercel).");
else console.log(JSON.stringify(await r.json().catch(() => ({ status: r.status }))));
process.exit(r.ok ? 0 : 1);
