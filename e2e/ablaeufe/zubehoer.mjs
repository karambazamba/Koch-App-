// Mia-Zubehör (A-058 in A-060): Sonne den ganzen Tag (Testwetter „klar“,
// gemerkt pro Tag) und Herbstblätter nur bei Wind (Testwetter „sturm“, Okt.):
// beim Öffnen 7 Blätter am Knopf, Mia kneift die Augen, nach < 3 s weg;
// erneut öffnen innerhalb 30 Min = nichts; Antippen nach 5 Min = Blätter auf
// der Bühne; reduzierte Bewegung = keine Blätter. Automatisierte Browser
// melden sich mit `navigator.webdriver` – hier ausgeschaltet, sonst laufen
// keine Momente.
import { BASE, hello, seedFamily } from "../lib.mjs";

const OHNE_WEBDRIVER = () => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
const knopf = (page) => page.locator("[data-mia-knopf]");

async function wetter(page, szenario) {
  await page.evaluate((sz) => {
    sessionStorage.setItem("wasgibts.wetterszenario", sz);
    localStorage.removeItem("wasgibts.wetterdaten");
    localStorage.removeItem("wasgibts.miazubehoer");
    localStorage.setItem("wasgibts.startseite", JSON.stringify({ version: 9, tipSeen: true, tiles: [{ id: "wetter", visible: true, size: "S" }, { id: "notizen", visible: true, size: "XS" }] }));
  }, szenario);
  await page.goto(BASE);
  await page.locator("[data-szene]").first().waitFor({ timeout: 6000 }).catch(() => {});
}

export const miaZubehoer = async (page, check) => {
  await page.addInitScript(OHNE_WEBDRIVER);
  await hello(page);
  await seedFamily(page);

  // Sonne: klarer Tag → Sonne am Knopf, bleibt nach Neuladen (Tagesentscheidung gemerkt)
  await wetter(page, "klar");
  await page.reload();
  await page.waitForTimeout(1500);
  check((await knopf(page).locator('[data-zubehoer="sonne"]').count()) === 1, "klarer Tag: Mia trägt die Sonne");
  const gemerkt = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.miazubehoer") ?? "null"));
  check(gemerkt?.sonnentag?.sonnig === true, "Tagesentscheidung „sonnig“ gemerkt");

  // Reduzierte Bewegung (Standard im Durchklick): Sturm im Oktober, aber keine Blätter
  await wetter(page, "sturm");
  await page.waitForTimeout(1800);
  check(!(await page.locator("[data-blaetter]").count()), "reduzierte Bewegung: keine Blätter");

  // Volle Bewegung: Blätter beim Öffnen, Mia kneift, nach < 3 s weg
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await wetter(page, "sturm");
  await knopf(page).locator("[data-blaetter]").waitFor({ timeout: 4000 }).catch(() => {});
  const blaetter = await knopf(page).locator("[data-blaetter] .av-blatt-weg").count();
  check(blaetter >= 6 && blaetter <= 8, `Sturm im Oktober: ${blaetter} Blätter am Knopf`);
  check((await knopf(page).locator(".avatar[data-kneifen]").count()) === 1, "Mia kneift die Augen");
  check((await knopf(page).getAttribute("data-moment")) === "sturm", "Sturm: Wackeln und Blätter zusammen");
  await page.waitForTimeout(3000);
  check(!(await page.locator("[data-blaetter]").count()) && !(await page.locator(".avatar[data-kneifen]").count()), "nach unter 3 s wieder still");

  // Neu öffnen innerhalb von 30 Min: nichts
  await page.reload();
  await page.waitForTimeout(1800);
  check(!(await page.locator("[data-blaetter]").count()), "erneut öffnen innerhalb 30 Min: keine Blätter");

  // 6 Min später Mia antippen → Blätter auf der Bühne
  await page.clock.setFixedTime(new Date("2026-10-21T10:36:30+02:00"));
  await page.reload();
  await page.waitForTimeout(1500);
  // Volle Bewegung: der Knopf atmet (nie „stabil“) – darum ohne Warten tippen
  await knopf(page).click({ force: true });
  check(await page.locator("[data-buehne-mia] [data-blaetter]").waitFor({ timeout: 3000 }).then(() => true, () => false), "Antippen nach 5 Min: Blätter auf der Bühne");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
};
