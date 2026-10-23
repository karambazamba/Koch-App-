// Startseite – Feinschliff nach dem Handy-Test: Termine und Aufgaben als
// ruhige Liste (30-px-Zeilen, ganze Zeile tippbar), auf dem iPhone 15 Pro
// alles Wichtige ohne Scrollen, der Mia-Knopf verdeckt auf keiner Seite den
// letzten Inhalt, und die Kochmütze zeigt sich schon am Beispiel-Tag (ohne
// Sprechblase) – ein echter Tag 1 bleibt ohne Mütze.
import { BASE, hello, seedFamily, swipe } from "../lib.mjs";
import { RECIPE_DATA } from "./essen.mjs";

const hat = (page) => page.getByRole("button", { name: /^(Was anderes kochen\?|Kochidee –)/ });

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
  check(await hat(page).isVisible(), "Beispiel-Tag: Kochidee-Knopf in der Essen-Kachel");
  check(!(await page.getByText("Neu: Kochidee").count()), "Beispiel-Tag: ohne Blase");
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.kochtipp") ?? "null"));
  check(!state?.popped && !state?.unlocked, "„ab Tag 3“ bleibt (nicht freigeschaltet)");
  // Echter Tag 1 (eigene Daten statt Beispiel-Tag): kein Knopf
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  check(!(await hat(page).count()), "echtes Profil an Tag 1: kein Kochidee-Knopf");
};

/**
 * Weniger Mia + „Dein Tag“ (Tafel 66 B, 67, 68): auf der Startseite genau EIN
 * Mia-Gesicht (der Knopf), die Jetzt-Karte trägt ein Themen-Symbol und keinen
 * Knopf; wischen 1 → 3 und nicht weiter; Antippen öffnet „Dein Tag“ mit dem
 * Thema hervorgehoben („Versichertenkarte einpacken?“ am Zahnarzt), dort
 * „Erledigt“ → heute weg; „Kochen“ öffnet den Kochmodus; beim Runterscrollen
 * macht der Mia-Knopf Platz und kommt nach kurzer Ruhe zurück.
 */
export const jetztKarte = async (page, check) => {
  await hello(page);
  const plan = { version: 3, weeks: { "2026-10-19": { Mittwoch: { kind: "recipe", recipeId: "sp", title: "Spaghetti Bolognese", category: "fleisch" } } } };
  await seedFamily(page, { ...RECIPE_DATA, "wasgibts.wochenplan": plan });
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("wasgibts.eintraege"));
    raw.entries = raw.entries.map((e) => (e.id === "t1" ? { ...e, data: { ...e.data, note: "Versichertenkarte einpacken" } } : e.id === "t2" ? { ...e, data: { ...e.data, note: "Zettel unterschreiben" } } : e));
    localStorage.setItem("wasgibts.eintraege", JSON.stringify(raw));
    // Elternabend mit Notiz = zweites Thema; neu von Oma steht in „Dein Tag“ unter Pinnwand
    const pin = JSON.parse(localStorage.getItem("wasgibts.pinnwand"));
    const m = pin.messages[0];
    pin.messages = [{ ...m, id: "pin2", erstellt: "2026-10-21T07:30:00.000Z", geaendert: "2026-10-21T07:30:00.000Z", data: { ...m.data, text: "Bin um 18 Uhr da", author: "Oma", readBy: [] } }];
    localStorage.setItem("wasgibts.pinnwand", JSON.stringify(pin));
  });
  await page.reload();
  const card = page.locator("[data-jetzt]");
  await card.waitFor({ timeout: 5000 });
  await page.waitForTimeout(1500);
  check((await page.locator("main .begleitung-avatar, [data-begleitung-leiste] .begleitung-avatar").count()) === 1, "Startseite: genau ein Mia-Gesicht (der Knopf)");
  check((await card.locator("[data-thema]").count()) === 1 && !(await card.locator(".begleitung-avatar").count()), "Jetzt-Karte: Themen-Symbol statt Gesicht");
  check((await card.getByRole("button").count()) === 1, "Jetzt-Karte: kein eigener Knopf (nur die Karte)");

  // Wischen 1 → 3 und nicht weiter
  const box = await card.boundingBox();
  const dots = card.locator("span.bg-current");
  const n = await dots.count();
  check(n >= 2 && n <= 3, `2–3 Themen (${n})`);
  const activeIndex = () => dots.evaluateAll((els) => els.findIndex((e) => e.className.includes("w-3.5")));
  for (let k = 0; k < n + 1; k++) {
    await swipe(page, { x: box.x + box.width * 0.8, y: box.y + box.height / 2, dx: -box.width * 0.6 });
    await page.waitForTimeout(450);
  }
  check((await activeIndex()) === n - 1, `nach ${n + 1}× Wischen beim letzten Thema (kein Kreisel)`);
  for (let k = 0; k < n; k++) {
    await swipe(page, { x: box.x + box.width * 0.2, y: box.y + box.height / 2, dx: box.width * 0.6 });
    await page.waitForTimeout(450);
  }
  check((await activeIndex()) === 0, "zurückwischen bis Thema 1");
  // Zum Thema „Versichertenkarte einpacken?“ wischen
  for (let k = 0; k < n && !/Versichertenkarte einpacken\?/.test(await card.innerText()); k++) {
    await swipe(page, { x: box.x + box.width * 0.8, y: box.y + box.height / 2, dx: -box.width * 0.6 });
    await page.waitForTimeout(600);
  }
  const text = await card.innerText();
  check(/Versichertenkarte einpacken\?/.test(text), `Thema Vorbereiten (${text.replace(/\s+/g, " ").slice(0, 60)})`);
  await page.waitForTimeout(450);

  // Antippen → „Dein Tag“ mit dem Thema hervorgehoben
  await card.getByRole("button").click();
  const sheet = page.getByRole("dialog", { name: "Dein Tag" });
  await sheet.waitFor({ timeout: 4000 });
  check(await sheet.getByRole("heading", { name: "Dein Tag" }).isVisible(), "„Dein Tag“ offen");
  const order = await sheet.locator("[data-abschnitt]").evaluateAll((els) => els.map((e) => e.getAttribute("data-abschnitt")));
  check(order.join(",") === "termine,essen,pinnwand,aufgaben", `Abschnitte in Reihenfolge (${order.join(",")})`);
  const marked = sheet.locator("li[data-key^='t1@'] > div.ring-1");
  check(await marked.isVisible(), "Zahnarzt hervorgehoben");
  check(await marked.getByText("Versichertenkarte einpacken?").isVisible(), "mit dem Hinweis der Karte");
  check(await sheet.getByText(/^Jetzt · 10:30$/).isVisible(), "„Jetzt“-Linie");
  await marked.getByRole("button", { name: "Erledigt" }).click();
  await sheet.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(!(await card.innerText()).includes("Versichertenkarte"), "„Erledigt“ → Thema heute weg");
  await page.reload();
  await card.waitFor({ timeout: 5000 });
  await page.waitForTimeout(1200);
  check(!/Versichertenkarte/.test(await card.innerText()), "erledigt bleibt heute weg");

  // „Kochen“ → Kochmodus
  await card.getByRole("button").click();
  await sheet.waitFor({ timeout: 4000 });
  await sheet.getByRole("link", { name: "Kochen" }).click();
  await page.waitForURL(/\/kochbuch\/kochen\?id=sp/, { timeout: 5000 }).catch(() => {});
  check(/\/kochbuch\/kochen\?id=sp/.test(page.url()), "„Kochen“ öffnet den Kochmodus");

  // Mia-Knopf macht beim Runterscrollen Platz und kommt zurück
  await page.goto(BASE);
  await card.waitFor({ timeout: 5000 });
  await page.waitForTimeout(800);
  const knopf = page.locator("[data-begleitung-leiste] > div");
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(120);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(150);
  check((await knopf.getAttribute("data-weg")) === "true", "runterscrollen: Mia-Knopf macht Platz");
  await page.waitForTimeout(1600);
  check((await knopf.getAttribute("data-weg")) === null, "nach kurzer Ruhe wieder da");
};

/**
 * Hallo-Bildschirm: nach 2 s springt Mia einmal vor Freude und sagt „Ich bin
 * bereit!“ (Sprechblase ganz im Bild – auch auf dem iPhone SE); Antippen →
 * „Hihi, kitzelig!“ (im Sprung erst danach); unten „Gemacht in Eutin · von
 * KARAMBA Eis“.
 */
export const halloSprung = async (page, check, device) => {
  // Bewegung reduzieren: kein Sprung, nur die Sprechblase
  await page.goto(BASE);
  await page.locator('[data-hello="laeuft"]').waitFor({ timeout: 8000 });
  await page.getByText("Ich bin bereit!").waitFor({ timeout: 4000 }).catch(() => {});
  check(await page.getByText("Ich bin bereit!").isVisible(), "Bewegung reduzieren: Sprechblase kommt");
  check((await page.locator('.hello-jump[data-sprung="an"]').count()) === 0, "Bewegung reduzieren: kein Sprung");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const sizes = [null, { width: 320, height: 568 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await page.goto(BASE);
    await page.locator('[data-hello="laeuft"]').waitFor({ timeout: 8000 });
    const where = size ? "iPhone SE" : device;
    check(await page.locator(".hello-jump[data-sprung]").count() === 0, `${where}: vor 2 s noch kein Sprung`);
    await page.waitForTimeout(2300);
    check((await page.locator('.hello-jump[data-sprung="an"]').count()) === 1, `${where}: Sprung läuft`);
    const bubble = page.getByText("Ich bin bereit!");
    await bubble.waitFor({ timeout: 2500 });
    const box = await bubble.boundingBox();
    const vw = page.viewportSize().width;
    check(Boolean(box && box.x >= 0 && box.x + box.width <= vw && box.y >= 0), `${where}: „Ich bin bereit!“ ganz im Bild (${box ? `${Math.round(box.x)}–${Math.round(box.x + box.width)} von ${vw}` : "fehlt"})`);
    check(await page.getByText("Gemacht in Eutin · von KARAMBA Eis").isVisible(), `${where}: unten „Gemacht in Eutin · von KARAMBA Eis“`);
    // Antippen während des Sprungs: erst danach kitzelig
    await page.locator("[data-hello]").click({ force: true });
    check(!(await page.getByText("Hihi, kitzelig!").count()), `${where}: im Sprung noch nicht`);
    await page.getByText("Hihi, kitzelig!").waitFor({ timeout: 3500 }).catch(() => {});
    check(await page.getByText("Hihi, kitzelig!").isVisible(), `${where}: danach „Hihi, kitzelig!“`);
    check((await page.locator('.hello-jump[data-kitzel="an"]').count()) === 1, `${where}: wackelt kitzelig`);
  }
};
