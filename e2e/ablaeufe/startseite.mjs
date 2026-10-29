// Startseite – Feinschliff nach dem Handy-Test: Termine und Aufgaben als
// ruhige Liste (30-px-Zeilen, ganze Zeile tippbar), auf dem iPhone 15 Pro
// alles Wichtige ohne Scrollen, der Mia-Knopf verdeckt auf keiner Seite den
// letzten Inhalt, und die Kochmütze zeigt sich schon am Beispiel-Tag (ohne
// Sprechblase) – ein echter Tag 1 bleibt ohne Mütze.
import { BASE, hello, newPage, seedFamily, swipe } from "../lib.mjs";
import { abgeschnitteneTexte } from "../regeln.mjs";
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
      const btn = document.querySelector("[data-leiste-flaeche]");
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

/** Familie mit Notiz am Zahnarzt (16:15, mit Ort) und Omas Geburtstag heute (ganztägig) – ohne die Einträge `weg`; Uhr auf `iso`, neu geladen */
async function jetztFamilie(page, iso, weg = [], { mitPlan = true, lang = false } = {}) {
  const plan = { version: 3, weeks: mitPlan ? { "2026-10-19": { Mittwoch: { kind: "recipe", recipeId: "sp", title: "Spaghetti Bolognese", category: "fleisch" } } } : {} };
  await seedFamily(page, { ...RECIPE_DATA, "wasgibts.wochenplan": plan });
  await page.evaluate(({ weg, lang }) => {
    const raw = JSON.parse(localStorage.getItem("wasgibts.eintraege"));
    raw.entries = raw.entries.map((e) => (e.id === "t1" ? { ...e, data: { ...e.data, note: "Versichertenkarte einpacken", ...(lang ? { title: "Zahnarzt Dr. Berg-Hinrichsen mit Jonne und Mathis" } : {}) } } : e));
    const t1 = raw.entries.find((e) => e.id === "t1");
    raw.entries.push({ ...t1, id: "t9", data: { title: lang ? "Geburtstag Annemarie-Luise von Petersen" : "Omas Geburtstag", date: "2026-10-21", reminder: "aus", doneDates: [], skipDates: [] } });
    raw.entries = raw.entries.filter((e) => !weg.includes(e.id));
    localStorage.setItem("wasgibts.eintraege", JSON.stringify(raw));
  }, { weg, lang });
  await page.clock.setFixedTime(new Date(`${iso}:00+02:00`));
  await page.reload();
  await page.waitForTimeout(1800);
}

/** Kein Text der Jetzt-Karte endet auf „…“ oder wird weggeschnitten */
async function jetztGanz(page, check, wo) {
  const funde = await page.evaluate(abgeschnitteneTexte, "[data-jetzt]");
  check(!funde.length, `${wo}: Jetzt-Karte ganz lesbar${funde.length ? ` – ${funde.join(" · ")}` : ""}`);
}

/**
 * Jetzt-Karte nur mit Nutzen für heute (A-054, vorher Tafel 66 B/67/68): ohne
 * Thema ist sie ganz weg; „Gleich 16:15 Zahnarzt.“ · „Versichertenkarte
 * einpacken?“ mit Uhr-Symbol, genau ein Mia-Gesicht (der Knopf), wischen 1 → 2
 * und nicht weiter, Antippen öffnet „Dein Tag“ mit dem Thema hervorgehoben,
 * dort „Erledigt“ → heute weg, „Kochen“ → Kochmodus. Freitag 13 Uhr
 * „Wochenende planen?“ mit Chips, „Später“ = heute weg; 20:30 keine. Nie „…“
 * (iPhone SE, 15 Pro, Pixel 7).
 */
export const jetztKarte = async (page, check, device) => {
  await hello(page);
  const card = page.locator("[data-jetzt]");
  // 10:30 ohne Termine heute (im Testmodus regnet es ab 15 Uhr – ohne Plan ändert das nichts) → keine Karte, kein Platzhalter
  // Essen mit Folge: „Spaghetti Bolognese heute Abend.“ + Knopf „Auf die Liste: …“ setzt still drauf, Thema weg
  await jetztFamilie(page, "2026-10-21T10:30", ["t1", "t2", "t9"]);
  const knopf = card.locator("[data-aktion=liste]");
  check((await card.getAttribute("data-jetzt")) === "essen" && /^Auf die Liste: /.test(((await knopf.innerText().catch(() => "")) ?? "").trim()), "Essen mit Folge: Knopf „Auf die Liste: …“");
  await jetztGanz(page, check, `${device} Essen`);
  await knopf.click();
  await page.waitForTimeout(900);
  const drauf = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("wasgibts.einkaufsliste") ?? "null")));
  check(/Spaghetti|Hackfleisch/.test(drauf ?? "") && !(await card.count()), "„Auf die Liste“: Zutaten stehen drauf, Thema heute weg");
  await jetztFamilie(page, "2026-10-21T10:30", ["t1", "t2", "t9"], { mitPlan: false });
  const leer = await card.evaluateAll((els) => els.map((e) => `${e.getAttribute("data-jetzt")}: ${e.innerText.replace(/\s+/g, " ")}`));
  check(!leer.length, `10:30 ohne Thema: Jetzt-Karte ganz weg${leer.length ? ` (${leer.join(" · ")})` : ""}`);

  await jetztFamilie(page, "2026-10-21T15:40");
  await card.waitFor({ timeout: 5000 });
  check((await page.locator("main .begleitung-avatar, [data-begleitung-leiste] .begleitung-avatar").count()) === 1, "Startseite: genau ein Mia-Gesicht (der Knopf)");
  check((await card.getAttribute("data-jetzt")) === "gleich" && (await card.locator('[data-thema="Clock"]').count()) === 1, "Gleich-Hinweis zuerst, mit Uhr-Symbol");
  const text = (await card.innerText()).replace(/\s+/g, " ");
  check(/Gleich 16:15 Zahnarzt\. Versichertenkarte einpacken\?/.test(text), `„Gleich 16:15 Zahnarzt.“ · „Versichertenkarte einpacken?“ (${text.slice(0, 70)})`);
  check((await card.getByRole("button").count()) === 1, "Jetzt-Karte: kein eigener Knopf (nur die Karte)");
  check(!(await card.locator("text=Alles ruhig").count()), "kein „Alles ruhig“");
  await jetztGanz(page, check, `${device} 15:40`);

  // Wischen 1 → 2 und nicht weiter (2. Thema: Regen ab 16 Uhr zum Zahnarzt bzw. Omas Geburtstag)
  const box = await card.boundingBox();
  const dots = card.locator("span.bg-current");
  check((await dots.count()) === 2, `2 Themen (${await dots.count()})`);
  const activeIndex = () => dots.evaluateAll((els) => els.findIndex((e) => e.className.includes("w-3.5")));
  for (let k = 0; k < 3; k++) {
    await swipe(page, { x: box.x + box.width * 0.8, y: box.y + box.height / 2, dx: -box.width * 0.6 });
    await page.waitForTimeout(450);
  }
  check((await activeIndex()) === 1 && !/Gleich 16:15/.test(await card.innerText()), `nach 3× Wischen beim 2. Thema, kein Kreisel (${(await card.innerText()).replace(/\s+/g, " ").slice(0, 50)})`);
  await jetztGanz(page, check, `${device} Thema 2`);
  await swipe(page, { x: box.x + box.width * 0.2, y: box.y + box.height / 2, dx: box.width * 0.6 });
  await page.waitForTimeout(600);
  check((await activeIndex()) === 0, "zurückwischen bis Thema 1");

  // Antippen → „Dein Tag“ mit dem Thema hervorgehoben
  await card.getByRole("button").first().click();
  const sheet = page.getByRole("dialog", { name: "Dein Tag" });
  await sheet.waitFor({ timeout: 4000 });
  check(await sheet.getByRole("heading", { name: "Dein Tag" }).isVisible(), "„Dein Tag“ offen");
  const marked = sheet.locator("li[data-key^='t1@'] > div.ring-1");
  check(await marked.isVisible(), "Zahnarzt hervorgehoben");
  check(await marked.getByText("Versichertenkarte einpacken?").isVisible(), "mit dem Hinweis der Karte");
  await marked.getByRole("button", { name: "Erledigt" }).click();
  await sheet.waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(!(await card.count()) || !(await card.first().innerText()).includes("Gleich 16:15"), "„Erledigt“ → Thema heute weg");
  await page.reload();
  await page.waitForTimeout(1500);
  check(!(await card.count()) || !/Gleich 16:15/.test(await card.first().innerText()), "erledigt bleibt heute weg");

  // „Kochen“ → Kochmodus (über „Dein Tag“, jetzt vom Geburtstag aus)
  await card.getByRole("button").first().click();
  await sheet.waitFor({ timeout: 4000 });
  await sheet.getByRole("link", { name: "Kochen" }).click();
  await page.waitForURL(/\/kochbuch\/kochen\?id=sp/, { timeout: 5000 }).catch(() => {});
  check(/\/kochbuch\/kochen\?id=sp/.test(page.url()), "„Kochen“ öffnet den Kochmodus");

  // Leiste bleibt beim Scrollen (kein Wegschieben mehr)
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  check((await page.locator("[data-leiste]").getAttribute("data-weg")) === null, "runterscrollen: Leiste bleibt");

  // Freitag 13 Uhr: „Wochenende planen?“ mit Vorschlägen, „Mit Mia planen“, „Später“ (ohne Fußball um 17 Uhr – Regen dazu ginge vor)
  await jetztFamilie(page, "2026-10-23T13:00", ["t3"]);
  const wo = page.locator('[data-jetzt="wochenende"]');
  await wo.waitFor({ timeout: 5000 }).catch(() => {});
  check(await wo.isVisible(), "Freitag 13 Uhr: Wochenende-Karte");
  check((await wo.getByText("Wochenende planen?").count()) === 1 && (await wo.locator("[data-chip]").count()) >= 1, "„Wochenende planen?“ mit Vorschlägen aus den eigenen Daten");
  check(await wo.getByRole("button", { name: /^Mit .+ planen$/ }).isVisible(), "Knopf „Mit Mia planen“");
  await jetztGanz(page, check, `${device} Freitag`);
  await wo.getByRole("button", { name: "Später" }).click();
  await page.waitForTimeout(800);
  check(!(await wo.count()), "„Später“ = für heute weg");
  await page.reload();
  await page.waitForTimeout(1500);
  check(!(await wo.count()), "„Später“ bleibt heute gemerkt");
  await page.clock.setFixedTime(new Date("2026-10-23T20:30:00+02:00"));
  await page.evaluate(() => localStorage.removeItem("wasgibts.jetzt"));
  await page.reload();
  await page.waitForTimeout(1500);
  check(!(await wo.count()), "Freitag 20:30: keine Wochenende-Karte");

  // iPhone SE (320 px) einmal mit – im Lauf des 15 Pro: Gleich-Hinweis und Wochenende ganz lesbar
  if (device !== "iPhone 15 Pro") return;
  const se = await newPage(page.context().browser(), "iPhone SE");
  try {
    await hello(se);
    // Lange Namen (Felix: nie „…“, lieber umbrechen): Termin und Geburtstag, beide Themen durchwischen
    await jetztFamilie(se, "2026-10-21T15:40", [], { lang: true });
    const seKarte = se.locator("[data-jetzt]");
    await seKarte.waitFor({ timeout: 5000 });
    check(/Gleich 16:15 Zahnarzt Dr\. Berg-Hinrichsen mit Jonne und Mathis\./.test((await seKarte.innerText()).replace(/\s+/g, " ")), "iPhone SE: langer Termin ganz da");
    await jetztGanz(se, check, "iPhone SE langer Termin");
    const b = await seKarte.boundingBox();
    await swipe(se, { x: b.x + b.width * 0.8, y: b.y + b.height / 2, dx: -b.width * 0.6 });
    await se.waitForTimeout(600);
    await jetztGanz(se, check, "iPhone SE Thema 2");
    await jetztFamilie(se, "2026-10-23T13:00", ["t3"]);
    await se.locator('[data-jetzt="wochenende"]').waitFor({ timeout: 5000 });
    await jetztGanz(se, check, "iPhone SE Freitag");
    check(!se.errors.length, `iPhone SE: keine Fehler ${se.errors.join(" | ")}`);
  } finally {
    await se.context().close();
  }
};

/**
 * Hallo-Bildschirm: nach 2 s springt Mia einmal vor Freude und sagt „Ich bin
 * bereit!“ (Sprechblase ganz im Bild – auch auf dem iPhone SE); Antippen →
 * „Hihi, kitzelig!“ (im Sprung erst danach); unten „Gemacht in Eutin von
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
    check(await page.getByText("Gemacht in Eutin von KARAMBA Eis").isVisible(), `${where}: unten „Gemacht in Eutin von KARAMBA Eis“`);
    const zeile = await page.getByText("Gemacht in Eutin von KARAMBA Eis").evaluate((el) => ({ lines: el.getClientRects().length, right: el.getBoundingClientRect().right }));
    check(zeile.lines === 1 && zeile.right <= page.viewportSize().width, `${where}: Zeile bricht nie um`);
    // Antippen während des Sprungs: erst danach kitzelig
    await page.locator("[data-hello]").click({ force: true });
    check(!(await page.getByText("Hihi, kitzelig!").count()), `${where}: im Sprung noch nicht`);
    await page.getByText("Hihi, kitzelig!").waitFor({ timeout: 3500 }).catch(() => {});
    check(await page.getByText("Hihi, kitzelig!").isVisible(), `${where}: danach „Hihi, kitzelig!“`);
    check((await page.locator('.hello-jump[data-kitzel="an"]').count()) === 1, `${where}: wackelt kitzelig`);
  }
};

/** Launch 1.0: ganze Kachel = Seite (freie Fläche, nicht nur der Titel); Zeilen behalten ihr Ziel */
export const ganzeKachel = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const ziel = async (id) => {
    const el = page.locator(`[data-kachel-ziel] > section[aria-label="${id}"]`).first();
    await el.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const b = await el.boundingBox();
    // unten in der Kachel (nicht in der runden Ecke): freie Fläche, keine Zeile, kein Knopf
    await page.mouse.click(b.x + b.width - 40, b.y + b.height - 5);
    await page.waitForTimeout(900);
    return page.url();
  };
  check((await ziel("Termine")).includes("seite=kalender"), "Termine-Kachel öffnet den Kalender");
  check((await page.getByRole("tab", { name: "Kalender", selected: true }).count()) > 0, "Kalender steht da");
  await page.goBack();
  await page.waitForTimeout(800);
  check((await ziel("Aufgaben")).endsWith("/aufgaben"), "Aufgaben-Kachel öffnet Aufgaben");
};
