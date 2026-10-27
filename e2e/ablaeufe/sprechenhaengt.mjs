// Sprechen hängt nach 3–4 Runden (iPhone): der 4. Start bleibt stumm – der
// Wachhund startet still neu, Mia hört weiter zu. Danach: Rückkehr aus dem
// Hintergrund setzt das Zuhören zurück, Antippen hört wieder zu. Mikro-Protokoll
// unter „Für Entwickler“.
import { BASE, FAKE_HOEREN, FAKE_VOICES, hello, seedFamily } from "../lib.mjs";

const sag = (page, text) => page.evaluate((t) => window.__sag([[t, true]]), text);
const bubbles = (page) => page.locator("[data-gespraech] .bg-accent.rounded-br-md").evaluateAll((els) => els.filter((e) => !e.closest("[data-eigene-blase]")).map((e) => e.textContent.trim()));
const hoert = (page) => page.waitForFunction(() => window.__rec?.running && !window.__rec.stumm, null, { timeout: 6000 }).then(() => true, () => false);

export const sprechenHaengt = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(() => (window.__haengt = [4]));
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  const mia = page.getByRole("dialog").last();
  for (let i = 1; i <= 5; i++) {
    if (i > 1) await mia.getByRole("button", { name: "Frage einsprechen" }).last().click();
    // Runde 4: erster Start stumm → nach 1,5 s still neu
    const ok = await hoert(page);
    check(ok, i === 4 ? "Runde 4: Wachhund startet neu, Mia hört zu" : `Runde ${i}: hört zu`);
    if (!ok) return;
    await sag(page, `Notier dir Runde ${i}`);
    await mia.getByRole("button", { name: "Zuhören beenden" }).last().click();
    check(await page.waitForFunction((n) => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].filter((e) => !e.closest("[data-eigene-blase]")).length >= n, i, { timeout: 8000 }).then(() => true, () => false), `Runde ${i}: abgeschickt`);
    await mia.getByRole("button", { name: "Frage einsprechen" }).last().waitFor({ timeout: 10000 }).catch(() => {});
  }
  check((await bubbles(page)).length === 5, "5 Runden, 5 Nachrichten");

  // Zurück aus dem Hintergrund: Zuhören ist beendet, Antippen hört neu zu
  await mia.getByRole("button", { name: "Frage einsprechen" }).last().click();
  await hoert(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  check(await mia.getByRole("button", { name: "Frage einsprechen" }).last().waitFor({ timeout: 4000 }).then(() => true, () => false), "Hintergrund: Zuhören zurückgesetzt");
  await mia.getByRole("button", { name: "Frage einsprechen" }).last().click();
  check(await hoert(page), "danach hört Mia wieder zu");

  const log = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.mikroprotokoll") ?? "{}").entries?.map((e) => e.text) ?? []);
  check(log.some((l) => l.startsWith("Wachhund: kein Start")) && log.some((l) => l.startsWith("Hintergrund")), "Mikro-Protokoll: Wachhund und Hintergrund");
  check(!log.join(" ").includes("Runde"), "Protokoll ohne Gesprochenes");
  await page.goto(BASE + "/profil/admin");
  // Die Einträge kommen erst nach dem Laden aus dem Speicher – kurz warten
  const teilen = page.locator("[data-mikro-protokoll]").getByRole("button", { name: "Teilen" });
  check(await teilen.waitFor({ timeout: 5000 }).then(() => true, () => false), "Für Entwickler: Mikro-Protokoll mit Teilen");
};
