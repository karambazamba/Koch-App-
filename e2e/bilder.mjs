// npm run bilder – Bildschirmfotos aller Hauptseiten (iPhone SE, iPhone 15
// Pro, Pixel 7 · hell und dunkel · feste Zeit, fester Zufall, Testmodi) nach
// .bilder/aktuell; mit `-- --basis` nach .bilder/basis (Ausgangslage).
// npm run bilder:vergleich – vergleicht aktuell mit basis (Abweichung > 0,1 %
// wird gemeldet, Unterschiedsbild in .bilder/unterschied).
import { mkdirSync } from "node:fs";
import { BASE, DEVICES, FAKE_MIC, FAKE_VOICES, hello, launch, newPage, seedFamily, setDark, startServer } from "./lib.mjs";
import { RECIPE_DATA } from "./ablaeufe/essen.mjs";

/** Warten, bis Netz ruhig und alle Bilder (auch live gezeichnete Gerichte) fertig sind */
async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {})))).catch(() => {});
  await page.waitForTimeout(600);
}

const PAGES = [
  ["heute", "/"],
  ["kalender", "/?seite=kalender"],
  ["essen", "/?seite=essen"],
  ["rezept", "/kochbuch/rezept?id=sp"],
  ["einkauf", "/einkaufsliste"],
  ["vorrat", "/vorrat"],
  ["pinnwand", "/pinnwand"],
  ["notizen", "/notizen"],
  ["aufgaben", "/aufgaben"],
  ["wetter", "/wetter"],
  ["spendentopf", "/spendentopf"],
  ["tipps", "/tipps"],
  ["einstellungen", "/profil"],
  ["begleitung", "/profil/kuechenhelfer"],
];

/** Szenen: Fenster, die erst nach einer Handlung da sind (Mikrofon aus mit Schein-Fehler) */
const micTap = (page) => page.getByRole("button", { name: /etwas sagen$/ }).click();
const openTermin = async (page, text) => {
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neu eintragen" }).click();
  await page.getByRole("button", { name: /^Termin/ }).first().click();
  await page.getByRole("textbox", { name: "Termin" }).fill(text);
  await page.waitForTimeout(500);
};
const voiceOffer = async (page) => {
  await page.evaluate(() => localStorage.setItem("wasgibts.vorlesen", JSON.stringify({ version: 1, mode: "an", voice: "", rate: "normal" })));
  await page.reload();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).click();
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  await box.fill("Was gibt’s heute?");
  await box.press("Enter");
  await page.getByRole("button", { name: "Passt so" }).waitFor({ timeout: 10000 });
};
const WOCHE = "Dienstag haben wir Elternabend, halb acht. Donnerstag muss ich das Paket zur Post bringen. Freitag 10 Uhr Meeting mit dem Lieferanten. Samstag hat Mathis ein Spiel.";
const weekCheck = async (page, done) => {
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).click();
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  await box.fill("Wochencheck");
  await box.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Wochencheck" });
  await sheet.waitFor({ timeout: 10000 });
  await sheet.getByRole("textbox", { name: "Was steht an?" }).fill(WOCHE);
  if (!done) return page.waitForTimeout(400);
  await sheet.getByRole("button", { name: "Fertig" }).click();
  await page.getByRole("dialog", { name: "Deine Woche" }).waitFor({ timeout: 10000 });
};
const cookTip = async (page, card) => {
  await page.evaluate(() => localStorage.setItem("wasgibts.kochtipp", JSON.stringify({ version: 1, days: ["2026-10-19", "2026-10-20", "2026-10-21"], unlocked: false, popped: true, last: null, shown: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  await page.getByRole("region", { name: /^Essen/ }).evaluate((el) => el.scrollIntoView({ block: "center" }));
  if (!card) return;
  await page.getByRole("button", { name: /^Kochtipp – spontan mit/ }).click();
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  await box.fill("Ich hab noch Hähnchen, Reis und Paprika");
  await box.press("Enter");
  await page.getByRole("article", { name: /^Vorschlag:/ }).waitFor({ timeout: 5000 });
  await settle(page);
};
const SCENES = [
  ["stimme-angebot", voiceOffer],
  ["stimme-anleitung", async (page) => (await voiceOffer(page), await page.getByRole("button", { name: "Schönere Stimme holen" }).click())],
  ["kochtipp-muetze", (page) => cookTip(page, false)],
  ["kochtipp-karte", (page) => cookTip(page, true)],
  ["wochencheck-erzaehlen", (page) => weekCheck(page, false)],
  ["wochencheck-woche", (page) => weekCheck(page, true)],
  ["termin-satz", (page) => openTermin(page, "Mittwoch 12.30 Physio")],
  ["termin-frei", (page) => openTermin(page, "Elternabend")],
  ["termin-vorbei", (page) => openTermin(page, "Bäcker 9 Uhr")],
  ["mikro-fragen", (page) => micTap(page)],
  ["mikro-hilfe", async (page) => (await micTap(page), await page.getByRole("button", { name: "Okay, frag mich" }).click())],
  [
    "mikro-zeigen",
    async (page) => {
      await micTap(page);
      await page.getByRole("button", { name: "Okay, frag mich" }).click();
      await page.getByRole("button", { name: "Zeig’s mir" }).click();
      await page.getByRole("button", { name: "Weiter" }).click();
    },
  ],
];

const dir = process.argv.includes("--basis") ? ".bilder/basis" : ".bilder/aktuell";
mkdirSync(dir, { recursive: true });
const stop = await startServer();
const browser = await launch();
let n = 0;
for (const device of DEVICES) {
  for (const dark of [false, true]) {
    const tag = `${device.replace(/ /g, "")}-${dark ? "dunkel" : "hell"}`;
    // Hallo und Beispiel-Tag (erster Start)
    const first = await newPage(browser, device, { dark });
    await first.goto(BASE);
    await first.waitForTimeout(1200);
    await first.screenshot({ path: `${dir}/hallo-${tag}.png` });
    await hello(first);
    await settle(first);
    await first.screenshot({ path: `${dir}/beispieltag-${tag}.png`, fullPage: true });
    await first.context().close();
    // Eigene Familie
    const page = await newPage(browser, device, { dark });
    await hello(page);
    await seedFamily(page, RECIPE_DATA);
    if (dark) await setDark(page);
    for (const [name, path] of PAGES) {
      await page.goto(BASE + path);
      await page.waitForTimeout(900);
      await settle(page);
      // Versionszeile maskieren – sie ändert sich mit jeder Auslieferung
      await page.screenshot({ path: `${dir}/${name}-${tag}.png`, fullPage: true, mask: [page.getByText(/^Version \d/)] });
      n++;
    }
    await page.context().close();
    // Fenster, die nur nach einer Handlung erscheinen (Szenen)
    for (const [name, run] of SCENES) {
      const sp = await newPage(browser, device, { dark });
      await sp.addInitScript(FAKE_MIC);
      await sp.addInitScript(FAKE_VOICES);
      await hello(sp);
      await seedFamily(sp, RECIPE_DATA);
      if (dark) await setDark(sp);
      await sp.reload();
      await sp.waitForTimeout(900);
      await run(sp);
      await sp.waitForTimeout(700);
      await sp.screenshot({ path: `${dir}/${name}-${tag}.png` });
      n++;
      await sp.context().close();
    }
  }
}
await browser.close();
stop();
console.log(`${n + DEVICES.length * 4} Bilder in ${dir}`);
