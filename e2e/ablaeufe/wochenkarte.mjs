// Wochenkarte auf der Essen-Seite: Diese Woche / Nächste Woche mit ‹ ›, jeder
// Tag mit Bild, freier Tag öffnet „Was gibt’s …?“ mit Vorschlägen; von der
// Essen-Kachel aus „Woche ›“.
import { BASE, hello, seedFamily } from "../lib.mjs";

export const wochenkarte = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  const link = page.locator("[data-woche]").first();
  check(await link.isVisible(), "Essen-Kachel: „Woche ›“");
  await link.tap();
  await page.waitForTimeout(1200);
  const karte = page.locator("[role=tabpanel]:not([inert]) [data-wochenkarte]");
  check(await karte.isVisible(), "Woche führt zur Wochenkarte");
  check(await karte.getByRole("heading", { name: "Diese Woche" }).isVisible(), "„Diese Woche“");
  await karte.getByRole("button", { name: "Nächste Woche" }).tap();
  await page.waitForTimeout(500);
  check(await karte.getByRole("heading", { name: "Nächste Woche" }).isVisible(), "‹ › wechselt auf „Nächste Woche“");
  const frei = karte.getByRole("button", { name: /noch frei$/ }).first();
  check((await frei.count()) > 0, "nächste Woche: freie Tage");
  await frei.tap();
  const fenster = page.getByRole("dialog", { name: /^Was gibt’s am / });
  check(await fenster.waitFor({ timeout: 4000 }).then(() => true, () => false), "freier Tag: „Was gibt’s am …?“");
  check((await fenster.getByRole("button", { name: /Nehmen/ }).count()) > 0, "mit Vorschlägen");
};
