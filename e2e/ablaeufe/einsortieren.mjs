// Einkauf neu (Tafel 110, Bild 4): „Noch ohne Laden“ einsortieren. Drei
// Sachen über das ＋ der Kachel (ohne Laden) → Seite „Einkauf“: Chip antippen
// = „Wo kaufst du das?“ → Rewe (Meldung + Rückgängig); „Mia sortiert“ ordnet
// Gelerntes ein; Chip halten und per echtem Touch (CDP) auf die Edeka-Karte
// ziehen → Karte leuchtet, „Kürbiskerne → Edeka. Merk ich mir.“, Rückgängig
// nimmt die Regel wieder weg; Ziehen scrollt die Seite nicht. Laden-Seite:
// der Kreis hakt ab. Läuft auf iPhone 15 Pro und Pixel 7.
import { BASE, hello, schnell, seedFamily, store, ziehen } from "../lib.mjs";

const KEY = "wasgibts.einkaufsliste";

export const einsortieren = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  // Meine Läden Edeka + Rewe
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key) ?? "null") ?? { version: 6, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], shopRules: {}, learnAsked: [], alwaysList: [] };
    localStorage.setItem(key, JSON.stringify({ ...s, version: 6, myShops: ["Edeka", "Rewe"], shopsAsked: true }));
  }, KEY);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1100);
  // ＋ in der Einkauf-Kachel: nichts vorgewählt = noch ohne Laden
  await page.getByRole("button", { name: "Etwas auf die Einkaufsliste setzen" }).first().tap();
  await schnell(page, "Spinat, Milch, Kürbiskerne");
  // Erst danach einmal Milch bei Edeka abgehakt (Gelerntes) – sonst landet sie seit A-041 gleich dort
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...s, learned: { ...s.learned, milch: { shop: "Edeka", n: 1, am: new Date().toISOString().slice(0, 10) } } }));
  }, KEY);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(900);

  const zone = page.locator("[data-ohne-laden]");
  check(await zone.isVisible(), "„Noch ohne Laden“ da");
  check(/Noch ohne Laden\s*·\s*3/.test(await zone.innerText()), "Kopf „Noch ohne Laden · 3“");
  check(await zone.getByText("oder auf einen Laden ziehen").isVisible(), "leise „oder auf einen Laden ziehen“");
  check(await page.locator('[data-laden-karte="Edeka"]').isVisible() && (await page.locator('[data-laden-karte="Rewe"]').isVisible()), "Laden-Karten Edeka und Rewe (auch mit 0)");

  // Antippen = Fenster, nicht gekauft
  await zone.getByRole("button", { name: "Spinat: Laden wählen" }).tap();
  const wo = page.getByRole("dialog", { name: "Wo kaufst du das?" });
  check(await wo.waitFor({ timeout: 3000 }).then(() => true, () => false), "Chip antippen → „Wo kaufst du das?“");
  await wo.getByRole("radio", { name: "Rewe" }).tap();
  check(await page.getByText("Spinat → Rewe. Merk ich mir.").waitFor({ timeout: 3000 }).then(() => true, () => false), "Meldung „Spinat → Rewe. Merk ich mir.“");
  check((await store(page, KEY)).shopRules.spinat === "Rewe", "Spinat bei Rewe, feste Regel");
  check(/Spinat/.test(await page.locator('[data-laden-karte="Rewe"]').innerText()), "Spinat steht auf der Rewe-Karte");

  // „Mia sortiert“: Milch → Edeka (gelernt), Kürbiskerne bleiben; Rückgängig
  await page.locator("[data-mia-sortiert]").tap();
  check(await page.getByText("1 einsortiert").waitFor({ timeout: 3000 }).then(() => true, () => false), "„Mia sortiert“ → „1 einsortiert“");
  check((await store(page, KEY)).itemShops.milch === "Edeka", "Milch → Edeka");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(300);
  check((await store(page, KEY)).itemShops.milch === undefined, "Rückgängig: Milch wieder ohne Laden");

  // Ziehen: Kürbiskerne halten und auf die Edeka-Karte ziehen
  const chip = zone.locator('[data-ohne-chip="Kürbiskerne"]');
  const edeka = page.locator('[data-laden-karte="Edeka"]');
  await chip.scrollIntoViewIfNeeded();
  const y0 = await page.evaluate(() => window.scrollY);
  await ziehen(page, chip, edeka);
  check(await page.getByText("Kürbiskerne → Edeka. Merk ich mir.").waitFor({ timeout: 3000 }).then(() => true, () => false), "Ziehen auf Edeka → „Kürbiskerne → Edeka. Merk ich mir.“");
  const nach = await store(page, KEY);
  check(nach.itemShops["kürbiskerne"] === "Edeka" && nach.shopRules["kürbiskerne"] === "Edeka", "Kürbiskerne sofort bei Edeka gemerkt");
  check(Math.abs((await page.evaluate(() => window.scrollY)) - y0) < 4, "Ziehen scrollt die Seite nicht");
  check(!(await page.locator("[data-zieh-chip]").count()), "nach dem Loslassen kein schwebender Chip mehr");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(300);
  const zurueck = await store(page, KEY);
  check(zurueck.shopRules["kürbiskerne"] === undefined && zurueck.itemShops["kürbiskerne"] === undefined, "Rückgängig: Regel wieder weg, Kürbiskerne ohne Laden");

  // Kurz ziehen ohne Halten = Scrollen, kein Einsortieren
  await ziehen(page, zone.locator('[data-ohne-chip="Kürbiskerne"]'), edeka, { halten: 30 });
  await page.waitForTimeout(300);
  check((await store(page, KEY)).itemShops["kürbiskerne"] === undefined, "ohne Halten wird nichts einsortiert");

  // Laden-Seite: der Kreis = im Wagen (zu Hause wie im Laden)
  await page.locator('[data-laden-karte="Rewe"]').tap();
  await page.waitForURL(/\/einkaufsliste\/laden\?name=Rewe/, { timeout: 5000 }).catch(() => {});
  check((await page.locator("[data-laden-kopf]").getAttribute("aria-label")) === "Rewe · 1 Sache", "Laden-Seite „Rewe · 1 Sache“");
  await page.getByRole("checkbox", { name: "Spinat abhaken" }).tap();
  await page.waitForTimeout(400);
  check(Object.values((await store(page, KEY)).weeks).some((w) => w.manual.some((m) => m.name === "Spinat" && m.done)), "Kreis hakt ab");
  await page.waitForTimeout(1900);
  const wagen = page.getByRole("region", { name: "Im Wagen" });
  check(await wagen.isVisible(), "nach 1 s gleitet es weg in „Im Wagen“");
  await wagen.getByRole("button", { name: "Im Wagen" }).tap();
  check(await wagen.getByText("Spinat").isVisible(), "aufklappen: Spinat im Wagen");
};
