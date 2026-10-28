// Essen – die nächsten 7 Tage (Tafel 97): von der Essen-Kachel „Wochenplan“ (Tafel 122),
// immer ab heute (Mi 21.10.) über die Wochengrenze, jeder Tag öffnet sein
// Fenster (Gericht: „Rezept ansehen“, frei: Ideen), Liste/Reihe gemerkt,
// Halten & ziehen tauscht zwei Tage mit „Rückgängig“.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const PLAN = { version: 3, weeks: { "2026-10-19": { Mittwoch: { kind: "text", title: "Spaghetti Bolognese", category: "fleisch" }, Donnerstag: { kind: "text", title: "Kartoffelsuppe", category: "vegetarisch" } } } };

/** Halten (Touch über CDP), dann nach unten ziehen und loslassen */
async function haltenZiehen(page, from, to) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const p = (x, y) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  const x = a.x + a.width / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: p(x, a.y + a.height / 2) });
  await new Promise((r) => setTimeout(r, 550));
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: p(x, a.y + a.height / 2 + ((b.y - a.y) * i) / 8) });
    await new Promise((r) => setTimeout(r, 40));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export const wochenkarte = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.wochenplan": PLAN });
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  const link = page.locator("[data-woche]").first();
  check(await link.isVisible(), "Essen-Kachel: „Wochenplan“ bzw. „Woche“");
  await link.tap();
  await page.waitForTimeout(1200);
  const karte = page.locator("[role=tabpanel]:not([inert]) [data-wochenkarte]");
  check(await karte.isVisible(), "Woche führt zu „Die nächsten 7 Tage“");
  const zeilen = karte.locator("[data-sieben-liste] > li");
  check((await zeilen.count()) === 7, "7 Tage");
  check((await zeilen.first().innerText()).includes("Heute · Mi 21."), "beginnt heute");
  check((await zeilen.last().innerText()).includes("Di 27."), "über die Wochengrenze bis Dienstag");
  check(await karte.getByText("Halten & ziehen, um Tage zu tauschen.").isVisible(), "einmal „Halten & ziehen“");

  // Jeder Tag öffnet sein Fenster
  await zeilen.first().getByRole("button").tap();
  const fenster = page.getByRole("dialog", { name: "Heute · Mi 21." });
  check(await fenster.waitFor({ timeout: 4000 }).then(() => true, () => false), "Tag öffnet sein Fenster");
  check(await fenster.getByRole("heading", { name: "Spaghetti Bolognese" }).isVisible(), "großer Name");
  check(await fenster.getByRole("link", { name: "Rezept ansehen" }).isVisible(), "jedes Gericht hat ein Rezept");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  await zeilen.nth(3).getByRole("button").tap();
  const frei = page.getByRole("dialog", { name: "Sa 24." });
  check(await frei.waitFor({ timeout: 4000 }).then(() => true, () => false), "freier Tag öffnet auch");
  check(await frei.getByRole("heading", { name: "Noch frei" }).isVisible(), "„Noch frei“");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  // Halten & ziehen: Mi ↔ Do
  await haltenZiehen(page, zeilen.nth(0), zeilen.nth(1));
  await page.waitForTimeout(700);
  const plan = await store(page, "wasgibts.wochenplan");
  check(plan?.weeks?.["2026-10-19"]?.Mittwoch?.title === "Kartoffelsuppe" && plan?.weeks?.["2026-10-19"]?.Donnerstag?.title === "Spaghetti Bolognese", "Ziehen tauscht zwei Tage");
  const rueck = page.getByRole("button", { name: "Rückgängig" });
  check(await rueck.isVisible(), "mit „Rückgängig“");
  await rueck.tap();
  await page.waitForTimeout(500);
  check((await store(page, "wasgibts.wochenplan"))?.weeks?.["2026-10-19"]?.Mittwoch?.title === "Spaghetti Bolognese", "Rückgängig stellt zurück");

  // Reihe: gemerkt über das Neuladen
  await karte.getByRole("radio", { name: "Reihe" }).tap();
  await page.waitForTimeout(400);
  check((await karte.locator("button[data-tag]").count()) === 7, "Reihe: 7 runde Tage");
  await page.reload();
  await page.waitForTimeout(1500);
  check((await page.locator("[role=tabpanel]:not([inert]) [data-wochenkarte] [role=radio][aria-checked=true]").getAttribute("aria-label")) === "Reihe", "Ansicht gemerkt");
};
