// Notizen neu + Absätze (Tafel 93): Schnellfeld oben – Return = neue Zeile,
// „Sichern“ erst mit Text, erste Zeile = Titel → Karte unter „Zuletzt“.
// Notiz öffnen = Vollbild mit „Fertig“ und Werkzeugleiste, Liste: Return =
// neuer Eintrag. Pinnwand: Return = neue Zeile, angepinnt nur per „Anpinnen“.
import { BASE, hello, pinnwandSchreiben, seedFamily, store } from "../lib.mjs";

const notes = async (page) => (await store(page, "wasgibts.notizen"))?.notes ?? [];

export const notizen = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/notizen");
  const feld = page.getByRole("textbox", { name: "Schnell was aufschreiben" });
  await feld.waitFor();
  check(!(await page.getByRole("button", { name: "Sichern" }).count()), "„Sichern“ erst mit Text");
  check(await page.getByText("Return = neue Zeile").isVisible(), "leiser Hinweis „Return = neue Zeile“");
  await feld.click();
  await page.keyboard.type("Geschenkideen");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Laufrad");
  const before = (await notes(page)).length;
  check((await feld.inputValue()) === "Geschenkideen\nLaufrad" && (await notes(page)).length === before, "Return = neue Zeile, nichts gesichert");
  await page.getByRole("button", { name: "Sichern" }).click();
  await page.waitForTimeout(300);
  const saved = (await notes(page)).find((n) => n.data.title === "Geschenkideen");
  check(saved?.data.text === "Laufrad", "eigene Notiz: erste Zeile = Titel");
  check((await feld.inputValue()) === "", "Feld wieder leer");
  const card = page.getByRole("region", { name: "Zuletzt" }).getByRole("link", { name: "Geschenkideen" });
  check(await card.isVisible(), "Karte unter „Zuletzt“");

  // Vollbild
  await card.click();
  const fertig = page.getByRole("button", { name: "Fertig" });
  check(await fertig.waitFor({ timeout: 5000 }).then(() => true, () => false), "Vollbild mit „Fertig“");
  const leiste = page.getByRole("navigation", { name: "Werkzeuge" });
  for (const name of ["Liste", "Anheften", "Teilen", "Löschen"]) check(await leiste.getByRole("button", { name: new RegExp(name) }).isVisible(), `Werkzeug „${name}“`);
  check(!(await page.getByRole("button", { name: /^Sag .*was ansteht/ }).count()), "kein Mia-Knopf über der Leiste");
  await leiste.getByRole("button", { name: "Liste" }).click();
  const eintrag = page.getByRole("textbox", { name: "Eintrag" }).first();
  await eintrag.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Helm");
  await fertig.click();
  await page.waitForURL(/\/notizen$/, { timeout: 5000 }).catch(() => {});
  const liste = (await notes(page)).find((n) => n.data.title === "Geschenkideen");
  check(liste?.data.kind === "liste" && liste.data.items.map((i) => i.text).join(",") === "Laufrad,Helm", "Liste: Return = neuer Eintrag, Fertig sichert");

  // Neue leere Notiz über das Seiten-Plus, leer schließen = verworfen
  const count = (await notes(page)).length;
  await page.getByRole("button", { name: "Neue Notiz" }).click();
  await page.getByRole("button", { name: "Fertig" }).waitFor();
  await page.waitForTimeout(300);
  check(await page.getByRole("textbox", { name: "Titel" }).evaluate((el) => el === document.activeElement), "Plus: neue Notiz im Bearbeiten");
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  check((await notes(page)).length === count, "leere Notiz fällt weg");

  // Pinnwand („Neuer Zettel“, Tafel 106): Return = neue Zeile, angepinnt nur per „Anpinnen“
  await page.goto(BASE + "/pinnwand");
  await page.getByRole("button", { name: "Neuer Zettel" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Neuer Zettel" });
  const box = sheet.getByRole("textbox", { name: "Text auf dem Zettel" });
  await box.waitFor();
  await page.keyboard.type("Einkaufen:");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Milch und Brot");
  check((await box.inputValue()) === "Einkaufen:\nMilch und Brot" && (await sheet.isVisible()), "Pinnwand: Return = neue Zeile");
  await sheet.getByRole("button", { name: "Anpinnen" }).click();
  await page.waitForTimeout(500);
  const pin = page.locator(".zettel-text", { hasText: "Einkaufen:" }).first();
  check(await pin.evaluate((el) => getComputedStyle(el).whiteSpace === "pre-line" && el.textContent.includes("\n")), "Pinnwand zeigt die Zeilen");

  // Brücke zu Notizen: WLAN-Zettel → Mia fragt EINMAL → „Ja“ = eigene Notiz, Zettel ins Archiv
  await pinnwandSchreiben(page, "WLAN Gast: Tohuus2026");
  const frage = page.getByText("Klingt nach Notiz. Soll ich’s bei deinen Notizen ablegen?");
  check(await frage.isVisible(), "Mia fragt: „Klingt nach Notiz …“");
  const vorher = (await notes(page)).length;
  await page.getByRole("button", { name: "Ja", exact: true }).click();
  await page.waitForTimeout(500);
  check((await notes(page)).length === vorher + 1, "„Ja“ → eigene Notiz");
  check(!(await frage.count()), "Frage kommt nicht wieder");
  check(await page.getByRole("button", { name: /^Ältere · \d+/ }).isVisible(), "Zettel liegt im Archiv „Ältere“");
};
