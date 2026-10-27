// Mikrofon aus – so findet es jeder (Tafel 27): Fehler werden nachgestellt
// (Spracherkennung „not-allowed“ / „service-not-allowed“, getUserMedia
// „NotAllowedError“, Freigabe „prompt“). iPhone 15 Pro = iPhone-Schritte,
// Pixel 7 = Android-Schritte.
import { FAKE_MIC, hello, seedFamily } from "../lib.mjs";

/** Mia holen und aufs Mikro tippen (Sprechen bzw. grauer Knopf, wenn aus) */
async function micTap(page) {
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  // Mia antippen; ist das Mikro schon als aus bekannt, öffnet sie das Tippfeld – dann „Anmachen ›“
  const tap = page.getByRole("button", { name: /^(Frage einsprechen|Schreiben statt sprechen)$/ }).last();
  const blocked = (await tap.getAttribute("aria-label")) === "Schreiben statt sprechen";
  await tap.click();
  if (blocked) await page.getByRole("button", { name: "Anmachen ›" }).click();
}

const mia = (page) => page.getByRole("dialog").filter({ has: page.getByRole("textbox", { name: "Nachricht schreiben" }) });

export const mikrofon = async (page, check, device) => {
  const android = device === "Pixel 7";
  await page.addInitScript(FAKE_MIC);
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // 1. Erster Tipp aufs Mikro: erst fragen
  await micTap(page);
  const ask = page.getByRole("dialog", { name: "Darf ich zuhören?" });
  check(await ask.waitFor({ timeout: 5000 }).then(() => true, () => false), "erster Tipp → „Darf ich zuhören?“");
  check(await ask.getByText(android ? "dein Handy" : "dein iPhone", { exact: false }).isVisible(), android ? "Android: „dein Handy“" : "iPhone: „dein iPhone“");
  check(await ask.getByText("↑ so sieht die Frage aus").isVisible(), "nachgebauter System-Dialog");

  if (!android) check(await ask.getByText("Falls danach nichts passiert: Ich zeig dir, woran’s liegt.").isVisible(), "iPhone: „Falls danach nichts passiert …“");

  // 2. Okay → Erkennung startet erst jetzt → gesperrt → Mikro-Check mit nur den passenden Schritten
  await ask.getByRole("button", { name: "Okay, frag mich" }).click();
  const help = page.getByRole("dialog", { name: "Mikrofon prüfen" });
  check(await help.waitFor({ timeout: 5000 }).then(() => true, () => false), "gesperrt → „Mikrofon prüfen“ öffnet sich von selbst");
  check((await help.locator("[data-pruef=mikro]").getAttribute("data-stand")) === "fehler", "Häkchen-Liste: Mikrofon ✗");
  check(await help.getByText(android ? "„Website-Einstellungen“ → „Mikrofon“" : "„Safari“ → „Mikrofon“ → „Erlauben“", { exact: false }).first().isVisible(), android ? "Android-Schritte" : "iPhone: Schalter Mikrofon");
  if (!android) {
    check(!(await help.getByText("„Diktierfunktion“ an", { exact: false }).count()), "iPhone: nur der fehlende Schalter (keine Diktierfunktion)");
    check(await help.locator("[data-seiten-kasten]").isVisible(), "Kasten „Immer noch durchgestrichen?“");
  }
  check(await help.getByText("Menünamen können je nach Handy leicht abweichen.").isVisible(), "Hinweis Menünamen");
  check(!(await page.getByRole("button", { name: "Zuhören beenden" }).count()), "kein hängender Stopp-Knopf");

  // 3. Zeig’s mir: ein Schritt pro Bildschirm, am Ende „Nochmal testen“
  await help.getByRole("button", { name: "Zeig’s mir" }).click();
  const guide = page.getByRole("dialog", { name: "Zeig’s mir" });
  const n = android ? 5 : 3;
  check(await guide.getByText(`Schritt 1 von ${n}`).isVisible(), `„Schritt 1 von ${n}“`);
  for (let i = 0; i < n - 1; i++) {
    await guide.getByRole("button", { name: "Weiter" }).click();
    await page.waitForTimeout(450);
  }
  check(await guide.getByText(`Schritt ${n} von ${n}`).isVisible(), `bis „Schritt ${n} von ${n}“`);
  check((await guide.locator("[data-wischen]").count()) > 0, "letzter Schritt: neu öffnen mit kleiner Animation");
  await guide.getByRole("button", { name: "Nochmal testen" }).click();
  const again = page.getByRole("dialog", { name: "Mikrofon prüfen" });
  await again.getByText(android ? "Das Mikrofon ist für" : "Safari darf das Mikrofon nicht benutzen", { exact: false }).waitFor({ timeout: 8000 });
  check((await again.locator("[data-pruef=mikro]").getAttribute("data-stand")) === "fehler", "„Nochmal testen“ prüft neu: noch gesperrt");
  await again.getByRole("button", { name: "Lieber schreiben" }).click();
  await page.waitForTimeout(400);

  // 4. Auf der Bühne: Tippfeld mit gelbem Streifen, Mia klein darüber; kein Fenster davor
  const chat = mia(page);
  check(await chat.getByText("Mikro aus – schreiben geht immer.").isVisible(), "gelber Streifen");
  const small = chat.getByRole("button", { name: "Schreiben statt sprechen" });
  check(await small.isVisible(), "Mia klein über dem Feld (kein Stopp-Knopf)");
  await small.click();
  await page.waitForTimeout(400);
  check(!(await page.getByRole("dialog", { name: "Mikrofon prüfen" }).count()), "Mia antippen bei Mikro aus: kein Fenster");
  await chat.getByRole("button", { name: "Anmachen ›" }).click();
  check(await page.getByRole("dialog", { name: "Mikrofon prüfen" }).waitFor({ timeout: 3000 }).then(() => true, () => false), "„Anmachen ›“ öffnet den Mikro-Check");

  // 5. Diktieren/Spracherkennung aus (iPhone: service-not-allowed) – nur Schalter 2 und 3
  await page.addInitScript(() => (window.__micError = "service-not-allowed"));
  await page.reload();
  await page.waitForTimeout(900);
  await micTap(page);
  const second = page.getByRole("dialog", { name: "Mikrofon prüfen" });
  check(await second.waitFor({ timeout: 5000 }).then(() => true, () => false), "zweites Mal ohne Vorab-Frage direkt der Mikro-Check");
  if (android) check(await second.getByText("Öffne Chrome").isVisible(), "Android: Chrome-Schritte");
  else {
    check(await second.getByText("Das Mikrofon ist an, aber das Zuhören ist aus.", { exact: false }).isVisible(), "iPhone: Zuhören aus");
    check(await second.getByText("„Allgemein“ → „Tastatur“ → „Diktierfunktion“ an", { exact: false }).isVisible(), "Schalter Diktierfunktion");
    check(await second.getByText("„Datenschutz & Sicherheit“ → „Spracherkennung“ → „Safari“ an", { exact: false }).isVisible(), "Schalter Spracherkennung → Safari");
    check(!(await second.getByText("„Safari“ → „Mikrofon“", { exact: false }).count()), "kein Mikrofon-Schalter");
  }
};
