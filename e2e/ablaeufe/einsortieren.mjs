// Einkauf: erst einsortieren, dann einkaufen (Tafel 99). Zu Hause: Antippen
// = „Wo kaufst du das?“ → Laden → Meldung mit Rückgängig, Artikel steht im
// Laden-Abschnitt; „Mia sortiert“ ordnet Gelerntes ein; im Einkaufsmodus hakt
// Antippen ab.
import { BASE, hello, katalog, seedFamily, store } from "../lib.mjs";

const KEY = "wasgibts.einkaufsliste";

export const einsortieren = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  // Meine Läden Edeka + Rewe; Milch wurde einmal bei Edeka abgehakt (Gelerntes)
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key) ?? "null") ?? { version: 6, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], shopRules: {}, learnAsked: [], alwaysList: [] };
    localStorage.setItem(key, JSON.stringify({ ...s, version: 6, myShops: ["Edeka", "Rewe"], shopsAsked: true, learned: { milch: { shop: "Edeka", n: 1 } } }));
  }, KEY);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1100);
  const sheet = await katalog(page);
  await sheet.getByLabel("Suchen oder eintragen").fill("Spinat, Milch, Kürbiskerne");
  await sheet.getByLabel("Suchen oder eintragen").press("Enter");
  await sheet.getByText("3 ausgewählt").waitFor({ timeout: 5000 }).catch(() => {});
  await sheet.getByRole("button", { name: "Fertig" }).tap();
  await page.waitForTimeout(700);

  const zone = page.locator("[data-ohne-laden]");
  check(await zone.isVisible(), "Zone „Noch ohne Laden“ oben");
  check(/Noch ohne Laden\s*3/.test(await zone.innerText()), "Kopf „Noch ohne Laden 3“");
  check(await page.locator("[data-mia-sortiert-zeile]").getByText("3 Sachen noch ohne Laden.").isVisible(), "Mia-Zeile „3 Sachen noch ohne Laden.“");

  // Antippen = Fenster, nicht gekauft
  await zone.getByRole("button", { name: "Spinat: Laden wählen" }).tap();
  const wo = page.getByRole("dialog", { name: "Wo kaufst du das?" });
  check(await wo.waitFor({ timeout: 3000 }).then(() => true, () => false), "„Wo kaufst du das?“");
  check(await wo.locator("[data-immer-bei]").isChecked(), "„immer bei“ vorausgewählt");
  check(!Object.values((await store(page, KEY)).weeks).some((w) => w.manual.some((m) => m.name === "Spinat" && m.done)), "nicht gekauft");
  await wo.getByRole("radio", { name: "Rewe" }).tap();
  check(await page.getByText("Spinat → Rewe. Merk ich mir.").waitFor({ timeout: 3000 }).then(() => true, () => false), "Meldung „Spinat → Rewe. Merk ich mir.“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit Rückgängig");
  const after = await store(page, KEY);
  check(after.itemShops.spinat === "Rewe" && after.shopRules.spinat === "Rewe", "Spinat bei Rewe, feste Regel");
  check(await page.locator('[data-gruppe="laden:Rewe"]').getByRole("button", { name: "Spinat: Laden wählen" }).isVisible(), "Spinat steht unter Rewe");

  // „Mia sortiert“: Milch → Edeka (gelernt), Kürbiskerne bleiben
  await page.locator("[data-mia-sortiert]").tap();
  check(await page.getByText("1 einsortiert").waitFor({ timeout: 3000 }).then(() => true, () => false), "Meldung „1 einsortiert“");
  check((await store(page, KEY)).itemShops.milch === "Edeka", "Milch → Edeka");
  check(await zone.getByRole("button", { name: "Kürbiskerne: Laden wählen" }).isVisible(), "Unbekanntes bleibt in der Zone");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(300);
  check((await store(page, KEY)).itemShops.milch === undefined, "Rückgängig: Milch wieder ohne Laden");

  // Einkaufsmodus: Antippen = gekauft
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  await page.waitForTimeout(900);
  await page.getByRole("checkbox", { name: "Spinat abhaken" }).tap();
  await page.waitForTimeout(400);
  check(Object.values((await store(page, KEY)).weeks).some((w) => w.manual.some((m) => m.name === "Spinat" && m.done)), "Einkaufsmodus hakt ab");
};
