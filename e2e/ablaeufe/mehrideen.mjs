// Mehr Ideen unter einem Rezept: wischbare Reihe mit 8 Karten, endlos (nach
// der 8. wieder die 1.), Wischen wechselt nie die Seite, Antippen → Rezept.
import { BASE, hello, seedFamily, swipe } from "../lib.mjs";

export const mehrIdeen = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/kochbuch/rezept?id=k:shakshuka");
  await page.waitForTimeout(1200);
  const section = page.getByRole("region", { name: "Mehr Ideen" });
  await section.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const list = section.getByRole("list");
  const cards = list.locator("li:not([aria-hidden])");
  check((await cards.count()) === 8, `8 Ideen für Screenreader (${await cards.count()})`);
  check(!(await cards.getByText("Shakshuka", { exact: true }).count()), "nicht das aktuelle Rezept");
  check((await list.getByText("Besonders").count()) > 0, "Etikett „Besonders“");
  const width = await list.evaluate((el) => el.clientWidth);
  const cardWidth = await cards.first().evaluate((el) => el.getBoundingClientRect().width);
  check(Math.abs(width / cardWidth - 2.6) < 0.3, `2,5 Karten sichtbar (${(width / cardWidth).toFixed(2)})`);

  // Weit nach links wischen – über die 8. Karte hinaus
  const box = await list.boundingBox();
  const url = page.url();
  for (let i = 0; i < 7; i++) {
    await swipe(page, { x: box.x + box.width * 0.85, y: box.y + box.height / 2, dx: -box.width * 0.7, ms: 220 });
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(1200);
  const state = await list.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth, set: el.children[8].offsetLeft - el.children[0].offsetLeft }));
  check(state.left < state.max - 10 && state.left >= state.set * 0.5 - 2 && state.left < state.set * 1.5 + 2, `endlos: wieder in der Mitte (${Math.round(state.left)} von ${Math.round(state.max)})`);
  check(page.url() === url, "Seite wechselt beim Wischen nicht");
  // Zurück nach rechts geht auch
  for (let i = 0; i < 4; i++) {
    await swipe(page, { x: box.x + box.width * 0.15, y: box.y + box.height / 2, dx: box.width * 0.7, ms: 220 });
    await page.waitForTimeout(450);
  }
  const back = await list.evaluate((el) => el.scrollLeft);
  check(back > 10, "auch nach rechts endlos");

  // Antippen → Rezept
  const visible = list.locator("li:not([aria-hidden]) a").first();
  const title = (await visible.locator("span.line-clamp-2").textContent())?.trim();
  await list.evaluate((el) => {
    el.scrollLeft = el.children[8].offsetLeft - el.children[0].offsetLeft;
  });
  await page.waitForTimeout(300);
  await visible.click();
  await page.waitForTimeout(900);
  check(page.url() !== url && page.url().includes("/kochbuch/rezept"), "Karte antippen → Rezept");
  check(await page.getByRole("heading", { level: 1 }).textContent().then((t) => Boolean(title && t?.includes(title.slice(0, 8)))), `Rezept „${title}“ offen`);
};
