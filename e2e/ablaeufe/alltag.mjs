// Eintragen, Kalender, Pinnwand, Wetter, Chat ohne KI (Testmodus)
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const family = async (page, path = "/") => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + path);
  await page.waitForTimeout(1000);
};

export const eintragen = async (page, check) => {
  await family(page, "/?seite=kalender");
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neu eintragen" }).click();
  await page.waitForTimeout(500);
  check(await page.getByText("Was möchtest du eintragen?").isVisible(), "Eintragen-Fenster");
  await page.getByRole("button", { name: /^Termin/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("textbox").first().fill("Friseur");
  await page.locator('input[type="time"]').first().fill("14:00");
  await page.getByRole("dialog").getByRole("button", { name: "Eintragen" }).last().click();
  await page.waitForTimeout(600);
  const entries = (await store(page, "wasgibts.eintraege")).entries;
  check(entries.some((e) => e.data.title === "Friseur" && e.typ === "termin"), "Termin „Friseur“ gespeichert");
};

export const kalender = async (page, check) => {
  await family(page, "/?seite=kalender");
  const panel = page.locator("[role=tabpanel]:not([inert])");
  check(await panel.getByText("Oktober").first().isVisible(), "Monat Oktober");
  await panel.locator('button[aria-label^="Freitag, 23. Oktober"]').click();
  await page.waitForTimeout(400);
  check(await panel.getByText("Fußball Mathis").isVisible(), "Tag 23. zeigt „Fußball Mathis“");
};

export const pinnwand = async (page, check) => {
  await family(page, "/pinnwand");
  check(await page.getByText("Bin um 20 Uhr da").isVisible(), "Nachricht von Felix");
  await page.getByRole("textbox", { name: "Nachricht an alle" }).fill("Pizza ist im Ofen");
  await page.getByRole("button", { name: "Anheften" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Pizza ist im Ofen").isVisible(), "eigene Nachricht angeheftet");
};

export const wetter = async (page, check) => {
  await family(page, "/wetter");
  check(await page.locator(".wx-sky").isVisible(), "Himmel-Karte");
  await page.getByRole("tab", { name: "7 Tage" }).click();
  await page.waitForTimeout(300);
  check((await page.locator(".wx-col").count()) === 7, "7 Säulen");
};

export const chat = async (page, check) => {
  await family(page, "/");
  await page.getByRole("button", { name: /was ansteht/ }).first().click();
  await page.waitForTimeout(800);
  const box = page.getByRole("textbox").last();
  await box.fill("Was steht auf der Pinnwand?");
  await box.press("Enter");
  await page.waitForTimeout(2500);
  check(await page.getByText(/Bin um 20 Uhr da/).last().isVisible(), "Mia liest die Pinnwand vor");
};
