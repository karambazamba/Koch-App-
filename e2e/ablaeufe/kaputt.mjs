// A-059 „Kaputt“ (Tafel 144/145):
// · notizenKachelSeite: Notizen-Kachel XS · S · M, leer und voll – Antippen
//   (Zeile, Leertext, freie Fläche) öffnet immer die Notizen-Seite, nur der
//   Stift die Schnelleingabe; leere Seite „Noch keine Notizen. …“.
// · menueErstesTippen: Kaltstart (langsames Netz, gedrosselte CPU) → „•••“ →
//   „Einstellungen“ bzw. „Startseite bearbeiten“ wirkt beim ersten Tippen –
//   im Browser und als Home-Bildschirm-App (display-mode: standalone).
// · wischenNurKlar: Wisch von unten schräg → Seite bleibt, klarer Seitenwisch
//   → wechselt, Hintergrund direkt danach → zurück, Rand links → Zurück.
// · untenFrei: Wundertüte ganz unten auf der Startseite – nach unten
//   gescrollt liegt nichts unter Leiste oder Mia-Knopf, auch umgedreht.
import { BASE, hello, newPage, seedFamily, store, swipe } from "../lib.mjs";

const startseite = (tiles) => ({ version: 9, tipSeen: true, tiles: tiles.map(([id, size]) => ({ id, visible: true, size })) });
const FEATURES = { version: 6, on: ["notizen", "vorrat", "pinnwand", "wundertuete"], launch: true, imHaus: true };

async function setze(page, werte) {
  await page.evaluate((w) => {
    for (const [k, v] of Object.entries(w)) localStorage.setItem(k, JSON.stringify(v));
    localStorage.removeItem("wasgibts.beispiel");
  }, werte);
}

export const notizenKachelSeite = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  const voll = await store(page, "wasgibts.notizen");
  for (const leer of [true, false]) {
    for (const size of ["XS", "S", "M"]) {
      await setze(page, { "wasgibts.startseite": startseite([["notizen", size], ["termine", "M"]]), "wasgibts.funktionen": FEATURES, "wasgibts.notizen": leer ? { ...voll, notes: [] } : voll });
      await page.goto(BASE + "/");
      const kachel = page.locator('[data-raster] [data-notizen-groesse]');
      await kachel.waitFor({ timeout: 6000 });
      const wo = `${size} ${leer ? "leer" : "voll"}`;
      // 1. die Zeile bzw. der Leertext
      await kachel.locator(leer ? "[data-notiz-leer]" : "[data-notiz-zeile]").first().click();
      check(await page.waitForURL(/\/notizen$/, { timeout: 5000 }).then(() => true, () => false), `${wo}: Zeile/Leertext → Notizen-Seite`);
      if (leer && size === "XS") check(await page.locator("[data-notizen-leer]").getByText("Noch keine Notizen.").isVisible() && (await page.locator("[data-notizen-leer]").innerText()).includes("Tipp aufs Plus oder sag Mia: „Notiz: …“"), "leere Notizen-Seite: „Noch keine Notizen. Tipp aufs Plus oder sag Mia: „Notiz: …““");
      await page.goto(BASE + "/");
      await kachel.waitFor({ timeout: 6000 });
      // 2. freie Fläche unten links in der Kachel
      const box = await kachel.boundingBox();
      await page.mouse.click(box.x + 8, box.y + box.height - 6);
      check(await page.waitForURL(/\/notizen$/, { timeout: 5000 }).then(() => true, () => false), `${wo}: freie Fläche → Notizen-Seite`);
      await page.goto(BASE + "/");
      await kachel.waitFor({ timeout: 6000 });
      // 3. der Stift = neue Notiz (Schnelleingabe), bleibt auf der Startseite
      await kachel.getByRole("button", { name: "Schnellnotiz schreiben" }).click();
      const feld = page.getByRole("dialog", { name: "Schnelleingabe" }).getByRole("textbox", { name: "Neue Notiz" });
      check((await feld.waitFor({ timeout: 3000 }).then(() => true, () => false)) && new URL(page.url()).pathname === "/", `${wo}: Stift → Schnelleingabe „Neue Notiz“`);
      await page.keyboard.press("Escape");
    }
  }
};

/** Kaltstart wie auf dem Handy: langsames Netz, gedrosselte CPU (so kam der Fehler: Navigation länger als 300 ms) */
async function kaltstart(browser, device, standalone) {
  const page = await newPage(browser, device);
  if (standalone)
    await page.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } : mm(q));
      Object.defineProperty(navigator, "standalone", { get: () => true });
    });
  await hello(page);
  await seedFamily(page);
  return page;
}

async function menuePunkt(page, punkt) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: 200000, uploadThroughput: 100000 });
  await page.goto(BASE + "/", { waitUntil: "commit" });
  const mehr = page.getByRole("button", { name: "Mehr" });
  await mehr.waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await mehr.tap();
  await page.locator(`[data-menue-punkt="${punkt}"]`).tap({ timeout: 10000 });
  return cdp;
}

export const menueErstesTippen = async (page, check, device) => {
  const browser = page.context().browser();
  for (const standalone of [false, true]) {
    const wo = standalone ? "Home-Bildschirm-App" : "Browser";
    const p = await kaltstart(browser, device, standalone);
    try {
      check(!standalone || (await p.evaluate(() => window.matchMedia("(display-mode: standalone)").matches)), `${wo}: als App gestartet`);
      const cdp = await menuePunkt(p, "Einstellungen");
      const ok = await p.waitForURL(/\/profil$/, { timeout: 15000 }).then(() => true, () => false);
      await p.waitForTimeout(1500);
      check(ok && new URL(p.url()).pathname === "/profil", `${wo}: Kaltstart → ••• → „Einstellungen“ öffnet beim ersten Tippen (${new URL(p.url()).pathname})`);
      // Zurück = eine Ebene zurück zur Startseite (kein toter Verlaufseintrag)
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await p.goBack();
      await p.waitForTimeout(800);
      check(new URL(p.url()).pathname === "/" && !(await p.getByRole("dialog").count()), `${wo}: Zurück → Startseite ohne offenes Menü`);
      const cdp2 = await menuePunkt(p, "Startseite bearbeiten");
      check(await p.getByRole("button", { name: "Fertig" }).first().isVisible({ timeout: 10000 }).catch(() => false), `${wo}: „Startseite bearbeiten“ wirkt beim ersten Tippen`);
      await cdp2.send("Emulation.setCPUThrottlingRate", { rate: 1 });
      check(!p.errors.length, `${wo}: keine Fehler ${p.errors.join(" | ")}`);
    } finally {
      await p.context().close();
    }
  }
};

const seite = (page) => page.getByRole("tab", { selected: true }).innerText();
/** App geht in den Hintergrund (wie Wisch nach oben zum Schließen) */
const versteckt = (page) =>
  page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
const sichtbar = (page) =>
  page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });

export const wischenNurKlar = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const vp = page.viewportSize();
  // App schließen: vom unteren Rand schräg nach oben → Seite bleibt
  await swipe(page, { x: vp.width * 0.6, y: vp.height - 12, dx: -170, dy: -320, ms: 220 });
  await page.waitForTimeout(700);
  check((await seite(page)) === "Heute", `Wisch von unten schräg → Seite bleibt (${await seite(page)})`);
  await swipe(page, { x: vp.width * 0.7, y: vp.height - 30, dx: -200, dy: -40, ms: 220 });
  await page.waitForTimeout(700);
  check((await seite(page)) === "Heute", "Wisch aus dem unteren Streifen, fast waagerecht → Seite bleibt");
  // Mitten auf der Seite, aber zu steil (|dx| < 2·|dy|) → bleibt
  await swipe(page, { x: vp.width * 0.7, y: vp.height * 0.4, dx: -110, dy: 70, ms: 260 });
  await page.waitForTimeout(700);
  check((await seite(page)) === "Heute", "schräger als 2:1 → Seite bleibt");
  // Klarer Seitenwisch → Essen
  await swipe(page, { x: vp.width * 0.75, y: vp.height * 0.5, dx: -150, dy: 20, ms: 260 });
  await page.waitForTimeout(800);
  check((await seite(page)) === "Essen", `klarer Seitenwisch → wechselt (${await seite(page)})`);
  await swipe(page, { x: vp.width * 0.3, y: vp.height * 0.5, dx: 150, dy: -20, ms: 260 });
  await page.waitForTimeout(800);
  check((await seite(page)) === "Heute", "zurückwischen → Heute");
  // Wisch und gleich in den Hintergrund → zurück zur vorherigen Seite
  await swipe(page, { x: vp.width * 0.75, y: vp.height * 0.5, dx: -150, dy: 20, ms: 200 });
  await versteckt(page);
  await page.waitForTimeout(900);
  await sichtbar(page);
  await page.waitForTimeout(400);
  check((await seite(page)) === "Heute" && new URL(page.url()).search === "", `Wisch, dann sofort Hintergrund → bleibt Heute (${await seite(page)} ${new URL(page.url()).search})`);
  // Hintergrund später als 500 ms nach dem Wisch → bleibt gewechselt
  await swipe(page, { x: vp.width * 0.75, y: vp.height * 0.5, dx: -150, dy: 20, ms: 200 });
  await page.waitForTimeout(900);
  await versteckt(page);
  await page.waitForTimeout(300);
  await sichtbar(page);
  await page.waitForTimeout(300);
  check((await seite(page)) === "Essen", "Hintergrund erst später → Essen bleibt");
  // Unterseite: Wisch vom linken Rand = Zurück
  await page.goto(BASE + "/");
  await page.locator("[data-raster]").waitFor();
  await page.goto(BASE + "/notizen");
  await page.getByRole("heading", { name: "Notizen" }).waitFor();
  await page.waitForTimeout(500);
  await swipe(page, { x: 6, y: vp.height * 0.45, dx: 160, dy: 10, ms: 260 });
  check(await page.waitForURL((u) => u.pathname === "/", { timeout: 4000 }).then(() => true, () => false), "Rand links → Zurück");
};

export const untenFrei = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await setze(page, { "wasgibts.startseite": startseite([["termine", "M"], ["aufgaben", "M"], ["notizen", "S"], ["einkauf", "S"], ["wundertuete", "M"]]), "wasgibts.funktionen": FEATURES });
  await page.goto(BASE + "/");
  const kachel = page.locator("[data-raster] [data-wundertuete]");
  await kachel.waitFor({ timeout: 6000 });
  await page.waitForTimeout(600);
  const mass = () =>
    page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
      const k = document.querySelector("[data-raster] [data-wundertuete]").getBoundingClientRect();
      const leiste = document.querySelector("[data-leiste-flaeche]").getBoundingClientRect();
      const mia = [...document.querySelectorAll("[data-leiste] button")].map((b) => b.getBoundingClientRect()).reduce((m, r) => Math.min(m, r.top), Infinity);
      return { unten: Math.round(k.bottom), leiste: Math.round(leiste.top), mia: Math.round(mia) };
    });
  await page.waitForTimeout(300);
  const m1 = await mass();
  check(m1.unten <= m1.leiste && m1.unten <= m1.mia, `ganz unten gescrollt: Kachel endet über Leiste und Mia-Knopf (Kachel ${m1.unten}, Leiste ${m1.leiste}, Mia ${m1.mia})`);
  await kachel.locator("[data-drehen]").click();
  await page.waitForTimeout(700);
  const m2 = await mass();
  const mehr = await kachel.locator("[data-mehr] span").boundingBox();
  check(m2.unten <= m2.mia && mehr && mehr.y + mehr.height <= m2.mia, `umgedreht: „Mehr ›“ frei vom Mia-Knopf (${Math.round((mehr?.y ?? 0) + (mehr?.height ?? 0))} ≤ ${m2.mia})`);
};
