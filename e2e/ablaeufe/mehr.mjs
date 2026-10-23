// Spendentopf, Tipps (Demo), Einstellungen
import { BASE, hello, seedFamily } from "../lib.mjs";

const family = async (page, path) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + path);
  await page.waitForTimeout(1100);
};

/**
 * Spendentopf als Vorschau: Band oben, BEISPIEL an der Summe, Beispiel-
 * Projekte, „6 € im Monat vormerken“ → Danke, gespeichert als „vorgemerkt“;
 * kein Zahlungs-Link; Vormerkung löschen geht mit Rückgängig.
 */
export const spendentopf = async (page, check) => {
  await family(page, "/spendentopf");
  check(await page.getByText(/100 % für Projekte in deiner Region/).first().isVisible(), "„100 % für Projekte in deiner Region“");
  check(await page.getByText("Vorschau – der Spendentopf startet bald. Noch wird kein Geld gesammelt.").isVisible(), "Band „Vorschau“");
  check(await page.getByText("Beispiel", { exact: true }).first().isVisible(), "Etikett „Beispiel“ an der Summe");
  check((await page.getByText("Beispiel-Projekt").count()) > 0, "„Beispiel-Projekt“");
  check(!(await page.locator("main a[href^='http']").count()), "kein Zahlungs- oder Partner-Link");
  await page.getByRole("radio", { name: "Monatlich" }).waitFor();
  const knopf = page.getByRole("button", { name: "6 € im Monat vormerken" });
  await knopf.scrollIntoViewIfNeeded();
  check(await knopf.isVisible(), "Knopf „6 € im Monat vormerken“");
  check(await page.getByText("Bis zum Start fließt kein Geld.").isVisible(), "„Bis zum Start fließt kein Geld.“");
  await page.getByRole("radio", { name: "Einmalig" }).click();
  await page.getByRole("radio", { name: "10 €" }).click();
  await page.getByRole("button", { name: "10 € einmalig vormerken" }).click();
  await page.getByText(/Danke! Wir melden uns, sobald der Spendentopf startet/).waitFor({ timeout: 3000 });
  const pot = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.spendentopf")));
  check(pot?.pledge?.status === "vorgemerkt" && pot.pledge.betrag === 10 && pot.pledge.art === "einmalig", `gespeichert als Vormerkung (${JSON.stringify(pot?.pledge)})`);
  await page.reload();
  await page.waitForTimeout(900);
  const del = page.getByRole("button", { name: "Vormerkung löschen" });
  await del.scrollIntoViewIfNeeded();
  check(await page.getByText("Vorgemerkt: 10 € einmalig.").isVisible(), "„Vorgemerkt: 10 € einmalig.“");
  await del.click();
  await page.getByText("Gelöscht", { exact: true }).waitFor({ timeout: 2000 });
  check(!(await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.spendentopf")).pledge)), "Vormerkung gelöscht");
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(400);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.spendentopf")).pledge?.betrag)) === 10, "Rückgängig holt sie zurück");
};

export const tipps = async (page, check) => {
  await family(page, "/tipps");
  check(await page.getByText(/Eutin \+ 20 km/).isVisible(), "Ort-Chip „Eutin + 20 km“");
  check((await page.locator("main section[aria-label*='Oktober']").count()) > 0, "Tipps nach Tag gruppiert");
};

export const einstellungen = async (page, check) => {
  await family(page, "/profil");
  check(await page.getByText("Mia").first().isVisible(), "Karte der Begleitung (Mia)");
  check(await page.getByText(/3 Personen/).first().isVisible(), "Familie: 3 Personen");
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.waitForTimeout(800);
  check(await page.getByRole("heading", { name: "Mia", exact: true }).isVisible(), "Seite der Begleitung heißt wie sie");
};
