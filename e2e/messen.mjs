// npm run messen – Ausgangslage/Ergebnis fürs Aufräumen: JavaScript je
// Hauptseite beim ersten Aufruf (frischer Browser, Pixel 7, mit Familie),
// unkomprimiert und gzip.
import { gzipSync } from "node:zlib";
import { devices } from "playwright";
import { BASE, hello, launch, newPage, seedFamily, startServer } from "./lib.mjs";
import { RECIPE_DATA } from "./ablaeufe/essen.mjs";

const PAGES = ["/", "/?seite=kalender", "/?seite=essen", "/kochbuch/rezept?id=sp", "/einkaufsliste", "/vorrat", "/pinnwand", "/wetter", "/tipps", "/profil"];
const stop = await startServer();
const browser = await launch();
// Einmal Familie anlegen, dann jede Seite in einem frischen Browser mit diesem Speicher
const setup = await newPage(browser, "Pixel 7");
await hello(setup);
await seedFamily(setup, RECIPE_DATA);
const state = await setup.context().storageState();
await setup.context().close();
const rows = [];
for (const path of PAGES) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], storageState: state, timezoneId: "Europe/Berlin", serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date("2026-10-21T10:30:00+02:00"));
  let raw = 0;
  let gz = 0;
  const jobs = [];
  page.on("response", (r) => {
    if (r.request().resourceType() !== "script") return;
    jobs.push(r.body().then((b) => ((raw += b.length), (gz += gzipSync(b).length)), () => {}));
  });
  await page.goto(BASE + path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await Promise.all(jobs);
  rows.push(`| ${path} | ${Math.round(raw / 1024)} KB | ${Math.round(gz / 1024)} KB |`);
  await ctx.close();
}
await browser.close();
stop();
console.log("| Seite | JS unkomprimiert | JS gzip |\n|---|---|---|\n" + rows.join("\n"));
