// Schnelleingabe (Tafel 76): „＋ = tippen, Mia = sprechen“. Aufgaben-＋ →
// Feld hat sofort den Fokus → Satz → ➤ → „Eingetragen: … · Rückgängig“, Feld
// leer und offen → Aufgabe in der Kachel. Leeres ➤ tut nichts. Termin-＋
// „Zahnarzt Jonne Fr 16 Uhr“ → Chip „Fr, 23. Okt · 16:00“ → im Kalender am
// Freitag um 16:00. Rückgängig nimmt den Eintrag wieder weg. Zeit: Mi 21.10. 10:30.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const entries = async (page) => (await store(page, "wasgibts.eintraege"))?.entries ?? [];

export const schnelleingabe = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Aufgaben-＋
  const plus = page.getByRole("button", { name: "Neue Aufgabe" }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), "＋ → Schnelleingabe");
  check(await sheet.getByText("NEUE AUFGABE", { exact: true }).isVisible(), "Kopf „NEUE AUFGABE“");
  const box = sheet.getByRole("textbox", { name: "Neue Aufgabe" });
  await page.waitForTimeout(300);
  check(await box.evaluate((el) => el === document.activeElement), "Feld hat sofort den Fokus (Tastatur offen)");
  check(!(await sheet.getByRole("button", { name: /Mikro|Einsprechen/ }).count()), "kein eigenes Mikro");
  const fs = await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check(fs >= 16, `Feld ≥ 16 px (${fs})`);

  // Leeres ➤ tut nichts
  const before = (await entries(page)).length;
  check((await sheet.getByRole("button", { name: "Speichern" }).getAttribute("aria-disabled")) === "true", "leeres ➤ blass");
  await box.press("Enter");
  await page.waitForTimeout(300);
  check((await entries(page)).length === before && (await sheet.isVisible()), "leer speichern tut nichts");

  await box.fill("Malersachen kaufen");
  check(await sheet.getByRole("button", { name: /^Für mich/ }).or(sheet.getByText("Für mich")).first().isVisible(), "Chip „Für mich“");
  await sheet.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Eingetragen: Malersachen kaufen").isVisible(), "„Eingetragen: Malersachen kaufen“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit „Rückgängig“");
  check((await box.inputValue()) === "" && (await sheet.isVisible()), "Feld leer, bleibt offen für die nächste");
  check(await box.evaluate((el) => el === document.activeElement), "Fokus bleibt im Feld");
  await sheet.getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);
  check(await page.getByRole("region", { name: /Aufgaben/ }).getByText("Malersachen kaufen").first().isVisible().catch(() => false) || (await page.getByText("Malersachen kaufen").first().isVisible()), "Aufgabe in der Kachel");

  // Termin-＋: Satz → Chip → Kalender Fr 16:00
  const tplus = page.getByRole("button", { name: "Neuer Termin" }).first();
  await tplus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await tplus.click();
  await sheet.waitFor({ timeout: 5000 });
  await sheet.getByRole("textbox", { name: "Neuer Termin" }).fill("Zahnarzt Jonne Fr 16 Uhr");
  check(await sheet.getByRole("button", { name: /^Fr, 23\. Okt · 16:00/ }).isVisible(), "Chip „Fr, 23. Okt · 16:00“");
  check(await sheet.getByText("Familie", { exact: true }).isVisible(), "Chip „Familie“");
  await sheet.getByRole("textbox", { name: "Neuer Termin" }).press("Enter");
  await page.waitForTimeout(400);
  const t = (await entries(page)).find((e) => e.typ === "termin" && e.data.title === "Zahnarzt Jonne");
  check(t?.data.date === "2026-10-23" && t?.data.start === "16:00", `gespeichert Fr 23.10. 16:00 (${t?.data.date} ${t?.data.start})`);

  // Rückgängig nimmt ihn wieder weg
  await sheet.getByRole("textbox", { name: "Neuer Termin" }).fill("Probe morgen 9 Uhr");
  await sheet.getByRole("textbox", { name: "Neuer Termin" }).press("Enter");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(400);
  check(!(await entries(page)).some((e) => e.data.title === "Probe"), "Rückgängig nimmt den Termin weg");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.goto(BASE + "/tag?datum=2026-10-23");
  await page.waitForTimeout(900);
  check(await page.getByText("Zahnarzt Jonne").first().isVisible(), "im Kalender am Freitag");
  check(await page.getByText("16:00").first().isVisible(), "um 16:00");
};

/**
 * Erinnerungen (Tafel 77): beim ersten Start keine Frage; erster Termin mit
 * Uhrzeit → Chip mit Glocke „15:30 erinnern“ → nach dem Schließen der
 * Schnelleingabe Mias Frage „Soll ich dich erinnern?“ (Ja, gern / Lieber
 * nicht) → „Lieber nicht“ wird gemerkt; Glocke am Termin in der Kachel.
 */
export const erinnerungFrage = async (page, check) => {
  await hello(page);
  await page.waitForTimeout(600);
  check(!(await page.getByRole("dialog", { name: "Soll ich dich erinnern?" }).count()), "erster Start: keine Frage nach Mitteilungen");
  const tplus = page.getByRole("button", { name: "Neuer Termin" }).first();
  await tplus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await tplus.click();
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  await sheet.waitFor({ timeout: 5000 });
  await sheet.getByRole("textbox").fill("Zahnarzt morgen 16 Uhr");
  const chip = sheet.getByRole("button", { name: /15:30 erinnern/ });
  check(await chip.isVisible(), "Chip „15:30 erinnern“");
  await sheet.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(300);
  check(!(await page.getByRole("dialog", { name: "Soll ich dich erinnern?" }).count()), "keine Frage mitten ins Tippen");
  await sheet.getByRole("button", { name: "Schließen" }).last().click();
  const ask = page.getByRole("dialog", { name: "Soll ich dich erinnern?" });
  check(await ask.waitFor({ timeout: 4000 }).then(() => true, () => false), "danach Mias Frage");
  check((await ask.getByRole("button", { name: "Ja, gern" }).isVisible()) && (await ask.getByRole("button", { name: "Lieber nicht" }).isVisible()), "„Ja, gern“ / „Lieber nicht“");
  await ask.getByRole("button", { name: "Lieber nicht" }).click();
  await page.waitForTimeout(400);
  const saved = await store(page, "wasgibts.mitteilungen");
  check(saved?.answer === "nein" && saved?.asks === 1, "„Lieber nicht“ gemerkt");
  const t = (await entries(page)).find((e) => e.data.title === "Zahnarzt");
  check(t?.data.reminder === "30", "Termin mit Erinnerung 30 Min vorher");
};
