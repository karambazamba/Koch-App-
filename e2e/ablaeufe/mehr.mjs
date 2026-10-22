// Spendentopf, Tipps (Demo), Einstellungen
import { BASE, hello, seedFamily } from "../lib.mjs";

const family = async (page, path) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + path);
  await page.waitForTimeout(1100);
};

export const spendentopf = async (page, check) => {
  await family(page, "/spendentopf");
  check(await page.getByText(/100 % für Projekte in deiner Region/).first().isVisible(), "„100 % für Projekte in deiner Region“");
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
  check(await page.getByRole("heading", { name: "Mia" }).isVisible(), "Seite der Begleitung heißt wie sie");
};
