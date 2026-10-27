// Essen, Rezept, Einkauf, Im Haus
import { BASE, hello, katalog, seedFamily, store } from "../lib.mjs";

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
  check(await panel.getByRole("heading", { name: "Die nächsten 7 Tage" }).isVisible(), "„Die nächsten 7 Tage“");
  check(await panel.getByRole("region", { name: "Das ist da" }).getByText("Joghurt").isVisible(), "„Das ist da“ mit Joghurt");
};

export const rezept = async (page, check) => {
  await family(page, "/kochbuch/rezept?id=sp");
  check(await page.getByRole("heading", { name: "Spaghetti Bolognese" }).isVisible(), "Rezeptseite mit Titel");
  check(await page.getByText("Hackfleisch").first().isVisible(), "Zutaten");
};

export const einkauf = async (page, check) => {
  await family(page, "/einkaufsliste");
  // ＋ → „Mehr Details“ = „Mehr hinzufügen“: tippen (mehrere mit Komma), Fertig
  const sheet = await katalog(page);
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
  // „Zuletzt gekauft“ ist zugeklappt (Einkauf aufgeräumt, v0.119): aufklappen
  const zuletzt = page.getByRole("region", { name: "Zuletzt gekauft" });
  await zuletzt.getByRole("button", { name: /^Zuletzt gekauft/ }).tap();
  await page.waitForTimeout(400);
  check(await zuletzt.getByRole("checkbox", { name: /Milch/ }).isVisible(), "abgehakt → „Zuletzt gekauft“");
  // Lange drücken = ändern
  const brot = page.getByRole("checkbox", { name: "Brot abhaken" });
  await brot.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await brot.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  check(await page.getByRole("dialog", { name: "Artikel bearbeiten" }).isVisible(), "lange drücken → „Artikel bearbeiten“");
};

// „Im Haus“ (Tafel 78/79): Brot im Einkauf abhaken → steht im Schrank, ohne
// Menge → antippen = aufgebraucht → nochmal = wieder im Einkauf; „Daraus
// kochen“ (Kachel) bzw. „Was kann ich daraus kochen?“ → Kochidee.
export const imHaus = async (page, check) => {
  await family(page, "/vorrat");
  check(await page.getByRole("heading", { name: "Im Haus", level: 1 }).isVisible(), "Seite heißt „Im Haus“");
  check(await page.getByRole("region", { name: "Bald aufbrauchen" }).getByText("Joghurt").isVisible(), "„Bald aufbrauchen“: Joghurt");
  check(!(await page.getByText(/500 g|2 Stück/).count()), "keine Mengen");
  await page.goto(BASE + "/einkaufsliste");
  const sheet = await katalog(page);
  await sheet.getByLabel("Suchen oder eintragen").fill("Brot");
  await sheet.getByLabel("Suchen oder eintragen").press("Enter");
  await sheet.getByRole("button", { name: "Fertig" }).tap();
  await page.getByRole("checkbox", { name: "Brot abhaken" }).tap();
  check(await page.getByText("Im Haus: Brot").waitFor({ timeout: 5000 }).then(() => true, () => false), "Meldung „Im Haus: Brot“");
  await page.goto(BASE + "/vorrat");
  const schrank = page.getByRole("region", { name: "Schrank" });
  check(await schrank.getByRole("button", { name: "Brot aufgebraucht" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Brot steht im Schrank");
  await schrank.getByRole("button", { name: "Brot aufgebraucht" }).tap();
  const used = page.getByRole("region", { name: /^Aufgebraucht/ });
  check(await used.getByRole("button", { name: "Brot wieder auf die Liste" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "antippen → aufgebraucht");
  await used.getByRole("button", { name: "Brot wieder auf die Liste" }).tap();
  check(await page.getByText("Steht wieder auf der Liste").isVisible(), "nochmal → wieder auf der Liste");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(Object.values(list.weeks).some((w) => w.manual.some((m) => m.name === "Brot" && !m.done)), "Brot steht wieder im Einkauf");
  await page.getByRole("button", { name: "Was kann ich daraus kochen?" }).tap();
  check(await page.getByRole("dialog").first().waitFor({ timeout: 5000 }).then(() => true, () => false), "„Was kann ich daraus kochen?“ öffnet die Kochidee");
};

// Rezept-Link an Mia (Teilen-Menü): Karte mit Zutaten → „auf die Liste“
export const rezeptLink = async (page, check) => {
  await family(page, "/?geteilt=1&title=Suppe&url=" + encodeURIComponent("https://rezept.test/kuerbissuppe"));
  const card = page.locator("[data-rezept-link]");
  check(await card.waitFor({ timeout: 10000 }).then(() => true, () => false), "Karte zum Rezept-Link");
  check(await card.getByText("Kürbissuppe mit Ingwer").isVisible(), "Titel aus der Seite");
  check(await card.getByRole("link", { name: /rezept\.test/ }).isVisible(), "Quelle verlinkt");
  check(await card.getByText(/^auf die Liste: /).isVisible(), "„auf die Liste: …“");
  await card.getByRole("button", { name: /auf die Liste$/ }).click();
  check(await card.getByText("Steht auf der Liste.").isVisible(), "„Steht auf der Liste.“");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(Object.values(list.weeks).some((w) => w.manual.some((m) => m.name === "Hokkaido-Kürbis" && m.dish === "Kürbissuppe mit Ingwer")), "Kürbis mit Gericht auf der Liste");
  check(!page.url().includes("geteilt"), "Adresse aufgeräumt");
};
