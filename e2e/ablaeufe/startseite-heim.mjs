// Navigation neu (Tafel 96): Leiste unten mit Kalender · Heute · Essen und
// Mia. Wischen Kalender → Heute → Essen → Heute je 5 Mal (auch über dem
// Monatsraster), Reiter von Unterseiten (zurück an dieselbe Scrollhöhe),
// aktiver Reiter = nach oben, Leiste weg bei Fenster/Tastatur/Kochmodus,
// Wischen vom linken Rand = eine Ebene zurück, Öffnen nach > 5 Min = Heute.
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

const leisteSichtbar = (page) =>
  page.evaluate(() => {
    const el = document.querySelector("[data-leiste-flaeche]");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return Number(getComputedStyle(el.closest("[data-leiste]")).opacity) > 0.5 && r.bottom <= innerHeight + 1 && r.top < innerHeight;
  });

export const leisteReiter = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  check(await leisteSichtbar(page), "Startseite: Leiste unten sichtbar");
  check((await page.locator("[data-leiste] [data-mia-knopf]").count()) === 1, "Mia sitzt in der Leiste");
  check((await page.locator("main [role=radiogroup][aria-label='Kalender, Heute, Essen'], nav[aria-label=Seiten]").count()) === 0, "kein Segment-Umschalter oben");
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(400);
  const y0 = await page.evaluate(() => window.scrollY);
  // „···“ → Einstellungen (das Fenster blendet die Leiste aus)
  await page.getByRole("button", { name: "Mehr" }).first().tap();
  await page.waitForTimeout(1100);
  check(!(await leisteSichtbar(page)), "Fenster offen: Leiste weg");
  await page.getByRole("button", { name: "Einstellungen" }).tap();
  await page.waitForURL(/\/profil$/);
  await page.waitForTimeout(1100);
  check(/Heute/.test(await page.getByRole("tab", { selected: true }).innerText()), "Einstellungen gehören zu Heute");
  await page.locator('a[href="/profil/daten"]').first().tap();
  await page.waitForURL(/profil\/daten/);
  await page.waitForTimeout(800);
  // Wischen vom linken Rand = eine Ebene zurück
  await wisch(page, 6, page.viewportSize().height * 0.5, page.viewportSize().width * 0.5);
  check(/\/profil$/.test(page.url()), "vom linken Rand wischen: eine Ebene zurück");
  await page.locator('a[href="/profil/daten"]').first().tap();
  await page.waitForURL(/profil\/daten/);
  await page.waitForTimeout(800);
  // Aktiver Reiter auf der Unterseite = zurück zur Hauptseite, Scrollhöhe bleibt
  await page.getByRole("tab", { name: "Heute" }).tap();
  await page.waitForTimeout(1300);
  check(new URL(page.url()).pathname === "/" && /Heute/.test(await selected(page)), "Reiter Heute von tieferer Seite → Startseite");
  check(Math.abs((await page.evaluate(() => window.scrollY)) - y0) <= 2, "Scrollhöhe der Startseite bleibt");
  // Aktiver Reiter auf der Hauptseite = nach oben
  await page.getByRole("tab", { name: "Heute" }).tap();
  await page.waitForTimeout(1300);
  check((await page.evaluate(() => window.scrollY)) <= 2, "aktiver Reiter auf der Hauptseite: nach oben");
  // Von einer Unterseite in einen anderen Bereich
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(900);
  await page.getByRole("tab", { name: "Kalender" }).tap();
  await page.waitForTimeout(1300);
  check(new URL(page.url()).pathname === "/" && /Kalender/.test(await selected(page)), "Einkaufsliste → Reiter Kalender → Kalender");
  await page.getByRole("tab", { name: "Essen" }).tap();
  await page.waitForTimeout(1300);
  check(/Essen/.test(await selected(page)), "Reiter Essen");
  // Tastatur (Feld im Fokus): Leiste weg; Kochmodus: keine Leiste
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(900);
  await page.locator("input, textarea").first().focus().catch(() => {});
  await page.waitForTimeout(1100);
  const feld = await page.locator("input, textarea").count();
  if (feld) check(!(await leisteSichtbar(page)), "Tastatur offen: Leiste weg");
  await page.goto(BASE + "/kochbuch/kochen?id=x");
  await page.waitForTimeout(900);
  check((await page.locator("[data-leiste]").count()) === 0, "Kochmodus ohne Leiste");
};

/**
 * „So lange weg“ für das nächste Laden setzen. Beim Neuladen schreibt `pagehide`
 * die (feste) Testzeit als Weggang – deshalb erst im neuen Dokument eintragen.
 */
async function wegVor(page, ms) {
  await page.evaluate((m) => sessionStorage.setItem("e2e-weg", String(Date.now() - m)), ms);
  await page.reload();
  await page.waitForTimeout(1500);
}

export const oeffnenStartseite = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.addInitScript(() => {
    const v = sessionStorage.getItem("e2e-weg");
    if (v) {
      localStorage.setItem("wasgibts.zuletztweg", v);
      sessionStorage.removeItem("e2e-weg");
    }
  });
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  // unter 5 Minuten weg: bleibt
  await wegVor(page, 60_000);
  check(page.url().includes("/einkaufsliste"), "1 Minute weg: bleibt auf der Seite");
  // länger als 5 Minuten weg: Startseite
  await wegVor(page, 10 * 60_000);
  check(new URL(page.url()).pathname === "/", "10 Minuten weg: Startseite");
  // Kochmodus bleibt
  await page.goto(BASE + "/kochbuch/kochen?id=x");
  await page.waitForTimeout(800);
  await wegVor(page, 10 * 60_000);
  check(page.url().includes("/kochbuch/kochen"), "Kochmodus bleibt");
};

// Mia denkt mit (Tafel 90): beim ersten Besuch einer Seite einmal eine Karte,
// „Alles klar“ = nie wieder auf dieser Seite.
export const ersterBesuchKarte = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.miadenkt": { version: 1, level: "normal", vorgestellt: {}, besucht: [], antworten: {}, rituale: [], eingeplant: [], tage: {}, sprueche: [] } });
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(1500);
  const klar = page.getByRole("button", { name: "Alles klar" });
  check(await klar.isVisible(), "erster Besuch: Mias Karte");
  await klar.tap();
  await page.waitForTimeout(600);
  check(!(await klar.count()), "„Alles klar“: Karte weg");
  await page.reload();
  await page.waitForTimeout(1500);
  check(!(await page.getByRole("button", { name: "Alles klar" }).count()), "zweiter Besuch: keine Karte");
};
