// Läden bewusst wählen (Tafel 88, seit „Einkauf neu“ mit Laden-Karten): Frage
// beim ersten Besuch, Karten auch mit 0 Sachen, Aussuchen mit dem gewählten
// Laden, Laden-Seite, „Meine Läden bearbeiten“ im „···“, „Später“ fragt nie wieder.
import { BASE, aussuchen, hello, seedFamily, store } from "../lib.mjs";

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
  check(await page.locator('[data-laden-karte="Rossmann"]').isVisible(), "Rossmann als Karte, auch mit 0");
  check(!(await page.locator("[data-einkaufsmodus]").count()), "kein Einkaufsmodus-Knopf");
  // Aussuchen: Lidl wählen, Joghurt antippen → bei Lidl gemerkt
  await page.locator("[data-aussuchen]").tap();
  await page.waitForURL(/\/einkaufsliste\/aussuchen/, { timeout: 5000 }).catch(() => {});
  await aussuchen(page, "Lidl");
  await page.locator('[data-abschnitt="kuehlregal"] [data-kachel="Joghurt"]').tap();
  await page.waitForTimeout(300);
  const after = await store(page, "wasgibts.einkaufsliste");
  check(after.itemShops.joghurt === "Lidl", "Joghurt bei Lidl gemerkt");
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  await page.locator('[data-laden-karte="Lidl"]').tap();
  await page.waitForURL(/\/einkaufsliste\/laden/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/einkaufsliste/laden?name=Lidl"), "Karte öffnet die Laden-Seite");
  check(await page.getByRole("checkbox", { name: "Joghurt abhaken" }).isVisible(), "Joghurt auf der Lidl-Seite");
  // „···“ → Meine Läden bearbeiten
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Mehr" }).tap();
  await page.getByRole("dialog", { name: "Einkauf" }).getByRole("button", { name: "Meine Läden bearbeiten" }).tap();
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
  check(await page.locator("[data-einsprechen]").isVisible(), "Einsprechen und Aussuchen wie immer");
  check(await page.getByRole("button", { name: "Läden wählen" }).isVisible(), "ohne Läden: „Läden wählen“");
};
