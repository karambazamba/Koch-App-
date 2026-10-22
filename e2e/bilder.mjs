// npm run bilder – Bildschirmfotos aller Hauptseiten (iPhone SE, iPhone 15
// Pro, Pixel 7 · hell und dunkel · feste Zeit, fester Zufall, Testmodi) nach
// .bilder/aktuell; mit `-- --basis` nach .bilder/basis (Ausgangslage).
// npm run bilder:vergleich – vergleicht aktuell mit basis (Abweichung > 0,1 %
// wird gemeldet, Unterschiedsbild in .bilder/unterschied).
import { mkdirSync } from "node:fs";
import { BASE, DEVICES, FAKE_MIC, hello, launch, newPage, seedFamily, setDark, startServer } from "./lib.mjs";
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
const SCENES = [
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
