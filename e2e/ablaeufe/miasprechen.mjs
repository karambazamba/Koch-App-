// Mia sprechen (Launch 1.0, Abschnitt 1.5) in einem Zug: lange Nachricht mit
// Pausen wird EINE Nachricht, Kleines sofort mit „Rückgängig“, „Lieber
// tippen“ → tippen → senden, Danebentippen schließt (bei offener Tastatur
// erst nur die Tastatur). Zeit: Mi 21.10. 10:30.
import { BASE, FAKE_HOEREN, FAKE_VOICES, hello, seedFamily, store } from "../lib.mjs";

const sag = (page, list, ab = 0) => page.evaluate(([l, a]) => window.__sag(l, a), [list, ab]);
const eigene = (page) => page.locator("[data-gespraech] .bg-accent.rounded-br-md").evaluateAll((els) => els.filter((e) => !e.closest("[data-eigene-blase]")).map((e) => e.textContent.trim()));
const offen = (page) => page.locator("[data-buehne-mia]").count();

export const miaSprechen = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 5000 });
  const vorher = (await store(page, "wasgibts.eintraege"))?.entries.length ?? 0;

  // Lange Nachricht mit zwei Pausen: nichts geht vorher raus, am Ende ein Satz
  await sag(page, [["Morgen um 9", true]]);
  await page.waitForTimeout(1100);
  await page.evaluate(() => window.__ende());
  await page.waitForTimeout(500);
  await sag(page, [["Termin beim", true]]);
  await page.waitForTimeout(1100);
  await sag(page, [["Termin beim", true], ["Steuerberater", true]]);
  await page.waitForTimeout(1200);
  check((await eigene(page)).length === 0, "Pausen schicken nichts ab");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].some((e) => !e.closest("[data-eigene-blase]")), null, { timeout: 6000 }).catch(() => {});
  const gesagt = await eigene(page);
  check(gesagt.length === 1 && /Morgen um 9 Termin beim Steuerberater/.test(gesagt[0]), `eine Nachricht mit allem (${JSON.stringify(gesagt)})`);

  // Kleines sofort: eingetragen, „Rückgängig“ nimmt es wieder raus
  const mia = page.getByRole("dialog").last();
  const undo = mia.getByRole("button", { name: "Rückgängig" });
  check(await undo.waitFor({ timeout: 8000 }).then(() => true, () => false), "sofort eingetragen, mit „Rückgängig“");
  check((await store(page, "wasgibts.eintraege")).entries.length === vorher + 1, "Termin steht drin");
  await undo.click();
  await page.waitForTimeout(400);
  check((await store(page, "wasgibts.eintraege")).entries.length === vorher, "„Rückgängig“ nimmt ihn raus");

  // Lieber schreiben → tippen → senden
  await mia.getByRole("button", { name: "Lieber schreiben", exact: true }).click();
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  await box.waitFor({ timeout: 5000 });
  await box.fill("Freitag um 16 Uhr Friseur");
  await box.press("Enter");
  check(await page.waitForFunction(() => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].some((e) => e.textContent.includes("Freitag um 16 Uhr Friseur")), null, { timeout: 6000 }).then(() => true, () => false), "getippt und gesendet");
  check(await mia.getByRole("button", { name: "Rückgängig" }).waitFor({ timeout: 8000 }).then(() => true, () => false), "getippt: auch sofort mit „Rückgängig“");

  // Danebentippen: mit Tastatur erst nur die Tastatur, dann schließt die Bühne
  await box.focus();
  const leer = page.locator("[data-daneben]").first();
  const flaeche = await leer.boundingBox();
  await page.mouse.click(flaeche.x + 12, flaeche.y + flaeche.height * 0.3);
  await page.waitForTimeout(500);
  check((await offen(page)) === 1, "Danebentippen bei offener Tastatur: Bühne bleibt");
  await page.mouse.click(flaeche.x + 12, flaeche.y + flaeche.height * 0.3);
  await page.waitForTimeout(1500);
  check((await offen(page)) === 0, "Danebentippen schließt die Bühne");
  check(page.url().endsWith("/"), "Seite bleibt");
};
