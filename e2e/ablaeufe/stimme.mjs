// Stimme – weg vom Blech-Klang (Tafel 28): Schein-Stimmen (speechSynthesis).
// Nur Standardstimme → nach dem ersten Vorlesen das Angebot; neue Stimme
// gefunden → grüne Karte; „Passt so“ → nie wieder.
import { FAKE_VOICES, hello, miaTippen, seedFamily } from "../lib.mjs";

async function chatOnce(page, text) {
  const box = await miaTippen(page);
  await box.fill(text);
  await box.press("Enter");
  await page.waitForTimeout(3500);
}

export const stimme = async (page, check, device) => {
  const android = device === "Pixel 7";
  await page.addInitScript(FAKE_VOICES);
  await hello(page);
  await seedFamily(page, { "wasgibts.vorlesen": { version: 1, mode: "an", voice: "", rate: "normal" } });
  await page.reload();
  await page.waitForTimeout(900);

  // Nur Standard → Angebot nach dem ersten Vorlesen
  await chatOnce(page, "Was gibt’s heute?");
  const offer = page.getByText(/Klinge ich blechern\?/);
  check(await offer.waitFor({ timeout: 8000 }).then(() => true, () => false), "nur Standardstimme → Angebot im Chat");
  check(await page.getByText(android ? "Dein Handy hat" : "Dein iPhone hat", { exact: false }).isVisible(), android ? "„Dein Handy“" : "„Dein iPhone“");

  // Anleitung → neue Stimme (Schein) → grüne Karte
  await page.getByRole("button", { name: "Schönere Stimme holen" }).click();
  const guide = page.getByRole("dialog", { name: "Schönere Stimme holen" });
  check(await guide.isVisible(), "Anleitung offen");
  // Test-iPhone meldet iOS 17 → „Gesprochene Inhalte“ (ab iOS 26 „Lesen & Sprechen“, siehe Unit-Test)
  check(await guide.getByText(android ? "Text-in-Sprache-Ausgabe" : "Gesprochene Inhalte", { exact: false }).isVisible(), android ? "Android-Schritte" : "iOS-Schritte passend zur Version");
  await page.evaluate(() => window.__voices.push(window.__mk("Anna (Premium)")));
  await guide.getByRole("button", { name: "Fertig geladen" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Neue Stimme gefunden. Ab jetzt sprech ich mit „Anna (Premium)“.").isVisible(), "grüne Karte mit neuer Stimme");
  check(await page.getByRole("button", { name: "Probehören" }).isVisible(), "„Probehören“");

  // Zweites Gerät: „Passt so“ → nie wieder
  const page2 = await page.context().newPage();
  await page2.addInitScript(FAKE_VOICES);
  await page2.goto(page.url());
  await page2.evaluate(() => {
    localStorage.removeItem("wasgibts.einmalhinweise");
  });
  await page2.reload();
  await page2.waitForTimeout(900);
  await chatOnce(page2, "Was gibt’s heute?");
  await page2.getByRole("button", { name: "Passt so" }).waitFor({ timeout: 8000 });
  await page2.getByRole("button", { name: "Passt so" }).click();
  await page2.reload();
  await page2.waitForTimeout(900);
  await chatOnce(page2, "Und morgen?");
  await page2.waitForTimeout(3000);
  check(!(await page2.getByText(/Klinge ich blechern\?/).count()), "„Passt so“ → nie wieder angeboten");
  await page2.close();
};
