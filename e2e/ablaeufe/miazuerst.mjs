// Mia zuerst – erzählen statt ausfüllen (Tafel 53): runder Knopf statt
// Leiste, Mia fliegt in die Mitte, Karte mit „Passt“, Zustimmung per „ja“,
// danach schließt Mia von selbst; „＋“ holt Mia, „Lieber Formular“ bleibt;
// Schließen per ✕ und Zurück. Zeit: Mi 21.10. 10:30.
import { hello, miaTippen, seedFamily, store } from "../lib.mjs";

export const miaZuerst = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const knopf = page.getByRole("button", { name: /^Sag .*was ansteht/ });
  check(await knopf.isVisible(), "runder Mia-Knopf unten");
  const box0 = await knopf.boundingBox();
  const vp = page.viewportSize();
  check(box0.x + box0.width > vp.width - 40 && box0.width >= 70, "rechts unten, ca. 72 px");
  check(!(await page.getByRole("textbox", { name: "Nachricht schreiben" }).count()), "keine Schreib-Leiste");

  // Tippen → Mia in der Mitte, erzählen (hier getippt)
  const box = await miaTippen(page);
  const mia = page.getByRole("dialog").last();
  check(await mia.getByRole("button", { name: "Verlauf" }).isVisible(), "oben „Verlauf“");
  const before = (await store(page, "wasgibts.eintraege")).entries.length;
  await box.fill("Morgen um 9 Steuerberater");
  await box.press("Enter");
  const passt = mia.getByRole("button", { name: /^Passt/ });
  check(await passt.waitFor({ timeout: 8000 }).then(() => true, () => false), "Karte mit „Passt“");
  // Zustimmung per „ja“ (wie gesprochen)
  const field = await (async () => ((await page.getByRole("textbox", { name: "Nachricht schreiben" }).isVisible()) ? page.getByRole("textbox", { name: "Nachricht schreiben" }) : (await mia.getByRole("button", { name: "Tippen" }).click(), page.getByRole("textbox", { name: "Nachricht schreiben" }))))();
  await field.fill("ja");
  await field.press("Enter");
  check(await mia.getByText("ERLEDIGT").waitFor({ timeout: 2000 }).then(() => true, () => false), "„ERLEDIGT“");
  check(await page.getByRole("button", { name: "Verlauf" }).waitFor({ state: "detached", timeout: 4000 }).then(() => true, () => false), "schließt nach ~1 s von selbst");
  check(await page.getByRole("status").getByText("Übernommen", { exact: true }).isVisible(), "Meldung „Übernommen“");
  check((await store(page, "wasgibts.eintraege")).entries.length === before + 1, "Termin eingetragen");

  // „＋“ auf der Termine-Kachel → Mia fragt, „Lieber Formular“ öffnet das Fenster
  const plus = page.getByRole("button", { name: "Neuer Termin" }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  check(await page.getByText("Welcher Termin? Sag einfach, wann und was.").waitFor({ timeout: 4000 }).then(() => true, () => false), "„＋“ → Mia: „Welcher Termin?“");
  await page.getByRole("button", { name: "Lieber Formular" }).click();
  check(await page.getByRole("dialog", { name: "Neuer Termin" }).waitFor({ timeout: 4000 }).then(() => true, () => false), "„Lieber Formular“ → Fenster „Neuer Termin“");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Schließen per ✕ und per Zurück
  await knopf.click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Schließen" }).click();
  await page.waitForTimeout(500);
  check(!(await page.getByRole("button", { name: "Verlauf" }).count()), "✕ schließt");
  await knopf.click();
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(600);
  check(!(await page.getByRole("button", { name: "Verlauf" }).count()) && page.url().endsWith("/"), "Zurück schließt (Seite bleibt)");
};
