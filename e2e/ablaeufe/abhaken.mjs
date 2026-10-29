// Abhaken überall gleich (Launch 1.0, Auftrag 4): Kachel, Aufgaben-Seite und
// „Dein Tag“ – durchstreichen, 1,5 s, weg, „Erledigt · Rückgängig“. „Dein Tag“
// hat ein ✕ und schließt wie jedes Fenster (✕, Danebentippen, Escape).
import { BASE, hello, seedFamily } from "../lib.mjs";

const TITLE = "Kita-Formular abgeben";

/** Haken setzen, kurz durchgestrichen, nach 1,5 s weg, Meldung „Erledigt“ – dann zurücknehmen */
async function abhaken(page, scope, check, where) {
  const box = scope.getByRole("checkbox", { name: `${TITLE} erledigt` }).first();
  await box.click();
  await page.waitForTimeout(300);
  check((await box.getAttribute("aria-checked")) === "true", `${where}: gleich abgehakt`);
  check(await scope.locator(".line-through", { hasText: TITLE }).first().isVisible(), `${where}: durchgestrichen`);
  await page.waitForTimeout(1500);
  check(!(await scope.getByRole("checkbox", { name: `${TITLE} erledigt` }).count()), `${where}: nach 1,5 s weg`);
  // Die Meldung (role=status) – nicht der Bereich „Erledigt ⌄“ auf der Aufgaben-Seite (A-043)
  const toast = page.getByRole("status").getByText("Erledigt", { exact: true });
  check(await toast.isVisible(), `${where}: „Erledigt · Rückgängig“`);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(600);
  check(await scope.getByRole("checkbox", { name: `${TITLE} erledigt` }).first().isVisible(), `${where}: Rückgängig holt sie zurück`);
}

export const abhakenUeberall = async (page, check) => {
  await hello(page);
  await seedFamily(page);

  // Kachel auf der Startseite
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const home = page.locator("[role=tabpanel]:not([inert])");
  await abhaken(page, home, check, "Kachel");

  // Aufgaben-Seite
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(1200);
  await abhaken(page, page.locator("main"), check, "Aufgaben-Seite");

  // Dein Tag (über die Jetzt-Karte – A-054: sie steht nur mit einem Thema, hier „Gleich 16:15 Zahnarzt.“)
  await page.clock.setFixedTime(new Date("2026-10-21T15:40:00+02:00"));
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const openDay = async () => {
    await page.locator("[data-jetzt]").getByRole("button").first().click();
    const sheet = page.getByRole("dialog", { name: "Dein Tag" });
    await sheet.waitFor({ timeout: 5000 });
    return sheet;
  };
  let day = await openDay();
  // [0] = Fläche dahinter (Danebentippen), [1] = ✕ im Kopf
  check(await day.getByRole("button", { name: "Schließen" }).nth(1).isVisible(), "Dein Tag: ✕ oben");
  await abhaken(page, day, check, "Dein Tag");
  await day.getByRole("button", { name: "Schließen" }).nth(1).click();
  await page.waitForTimeout(600);
  check(!(await page.getByRole("dialog", { name: "Dein Tag" }).count()), "Dein Tag: ✕ schließt");

  day = await openDay();
  await page.mouse.click(20, 40);
  await page.waitForTimeout(600);
  check(!(await page.getByRole("dialog", { name: "Dein Tag" }).count()), "Dein Tag: Danebentippen schließt");

  day = await openDay();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  check(!(await page.getByRole("dialog", { name: "Dein Tag" }).count()), "Dein Tag: Zurück/Escape schließt");
};
