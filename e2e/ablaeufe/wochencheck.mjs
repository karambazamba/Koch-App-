// Wochencheck – einfach drauflos reden (Tafel 36): „Wochencheck“ zu Mia →
// eigenes Fenster → erzählen (hier getippt) → „Fertig“ → „Deine Woche“ →
// Frage beantworten, Raum ändern, einen Punkt weglassen → „Alles übernehmen“
// → Kalender; ein Rückgängig nimmt alles zurück. Zeit: Mi 21.10. 10:30.
import { eineMia, hello, miaTippen, seedFamily, store } from "../lib.mjs";

const TAFEL = "Also, ähm, diese Woche … Dienstag haben wir Elternabend, halb acht glaub ich. Mittwoch muss ich das Paket zur Post bringen. Donnerstag 10 Uhr Meeting mit dem Lieferanten. Samstag hat Mathis noch ein Spiel, äh, keine Ahnung wann.";
const entries = async (page) => (await store(page, "wasgibts.eintraege")).entries;

export const wochencheck = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const before = (await entries(page)).length;

  // Einstieg über Mia
  const box = await miaTippen(page);
  await box.fill("Wochencheck");
  await box.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Wochencheck" });
  check(await sheet.waitFor({ timeout: 8000 }).then(() => true, () => false), "„Wochencheck“ → eigenes Fenster");
  check(await sheet.getByRole("button", { name: "Schließen" }).first().isVisible(), "oben ✕ wie überall (kein „Abbrechen“)");

  // Dieselbe Bühne wie jedes Gespräch: Mia unten, „Lieber schreiben“
  check(await sheet.getByRole("button", { name: "Frage einsprechen" }).isVisible(), "Mia unten auf der Bühne");
  check(await sheet.getByText("WOCHENCHECK", { exact: true }).isVisible(), "Bereichs-Kopf „WOCHENCHECK“");
  await eineMia(page, check, "Wochencheck");
  await sheet.getByRole("button", { name: "Lieber schreiben" }).click();

  // Erzählen (getippt) → „Ich hab schon“
  await sheet.getByRole("textbox", { name: "Was steht an?" }).fill(TAFEL);
  await page.waitForTimeout(300);
  check(await sheet.getByText("Ich hab schon").isVisible(), "„Ich hab schon“ mit ersten Punkten");
  await sheet.getByRole("button", { name: "Fertig" }).click();

  // „Deine Woche“
  const week = page.getByRole("dialog", { name: "Deine Woche" });
  check(await week.waitFor({ timeout: 10000 }).then(() => true, () => false), "„Deine Woche“ erscheint");
  check(await week.getByText("4 Sachen · 1 Frage").isVisible(), "4 Sachen, 1 Frage");
  for (const t of ["Elternabend", "Paket Post bringen", "Meeting mit Lieferanten", "Mathis: Spiel"]) check(await week.getByText(t, { exact: true }).isVisible(), `Zeile „${t}“`);

  // Frage beantworten
  await week.getByRole("group", { name: "Mathis: Spiel: Uhrzeit" }).getByRole("button", { name: "14:00" }).click();
  check(!(await week.getByRole("group", { name: "Mathis: Spiel: Uhrzeit" }).count()), "Frage beantwortet → Chips weg");

  // Zeile antippen → Raum Geschäftlich
  await week.getByRole("button", { name: "Paket Post bringen ändern" }).click();
  const card = page.getByRole("dialog", { name: "Ändern" });
  await card.getByRole("radio", { name: "Geschäftlich" }).click();
  await card.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(300);

  // Einen weglassen
  await week.getByRole("checkbox", { name: "Elternabend nicht übernehmen" }).click();
  await week.getByRole("button", { name: "Alles übernehmen" }).click();
  check(await page.getByText("3 Sachen eingetragen ✓").waitFor({ timeout: 4000 }).then(() => true, () => false), "„3 Sachen eingetragen ✓“");
  const after = await entries(page);
  const spiel = after.find((e) => e.data.title === "Mathis: Spiel");
  const paket = after.find((e) => e.data.title === "Paket Post bringen");
  check(after.length === before + 3, `3 neue Einträge (${after.length - before})`);
  check(spiel?.data.start === "14:00" && spiel?.data.date === "2026-10-24" && spiel?.data.who?.includes("k1"), "Spiel Sa 14:00 mit Mathis");
  check(paket?.raum === "arbeit", "Paket im Raum Geschäftlich");
  check(!after.some((e) => e.data.title === "Elternabend" && e.data.date === "2026-10-27"), "Elternabend weggelassen");

  // Ein Rückgängig für alles (Band 3 s)
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(300);
  check((await entries(page)).length === before, "Rückgängig nimmt alle drei zurück");
  check(await page.waitForURL(/seite=kalender/, { timeout: 4000 }).then(() => true, () => false), "danach der Kalender");
  await page.waitForTimeout(600);
  check(page.url().includes("seite=kalender"), "Kalender bleibt");
};
