// Navigation: immer zur Startseite. Wischen Kalender → Heute → Essen → Heute
// je 5 Mal (auch über dem Monatsraster), Haus-Knopf auf tieferen Seiten (zurück
// auf Heute an derselben Scrollhöhe), Öffnen nach mehr als 5 Minuten = Heute.
import { BASE, hello, seedFamily } from "../lib.mjs";

const selected = (page) => page.getByRole("tab", { selected: true }).innerText();

async function wisch(page, x, y, dx) {
  const cdp = await page.context().newCDPSession(page);
  const p = (px) => [{ x: Math.round(px), y: Math.round(y), id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: p(x) });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: p(x + (dx * i) / 10) });
    await new Promise((r) => setTimeout(r, 25));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(700);
}

export const wischenKalenderHeute = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const vp = page.viewportSize();
  let ok = 0;
  for (let i = 0; i < 5; i++) {
    await page.getByRole("tab", { name: "Kalender" }).tap();
    await page.waitForTimeout(700);
    // über dem Monatsraster bzw. dem Inhalt nach rechts
    const grid = await page.locator("[role=tabpanel]:not([inert]) [role=grid]").first().boundingBox().catch(() => null);
    const y = grid ? grid.y + grid.height / 2 : vp.height * 0.55;
    await wisch(page, vp.width * 0.2, y, vp.width * 0.6);
    const a = await selected(page);
    await wisch(page, vp.width * 0.8, vp.height * 0.55, -vp.width * 0.6);
    const b = await selected(page);
    await wisch(page, vp.width * 0.2, vp.height * 0.55, vp.width * 0.6);
    const c = await selected(page);
    if (/Heute/.test(a) && b === "Essen" && /Heute/.test(c)) ok++;
  }
  check(ok === 5, `Kalender → Heute → Essen → Heute: ${ok} von 5`);
};

export const hausKnopf = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);
  const y0 = await page.evaluate(() => window.scrollY);
  await page.getByRole("link", { name: "Einstellungen" }).tap();
  await page.waitForURL(/\/profil$/);
  await page.waitForTimeout(600);
  check(!(await page.locator("[data-haus]").count()), "eine Ebene unter Heute: kein Haus, „‹ Heute“ reicht");
  await page.locator('a[href="/profil/daten"]').first().tap();
  await page.waitForURL(/profil\/daten/);
  await page.waitForTimeout(600);
  const haus = page.locator("[data-haus]");
  check(await haus.isVisible(), "tiefere Seite: Haus neben „‹ …“");
  const box = await haus.boundingBox();
  check(box && box.width >= 44 && box.height >= 44, "Haus: 44 px Tippfläche");
  await haus.tap();
  await page.waitForTimeout(1200);
  check(new URL(page.url()).pathname === "/" && /Heute/.test(await selected(page)), "Haus → Startseite");
  check(Math.abs((await page.evaluate(() => window.scrollY)) - y0) <= 2, "Scrollhöhe der Startseite bleibt");
};

export const oeffnenStartseite = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  // unter 5 Minuten weg: bleibt
  await page.evaluate(() => localStorage.setItem("wasgibts.zuletztweg", String(Date.now() - 60_000)));
  await page.reload();
  await page.waitForTimeout(1200);
  check(page.url().includes("/einkaufsliste"), "1 Minute weg: bleibt auf der Seite");
  // länger als 5 Minuten weg: Startseite
  await page.evaluate(() => localStorage.setItem("wasgibts.zuletztweg", String(Date.now() - 10 * 60_000)));
  await page.reload();
  await page.waitForTimeout(1500);
  check(new URL(page.url()).pathname === "/", "10 Minuten weg: Startseite");
  // Kochmodus bleibt
  await page.goto(BASE + "/kochbuch/kochen?id=x");
  await page.evaluate(() => localStorage.setItem("wasgibts.zuletztweg", String(Date.now() - 10 * 60_000)));
  await page.reload();
  await page.waitForTimeout(1200);
  check(page.url().includes("/kochbuch/kochen"), "Kochmodus bleibt");
};
