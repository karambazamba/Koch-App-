// npm run durchklick – alle Abläufe auf iPhone 15 Pro und Pixel 7 (Hallo,
// Bearbeiten, Wischen, Eintragen, Kalender, Essen, Rezept, Einkauf, Vorrat,
// Pinnwand, Wetter, Spendentopf, Tipps, Einstellungen, Chat im Testmodus,
// Konten mit zwei Browsern, Vorführen: Fertig-Leiste, Memo antippen,
// Offline, neue Version, Stammartikel, Sport-Kachel).
// Startet selbst einen Testserver (vorher `npm run build`) oder nutzt
// E2E_BASE. Nur einzelne Abläufe: `npm run durchklick -- wetter pinnwand`.
import { checker, launch, newPage, startServer } from "./lib.mjs";
import * as start from "./ablaeufe/start.mjs";
import * as alltag from "./ablaeufe/alltag.mjs";
import * as essen from "./ablaeufe/essen.mjs";
import * as mehr from "./ablaeufe/mehr.mjs";
import * as konten from "./ablaeufe/konten.mjs";
import * as vorfuehren from "./ablaeufe/vorfuehren.mjs";

const ALL = { ...start, ...alltag, ...essen, ...mehr, ...konten, ...vorfuehren };
const pick = process.argv.slice(2);
const flows = Object.entries(ALL).filter(([name, run]) => typeof run === "function" && (!pick.length || pick.includes(name)));
const stop = await startServer();
const browser = await launch();
const failed = [];
const t0 = Date.now();
for (const device of ["iPhone 15 Pro", "Pixel 7"]) {
  for (const [name, run] of flows) {
    const { check, failed: f } = checker(`${device} · ${name}`);
    const page = await newPage(browser, device);
    try {
      await run(page, check, device);
      check(!page.errors.length, `keine Fehler ${page.errors.join(" | ")}`);
    } catch (e) {
      check(false, `abgebrochen: ${String(e.message).split("\n")[0]}`);
    }
    failed.push(...f);
    await page.context().close();
  }
}
await browser.close();
stop();
console.log(`\n${flows.length} Abläufe × 2 Geräte in ${Math.round((Date.now() - t0) / 1000)} s`);
console.log(failed.length ? `${failed.length} FEHLER:\n${failed.join("\n")}` : "alles ok");
process.exit(failed.length ? 1 : 0);
