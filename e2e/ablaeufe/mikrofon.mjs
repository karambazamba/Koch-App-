// Mikrofon aus – so findet es jeder (Tafel 27): Fehler werden nachgestellt
// (Spracherkennung „not-allowed“ / „service-not-allowed“, getUserMedia
// „NotAllowedError“, Freigabe „prompt“). iPhone 15 Pro = iPhone-Schritte,
// Pixel 7 = Android-Schritte.
import { FAKE_MIC, hello, seedFamily } from "../lib.mjs";

const mia = (page) => page.getByRole("dialog").filter({ has: page.getByRole("textbox", { name: "Nachricht schreiben" }) });

export const mikrofon = async (page, check, device) => {
  const android = device === "Pixel 7";
  await page.addInitScript(FAKE_MIC);
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // 1. Erster Tipp aufs Mikro: erst fragen
  await page.getByRole("button", { name: /etwas sagen$/ }).click();
  const ask = page.getByRole("dialog", { name: "Darf ich zuhören?" });
  check(await ask.waitFor({ timeout: 5000 }).then(() => true, () => false), "erster Tipp → „Darf ich zuhören?“");
  check(await ask.getByText(android ? "dein Handy" : "dein iPhone", { exact: false }).isVisible(), android ? "Android: „dein Handy“" : "iPhone: „dein iPhone“");
  check(await ask.getByText("↑ so sieht die Frage aus").isVisible(), "nachgebauter System-Dialog");

  // 2. Okay → Erkennung startet erst jetzt → gesperrt → Hilfe
  await ask.getByRole("button", { name: "Okay, frag mich" }).click();
  const help = page.getByRole("dialog", { name: "Ich kann dich gerade nicht hören" });
  check(await help.waitFor({ timeout: 5000 }).then(() => true, () => false), "gesperrt → Hilfe-Fenster");
  check(await help.getByText(android ? "„Berechtigungen“" : "„Einstellungen“", { exact: false }).first().isVisible(), android ? "Android-Schritte" : "iPhone-Schritte");
  check(!(await page.getByRole("button", { name: "Zuhören beenden" }).count()), "kein hängender Stopp-Knopf");

  // 3. Zeig’s mir: 4 Schritte
  await help.getByRole("button", { name: "Zeig’s mir" }).click();
  const guide = page.getByRole("dialog", { name: "Zeig’s mir" });
  check(await guide.getByText("Schritt 1 von 4").isVisible(), "„Schritt 1 von 4“");
  for (let i = 0; i < 3; i++) {
    await guide.getByRole("button", { name: "Weiter" }).click();
    await page.waitForTimeout(450);
  }
  check(await guide.getByText("Schritt 4 von 4").isVisible(), "bis „Schritt 4 von 4“");
  check(await guide.getByRole("button", { name: "Nochmal versuchen" }).isVisible(), "am Ende „Nochmal versuchen“");
  await guide.getByRole("button", { name: "Nochmal versuchen" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Hm, noch aus.").isVisible(), "noch gesperrt → freundlicher Satz");
  await page.getByRole("dialog", { name: "Ich kann dich gerade nicht hören" }).getByRole("button", { name: "Lieber tippen" }).click();
  await page.waitForTimeout(400);

  // 4. An der Eingabe: gelber Streifen, grauer durchgestrichener Knopf
  const chat = mia(page);
  check(await chat.getByText("Mikro aus – tippen geht immer.").isVisible(), "gelber Streifen");
  const mic = chat.getByRole("button", { name: "Mikro aus – so machst du es an" });
  check(await mic.isVisible(), "grauer Mikro-Knopf (kein Stopp-Knopf)");
  await mic.click();
  check(await page.getByRole("dialog", { name: "Ich kann dich gerade nicht hören" }).waitFor({ timeout: 3000 }).then(() => true, () => false), "grauer Knopf öffnet die Hilfe");

  // 5. Diktieren aus (iPhone) – eigene Schritte
  await page.addInitScript(() => (window.__micError = "service-not-allowed"));
  await page.reload();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /etwas sagen$/ }).click();
  const second = page.getByRole("dialog", { name: "Ich kann dich gerade nicht hören" });
  check(await second.waitFor({ timeout: 5000 }).then(() => true, () => false), "zweites Mal ohne Vorab-Frage direkt Hilfe");
  check(await second.getByText(android ? "Das Mikrofon ist aus" : "Die Diktierfunktion ist aus", { exact: false }).isVisible(), android ? "Android: Mikrofon-Schritte" : "iPhone: Diktierfunktion-Schritte");
};
