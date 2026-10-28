// npm run durchklick – alle Abläufe auf iPhone 15 Pro und Pixel 7 (Hallo,
// Bearbeiten, Wischen, Eintragen, Kalender, Essen, Rezept, Einkauf, Vorrat,
// Pinnwand, Wetter, Spendentopf, Tipps, Einstellungen, Chat im Testmodus,
// Konten mit zwei Browsern, Vorführen: Bearbeiten beenden, Memo antippen,
// Offline, neue Version, Stammartikel, Sport-Kachel, Mikrofon aus, Termin in einem Satz, Stimme, Wochencheck, Kochtipp, Mehr Ideen, Mia zuerst, Sprachnachricht 5× / Mikro hängt / Kachel-Knöpfe, App heißt Mia, Härtetest Familie teilen).
// Startet selbst einen Testserver (vorher `npm run build`) oder nutzt
// E2E_BASE. Nur einzelne Abläufe: `npm run durchklick -- wetter pinnwand`.
import { checker, launch, newPage, startServer } from "./lib.mjs";
import * as start from "./ablaeufe/start.mjs";
import * as alltag from "./ablaeufe/alltag.mjs";
import * as essen from "./ablaeufe/essen.mjs";
import * as mehr from "./ablaeufe/mehr.mjs";
import * as konten from "./ablaeufe/konten.mjs";
import * as vorfuehren from "./ablaeufe/vorfuehren.mjs";
import * as mikrofon from "./ablaeufe/mikrofon.mjs";
import * as termin from "./ablaeufe/termin.mjs";
import * as stimme from "./ablaeufe/stimme.mjs";
import * as wochencheck from "./ablaeufe/wochencheck.mjs";
import * as kochtipp from "./ablaeufe/kochtipp.mjs";
import * as mehrideen from "./ablaeufe/mehrideen.mjs";
import * as miazuerst from "./ablaeufe/miazuerst.mjs";
import * as pinnwandgesten from "./ablaeufe/pinnwandgesten.mjs";
import * as sprachnachricht from "./ablaeufe/sprachnachricht.mjs";
import * as mianame from "./ablaeufe/mianame.mjs";
import * as startseite from "./ablaeufe/startseite.mjs";
import * as schnelleingabe from "./ablaeufe/schnelleingabe.mjs";
import * as kalendertag from "./ablaeufe/kalendertag.mjs";
import * as mails from "./ablaeufe/mails.mjs";
import * as datenschutz from "./ablaeufe/datenschutz.mjs";
import * as mikrocheck from "./ablaeufe/mikrocheck.mjs";
import * as zuhoeren from "./ablaeufe/zuhoeren.mjs";
import * as miasprechen from "./ablaeufe/miasprechen.mjs";
import * as serverstimme from "./ablaeufe/serverstimme.mjs";
import * as ohrlive from "./ablaeufe/ohrlive.mjs";
import * as wischen from "./ablaeufe/wischen.mjs";
import * as abhaken from "./ablaeufe/abhaken.mjs";
import * as uebersicht from "./ablaeufe/uebersicht.mjs";
import * as testcode from "./ablaeufe/testcode.mjs";
import * as notizen from "./ablaeufe/notizen.mjs";
import * as sprechenhaengt from "./ablaeufe/sprechenhaengt.mjs";
import * as heim from "./ablaeufe/startseite-heim.mjs";
import * as essenkachel from "./ablaeufe/essenkachel.mjs";
import * as wochenkarte from "./ablaeufe/wochenkarte.mjs";
import * as laeden from "./ablaeufe/laeden.mjs";
import * as familieTeilen from "./ablaeufe/familieTeilen.mjs";
import * as einsortieren from "./ablaeufe/einsortieren.mjs";
import * as einkaufneu from "./ablaeufe/einkaufneu.mjs";
import * as kochmodus from "./ablaeufe/kochmodus.mjs";

const ALL = { ...start, ...alltag, ...essen, ...mehr, ...konten, ...vorfuehren, ...mikrofon, ...termin, ...stimme, ...wochencheck, ...kochtipp, ...mehrideen, ...miazuerst, ...pinnwandgesten, ...sprachnachricht, ...mianame, ...startseite, ...schnelleingabe, ...kalendertag, ...mails, ...datenschutz, ...mikrocheck, ...zuhoeren, ...serverstimme, ...ohrlive, ...miasprechen, ...wischen, ...abhaken, ...uebersicht, ...testcode, ...notizen, ...sprechenhaengt, ...heim, ...essenkachel, ...wochenkarte, ...laeden, ...familieTeilen, ...einsortieren, ...einkaufneu, ...kochmodus };
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
      // Bildschirmfoto zum Nachsehen (.bilder/abbruch/)
      await page.screenshot({ path: `.bilder/abbruch/${device.replace(/\W+/g, "-")}-${name}.png` }).catch(() => {});
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
