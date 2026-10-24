// Wischen Kalender · Heute · Essen ohne Wackeln (Video Felix, iPhone Safari):
// Ein schräger Wisch (120 px waagerecht, 40 px senkrecht) wechselt die Seite,
// und die Seite steht dabei senkrecht still (Kopfzeile bewegt sich um 0 px).
// Ein senkrechter Wisch scrollt nur – kein Seitenwechsel.
import { BASE, hello, seedFamily } from "../lib.mjs";

const selected = (page) => page.getByRole("tab", { selected: true }).innerText();
const headerTop = (page) => page.evaluate(() => Math.round(document.querySelector("main")?.getBoundingClientRect().top ?? NaN));

/** Touch-Geste in Schritten; misst in der Mitte, ob sich die Seite senkrecht bewegt */
async function geste(page, { x, y, dx, dy, steps = 12, ms = 300 }) {
  const cdp = await page.context().newCDPSession(page);
  const point = (px, py) => [{ x: Math.round(px), y: Math.round(py), id: 1 }];
  const before = { top: await headerTop(page), scroll: await page.evaluate(() => window.scrollY) };
  let mid = before;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x, y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x + (dx * i) / steps, y + (dy * i) / steps) });
    await new Promise((r) => setTimeout(r, ms / steps));
    if (i === Math.round(steps * 0.75)) mid = { top: await headerTop(page), scroll: await page.evaluate(() => window.scrollY) };
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  return { before, mid };
}

export const wischenOhneWackeln = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const vp = page.viewportSize();
  check((await page.evaluate(() => getComputedStyle(document.querySelector("main")).touchAction)).includes("pan-y"), "Pager: touch-action pan-y");
  check((await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)) === "none", "html: kein Gummiband (overscroll-behavior-y: none)");

  // Senkrechter Wisch → scrollt, kein Seitenwechsel
  const tab0 = await selected(page);
  const hoch = await geste(page, { x: vp.width * 0.5, y: vp.height * 0.7, dx: 4, dy: -220 });
  await page.waitForTimeout(600);
  const scrolled = await page.evaluate(() => window.scrollY);
  check(scrolled > hoch.before.scroll, `senkrechter Wisch scrollt (${hoch.before.scroll} → ${scrolled})`);
  check((await selected(page)) === tab0, "senkrechter Wisch: kein Seitenwechsel");

  // Schräger Wisch 120/40 → Seitenwechsel, senkrecht 0 px Bewegung
  const quer = await geste(page, { x: vp.width * 0.75, y: vp.height * 0.55, dx: -120, dy: 40 });
  check(quer.mid.scroll === quer.before.scroll && quer.mid.top === quer.before.top, `schräger Wisch: Seite steht senkrecht still (Kopf ${quer.before.top} → ${quer.mid.top}, Scroll ${quer.before.scroll} → ${quer.mid.scroll})`);
  await page.waitForTimeout(800);
  check((await selected(page)) === "Essen", `schräger Wisch wechselt zu Essen (${await selected(page)})`);
  check((await page.evaluate(() => document.documentElement.style.overflow)) === "", "nach dem Loslassen wieder frei scrollbar");

  // Zurück: schräg nach rechts oben → Heute
  await geste(page, { x: vp.width * 0.25, y: vp.height * 0.55, dx: 120, dy: -40 });
  await page.waitForTimeout(800);
  check(/Heute|Startseite/.test(await selected(page)), "zurückwischen zu Heute");
};
