// Läden bewusst wählen (Tafel 88): Frage beim ersten Besuch, Laden-Reihe mit
// 0 Artikeln, ＋ → „Mehr Details“, „Bei Lidl einkaufen ›“, Vorwahl beim Hinzufügen,
// „Später“ fragt nie wieder.
import { BASE, hello, katalog, seedFamily, store } from "../lib.mjs";

const open = async (page) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1100);
};

export const laedenWaehlen = async (page, check) => {
  await open(page);
  const card = page.locator("[data-laden-frage]");
  check(await card.isVisible(), "erster Besuch: „In welchen Läden kaufst du ein?“");
  await card.getByRole("button", { name: "Lidl" }).tap();
  await card.getByRole("button", { name: "Rossmann" }).tap();
  check((await card.getByRole("button", { name: "Lidl" }).getAttribute("aria-pressed")) === "true", "Lidl angekreuzt");
  await card.getByRole("button", { name: "Fertig" }).tap();
  await page.waitForTimeout(400);
  check(!(await card.count()), "Karte weg");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(JSON.stringify(list.myShops) === JSON.stringify(["Lidl", "Rossmann"]), "Meine Läden: Lidl, Rossmann");
  const row = page.locator("[data-laden-reihe]");
  check(await row.getByRole("radio", { name: /^Rossmann/ }).isVisible(), "Rossmann in der Reihe, auch mit 0");
  await row.getByRole("radio", { name: /^Lidl/ }).tap();
  check(!(await page.locator("[data-einkauf-knopf]").count()), "kein fester Knopf unten (＋ ist der eine Weg)");
  check(!(await page.locator("[data-einkaufsmodus]").count()), "ohne Artikel kein Einkaufsmodus-Knopf");
  // Hinzufügen über ＋ → „Mehr Details“: Lidl vorgewählt
  const sheet = await katalog(page);
  check((await sheet.getByRole("radio", { name: /Lidl/ }).getAttribute("aria-checked")) === "true", "Laden-Wahl: Lidl vorgewählt");
  await sheet.getByLabel("Suchen oder eintragen").fill("Joghurt");
  await sheet.getByLabel("Suchen oder eintragen").press("Enter");
  await sheet.getByRole("button", { name: "Fertig" }).tap();
  await page.waitForTimeout(600);
  const after = await store(page, "wasgibts.einkaufsliste");
  check(after.itemShops.joghurt === "Lidl", "Joghurt bei Lidl gemerkt");
  const modus = page.locator("[data-einkaufsmodus]");
  check(await modus.isVisible(), "„Bei Lidl einkaufen ›“");
  // Nochmal tippen öffnet keinen Einkaufsmodus mehr
  await row.getByRole("radio", { name: /^Lidl/ }).tap();
  await page.waitForTimeout(300);
  check(page.url().endsWith("/einkaufsliste"), "nochmal tippen bleibt auf der Liste");
  await modus.tap();
  await page.waitForURL(/\/einkaufsliste\/laden/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/einkaufsliste/laden"), "Knopf öffnet den Einkaufsmodus");
  // ＋ in der Reihe: Meine Läden
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Meine Läden" }).tap();
  const meine = page.locator("[data-meine-laeden]");
  await meine.getByLabel("Anderer Laden").fill("Hofladen");
  await meine.getByRole("button", { name: "Laden dazu" }).tap();
  await page.waitForTimeout(300);
  check((await store(page, "wasgibts.einkaufsliste")).myShops.includes("Hofladen"), "eigener Laden dazu");
  await meine.getByRole("button", { name: "Hofladen", exact: true }).tap();
  await page.waitForTimeout(300);
  await meine.getByRole("button", { name: "Entfernen" }).tap();
  await page.waitForTimeout(300);
  check(!(await store(page, "wasgibts.einkaufsliste")).myShops.includes("Hofladen"), "eigener Laden wieder weg");
};

export const laedenSpaeter = async (page, check) => {
  await open(page);
  await page.locator("[data-laden-frage]").getByRole("button", { name: /^Später/ }).tap();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(1100);
  check(!(await page.locator("[data-laden-frage]").count()), "Später: nie wieder gefragt");
  check(await page.getByRole("button", { name: "Etwas auf die Einkaufsliste setzen" }).isVisible(), "Liste wie bisher");
};
