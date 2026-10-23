// Essen, Rezept, Einkauf, Vorrat
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const RECIPE = { id: "sp", title: "Spaghetti Bolognese", category: "fleisch", servings: 4, prepMinutes: 30, ingredients: [{ id: "a", amount: 500, unit: "g", name: "Spaghetti" }, { id: "b", amount: 400, unit: "g", name: "Hackfleisch" }], steps: ["Zwiebeln schneiden.", "Anbraten.", "Köcheln lassen."], note: "", source: "eigenes", ai: null, favorite: true, thumbsUp: 0, thumbsDown: 0, cookedCount: 3, lastCookedAt: null, known: true, createdAt: "2026-10-01", updatedAt: "2026-10-01" };
export const RECIPE_DATA = { "wasgibts.kochbuch": { version: 2, recipes: { sp: RECIPE } } };
const extra = RECIPE_DATA;

const family = async (page, path) => {
  await hello(page);
  await seedFamily(page, extra);
  await page.goto(BASE + path);
  await page.waitForTimeout(1100);
};

export const essen = async (page, check) => {
  await family(page, "/?seite=essen");
  const panel = page.locator("[role=tabpanel]:not([inert])");
  check(await panel.getByText("Diese Woche").first().isVisible(), "„Diese Woche“");
  check(await panel.getByRole("region", { name: "Das ist da" }).getByText("Joghurt").isVisible(), "„Das ist da“ mit Joghurt");
};

export const rezept = async (page, check) => {
  await family(page, "/kochbuch/rezept?id=sp");
  check(await page.getByRole("heading", { name: "Spaghetti Bolognese" }).isVisible(), "Rezeptseite mit Titel");
  check(await page.getByText("Hackfleisch").first().isVisible(), "Zutaten");
};

export const einkauf = async (page, check) => {
  await family(page, "/einkaufsliste");
  // „Mehr hinzufügen“: tippen (mehrere mit Komma), Fertig
  await page.getByRole("button", { name: "Mehr hinzufügen" }).tap();
  const sheet = page.getByRole("dialog", { name: "Mehr hinzufügen" });
  await sheet.getByLabel("Suchen oder eintragen").fill("Milch, Brot");
  await sheet.getByLabel("Suchen oder eintragen").press("Enter");
  await sheet.getByText("2 ausgewählt").waitFor();
  await sheet.getByRole("button", { name: "Bananen", exact: true }).tap();
  check(await sheet.getByText("3 ausgewählt").isVisible(), "Katalog: „3 ausgewählt“");
  await sheet.getByRole("button", { name: "Fertig" }).tap();
  await page.waitForTimeout(600);
  const milch = page.getByRole("checkbox", { name: "Milch abhaken" });
  check((await milch.isVisible()) && (await page.getByRole("checkbox", { name: "Bananen abhaken" }).isVisible()), "Milch und Bananen als Kacheln");
  // Tippen = gekauft → nach 2 s unter „Zuletzt gekauft“
  await milch.tap();
  await page.waitForTimeout(2600);
  check(await page.getByRole("region", { name: "Zuletzt gekauft" }).getByRole("checkbox", { name: /Milch/ }).isVisible(), "abgehakt → „Zuletzt gekauft“");
  // Lange drücken = ändern
  const brot = page.getByRole("checkbox", { name: "Brot abhaken" });
  const box = await brot.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  check(await page.getByRole("dialog", { name: "Artikel bearbeiten" }).isVisible(), "lange drücken → „Artikel bearbeiten“");
};

export const vorrat = async (page, check) => {
  await family(page, "/vorrat");
  check(await page.getByText("Bald aufbrauchen").first().isVisible(), "„Bald aufbrauchen“");
  const before = (await store(page, "wasgibts.vorrat")).items.find((i) => i.name === "Paprika").amount;
  await page.getByRole("button", { name: /Paprika.*mehr|Mehr Paprika|\+.*Paprika/ }).first().click();
  await page.waitForTimeout(400);
  const after = (await store(page, "wasgibts.vorrat")).items.find((i) => i.name === "Paprika").amount;
  check(after === before + 1, `Paprika + 1 (${before} → ${after})`);
};
