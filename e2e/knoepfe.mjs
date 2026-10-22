// npm run knoepfe – „kein toter Knopf“: auf jeder Seite jeden sichtbaren
// Knopf und Link einmal antippen (echtes Tippen) und prüfen, dass etwas
// passiert (andere Seite, Fenster, Inhalt ändert sich) und kein Fehler kommt.
// Jeder Knopf auf frisch geladener Seite. Ein Gerät (iPhone 15 Pro).
import {
  BASE,
  hello,
  launch,
  newPage,
  seedFamily,
  startServer,
} from "./lib.mjs";
import { RECIPE_DATA } from "./ablaeufe/essen.mjs";

const PAGES = (process.argv.slice(2).filter((a) => a.startsWith("/")).length
  ? process.argv.slice(2).filter((a) => a.startsWith("/"))
  : null) ?? [
  "/",
  "/?seite=kalender",
  "/?seite=essen",
  "/kochbuch",
  "/kochbuch/rezept?id=sp",
  "/einkaufsliste",
  "/vorrat",
  "/pinnwand",
  "/notizen",
  "/aufgaben",
  "/tag?datum=2026-10-21",
  "/wetter",
  "/spendentopf",
  "/tipps",
  "/sport",
  "/wochenplan",
  "/profil",
  "/profil/kuechenhelfer",
  "/profil/familie",
  "/profil/daten",
  "/profil/tagesablauf",
];
// Nur Knöpfe, die absichtlich nichts Sichtbares tun (oder nur Ton/Zwischenablage),
// die aktuelle Seitenanzeige und „Entfernen“ hinter einer Wisch-Zeile (verdeckt).
// /profil/startseite fehlt: dort ist Bearbeiten an, Inhalte sind absichtlich gesperrt.
const SKIP =
  /Vorlesen|kopieren|Teilen|Mikrofon|sprechen|Zuhören|etwas sagen|Daten sichern|Meine Daten exportieren|^Thema 1$|^Entfernen$/i;

const shot = () => {
  const dialog = document.querySelector("[role=dialog],[role=alertdialog]");
  return `${location.pathname}${location.search}|${dialog ? "D" : ""}|${document.body.innerText.length}|${document.body.innerHTML.length}|${document.activeElement?.outerHTML.slice(0, 80)}`;
};

const stop = await startServer();
const browser = await launch();
const dead = [];
const errors = [];
let clicks = 0;
let page = await newPage(browser, "iPhone 15 Pro");
await hello(page);
await seedFamily(page, RECIPE_DATA);
const seed = await page.evaluate(() =>
  JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
);
const reset = () =>
  page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(JSON.parse(s)))
      localStorage.setItem(k, v);
  }, seed);

for (const path of PAGES) {
  await page.goto(BASE + path);
  await page.waitForTimeout(900);
  const count = await page.evaluate(
    () =>
      document.querySelectorAll("main button, main a[href], main [role=button]")
        .length,
  );
  for (let i = 0; i < Math.min(count, 60); i++) {
    if (page.isClosed()) {
      page = await newPage(browser, "iPhone 15 Pro");
      await page.goto(BASE);
    }
    try {
      await reset();
      await page.goto(BASE + path);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(600);
      const el = page
        .locator("main button, main a[href], main [role=button]")
        .nth(i);
      if (
        !(await el.isVisible().catch(() => false)) ||
        (await el.isDisabled().catch(() => true))
      )
        continue;
      const name = (
        (await el.getAttribute("aria-label")) ||
        (await el.innerText().catch(() => "")) ||
        ""
      )
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 50);
      if (SKIP.test(name)) continue;
      const before = await page.evaluate(shot);
      page.errors.length = 0;
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await el
        .tap({ timeout: 2000 })
        .catch(() => el.click({ timeout: 2000 }).catch(() => {}));
      await page.waitForTimeout(700);
      const after = await page.evaluate(shot).catch(() => "nav");
      clicks++;
      if (after === before) dead.push(`${path} · „${name || "(ohne Namen)"}“`);
      if (page.errors.length)
        errors.push(
          `${path} · „${name}“: ${page.errors.join(" | ").slice(0, 160)}`,
        );
    } catch (e) {
      errors.push(`${path} · Knopf ${i}: ${String(e.message).split("\n")[0]}`);
    }
  }
}
await browser.close();
stop();
console.log(`${clicks} Knöpfe angetippt auf ${PAGES.length} Seiten`);
for (const d of dead) console.log(`✗ tot: ${d}`);
for (const e of errors) console.log(`✗ Fehler: ${e}`);
if (!dead.length && !errors.length) console.log("alles ok");
process.exit(dead.length || errors.length ? 1 : 0);
