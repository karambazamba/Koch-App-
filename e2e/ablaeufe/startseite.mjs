// Startseite – Feinschliff nach dem Handy-Test: Termine und Aufgaben als
// ruhige Liste (30-px-Zeilen, ganze Zeile tippbar), auf dem iPhone 15 Pro
// alles Wichtige ohne Scrollen, der Mia-Knopf verdeckt auf keiner Seite den
// letzten Inhalt, und die Kochmütze zeigt sich schon am Beispiel-Tag (ohne
// Sprechblase) – ein echter Tag 1 bleibt ohne Mütze.
import { BASE, hello, seedFamily } from "../lib.mjs";

const hat = (page) => page.getByRole("button", { name: /^Kochtipp – spontan mit/ });

export const startseiteListe = async (page, check, device) => {
  await hello(page);
  // Beispiel-Tag: Termine- und Aufgaben-Zeilen 30 px, Kopf gleich hoch
  const rows = await page.evaluate(() =>
    ["termine", "aufgaben"].map((id) => {
      const tile = document.querySelector(`[data-tile~="${id}"]`);
      const lis = [...(tile?.querySelectorAll("li") ?? [])].map((li) => Math.round(li.getBoundingClientRect().height));
      return { id, lis };
    }),
  );
  for (const r of rows) check(r.lis.length > 0 && r.lis.every((h) => h >= 29 && h <= 32), `${r.id}: Zeilen 30 px (${r.lis.join(", ")})`);

  if (device === "iPhone 15 Pro") {
    // Als App vom Home-Bildschirm (ohne Safari-Leisten): ganze Höhe des iPhone 15 Pro
    await page.setViewportSize({ width: 393, height: 852 });
    await page.waitForTimeout(500);
    const seen = await page.evaluate(() => {
      const box = (id) => document.querySelector(`[data-tile~="${id}"]`)?.getBoundingClientRect();
      const whole = ["pinnwand", "wetter", "termine", "aufgaben"].filter((id) => !box(id) || box(id).bottom > innerHeight);
      // Essen + Einkauf: Kopf und erste Zeile sichtbar
      const pair = box("essen");
      return { whole, pair: Boolean(pair && pair.top + 48 <= innerHeight) };
    });
    check(!seen.whole.length && seen.pair, `iPhone 15 Pro (App): Pinnwand, Wetter, Termine, Aufgaben ganz, Essen + Einkauf angeschnitten ohne Scrollen${seen.whole.length ? ` (unten: ${seen.whole.join(", ")})` : ""}`);
  }
};

export const miaKnopfFrei = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  const covered = [];
  for (const path of ["/", "/?seite=kalender", "/?seite=essen", "/einkaufsliste", "/pinnwand", "/aufgaben", "/notizen", "/kochbuch", "/spendentopf", "/wetter", "/profil", "/profil/kuechenhelfer"]) {
    await page.goto(BASE + path);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
    const hit = await page.evaluate(() => {
      const btn = document.querySelector("[data-begleitung-leiste] button");
      if (!btn) return null;
      const b = btn.getBoundingClientRect();
      const el = [...document.querySelectorAll("main button, main a, main p, main h2, main h3, main li, main img, main input, main span")].find((el) => {
        const r = el.getBoundingClientRect();
        if (r.height < 4 || getComputedStyle(el).visibility === "hidden" || el.closest("[role=dialog],[aria-hidden=true],.sr-only")) return false;
        for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return false;
        return r.right > b.left && r.left < b.right && r.bottom > b.top + 2 && r.top < b.bottom;
      });
      return el ? (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30) : null;
    });
    if (hit) covered.push(`${path}: „${hit}“`);
  }
  check(!covered.length, `Mia-Knopf verdeckt nichts${covered.length ? ` – ${covered.join(" · ")}` : ""}`);
};

export const muetzeBeispielTag = async (page, check) => {
  await hello(page);
  await page.locator('[data-tile~="essen"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
  check(await hat(page).isVisible(), "Beispiel-Tag: Mütze in der Essen-Kachel");
  check(!(await page.getByText("Tipp auf die Mütze", { exact: false }).count()), "Beispiel-Tag: ohne Sprechblase");
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.kochtipp") ?? "null"));
  check(!state?.popped && !state?.unlocked, "„ab Tag 3“ bleibt (nicht freigeschaltet)");
  // Echter Tag 1 (eigene Daten statt Beispiel-Tag): keine Mütze
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  check(!(await hat(page).count()), "echtes Profil an Tag 1: keine Mütze");
};
