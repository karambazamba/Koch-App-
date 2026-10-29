// npm run pruefen – der große Check vor dem Vorführen: jede Seite auf iPhone
// SE, iPhone 15 Pro und Pixel 7, hell und dunkel, im Browser und als App vom
// Home-Bildschirm (display-mode: standalone), die Startseite zusätzlich zu
// 7:10 / 12:30 / 17:45 / 21:30 / 23:30 (Beispiel-Tag und eigene Familie).
// Je Seite: kein seitliches Verrutschen, ganz unten nichts unter der Leiste,
// Tippflächen ≥ 44 px, Eingabefelder ≥ 16 px, keine Konsolen-Fehler, keine
// 404, keine Platzhalter/englischen Reste/geraden Apostrophe im Text; auf der
// Startseite das feste Raster (Tafel 118: jede Kachel genau XS/S/M groß, S
// quadratisch – nur ganz schmal etwas höher, `grundZeile` –, Listen-Reihen
// so hoch wie ihr Inhalt (A-048), nichts quillt über).
// Nur Teile: `npm run pruefen -- --schnell` (nur 15 Pro hell, Browser).
import { BASE, hello, launch, newPage, seedFamily, setDark, startServer } from "./lib.mjs";
import { RECIPE_DATA } from "./ablaeufe/essen.mjs";
import { miaKnopfUeberText } from "./regeln.mjs";

const quick = process.argv.includes("--schnell");
const DEVICES = quick ? ["iPhone 15 Pro"] : ["iPhone SE", "iPhone 15 Pro", "Pixel 7"];
const THEMES = quick ? [false] : [false, true];
const MODES = quick ? ["browser"] : ["browser", "app"];
const TIMES = ["07:10", "12:30", "17:45", "21:30", "23:30"];

export const PAGES = [
  "/", "/?seite=kalender", "/?seite=essen", "/kochbuch", "/kochbuch/rezept?id=sp", "/kochbuch/bearbeiten", "/kochbuch/kochen?id=sp",
  "/einkaufsliste", "/einkaufsliste/aussuchen", "/einkaufsliste/laden", "/vorrat", "/pinnwand", "/notizen", "/notizen/bearbeiten?id=n1", "/aufgaben", "/tag?datum=2026-10-21",
  "/wetter", "/brand", "/spendentopf", "/tipps", "/sport", "/wundertuete", "/wochenplan", "/woche/check",
  "/profil", "/profil/kuechenhelfer", "/profil/familie", "/profil/person?id=a1", "/profil/daten", "/profil/bausteine", "/profil/startseite",
  "/profil/tagesablauf", "/profil/kalender", "/profil/essen", "/profil/kochstil", "/profil/das-moegt-ihr", "/profil/gesundheit", "/profil/lieblingsgerichte",
  "/profil/nie-wieder", "/profil/basen", "/profil/einkaufstag", "/profil/produkte", "/profil/haushalt", "/profil/mails", "/profil/pause", "/profil/durchatmen",
  "/profil/regiontipps", "/profil/standardwoche", "/profil/warme-mahlzeit", "/profil/wetter", "/konto",
];

/** Als App vom Home-Bildschirm: display-mode standalone (wie iOS/Android) */
const STANDALONE = () => {
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => (/display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } : mm(q));
  Object.defineProperty(navigator, "standalone", { get: () => true });
};

/** Alle Prüfungen auf der offenen Seite (im Browser ausgewertet) */
function inspect() {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    const wide = [...document.querySelectorAll("body *")].find((el) => el.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(el).position !== "fixed");
    out.push(`seitlich verrutscht (${de.scrollWidth} > ${de.clientWidth})${wide ? `: <${wide.tagName.toLowerCase()} class="${String(wide.className).slice(0, 60)}">` : ""}`);
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && Number(st.opacity) > 0.05;
  };
  // Tippflächen (ohne `hit` – dort sorgt ::before für 44 px)
  for (const el of document.querySelectorAll("main button, main a[href], main [role=button], main input[type=checkbox], main [role=switch]")) {
    // Seitenanzeige der Jetzt-Karte (wie iOS-Punkte; gewechselt wird per Wischen)
    if (el.matches("[role=tab][aria-label^='Thema']")) continue;
    if (!visible(el) || el.closest(".hit") || el.closest(".sr-only") || el.closest("[aria-hidden=true]") || el.closest("p")) continue;
    const r = el.getBoundingClientRect();
    // versteckte Schalter (sr-only) und Kästchen in einer Zeile: die Zeile ist die Tippfläche
    if (r.width <= 2 || (el.tagName === "INPUT" && el.closest("label")?.getBoundingClientRect().height >= 44)) continue;
    // Listenzeilen der Startseite (`data-zeile`): 30 px reichen, die ganze Zeile ist tippbar
    if (el.closest("[data-zeile]") && r.height >= 29) continue;
    // 7-Spalten-Raster (Monat, Woche) sind schmal, aber hoch genug – wie im Apple-Kalender
    if (r.height < 40 || r.width < (r.height >= 44 ? 30 : 40)) out.push(`kleine Tippfläche ${Math.round(r.width)}×${Math.round(r.height)}: „${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)}“`);
  }
  // Knöpfe über Text (z. B. Kachel-Kopf: Mikro über „PINNWAND“)
  const texts = [...document.querySelectorAll("main *")].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1));
  const btns = [...document.querySelectorAll("main button, main a[href]")].filter((b) => visible(b) && !b.closest("[aria-hidden=true]") && !b.closest(".sr-only"));
  outer: for (const b of btns) {
    const rb = b.getBoundingClientRect();
    for (const t of texts) {
      if (b.contains(t) || t.contains(b)) continue;
      const rt = t.getBoundingClientRect();
      const w = Math.min(rb.right, rt.right) - Math.max(rb.left, rt.left);
      const h = Math.min(rb.bottom, rt.bottom) - Math.max(rb.top, rt.top);
      // Text, der wirklich verdeckt wird (Knopf liegt darüber)
      // nur teilweise verdeckt (ganz darunter liegender Text ist Absicht, z. B. „Entfernen“ hinter einer Wisch-Zeile)
      const inside = rt.left >= rb.left - 1 && rt.right <= rb.right + 1 && rt.top >= rb.top - 1 && rt.bottom <= rb.bottom + 1;
      if (w > 6 && h > 6 && !inside) {
        const cx = Math.max(rb.left, rt.left) + w / 2;
        const cy = Math.max(rb.top, rt.top) + h / 2;
        const top = document.elementFromPoint(cx, cy);
        // sichtbar darüber: Symbol oder Fläche mit Farbe (nicht nur die unsichtbare Trefferfläche)
        const painted = (() => {
          for (let n = top; n && b.contains(n); n = n.parentElement) {
            if (n instanceof SVGElement) return true;
            const bg = getComputedStyle(n).backgroundColor;
            const a = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : bg === "transparent" ? 0 : 1;
            if (a > 0.3) return true;
          }
          return false;
        })();
        if (top && b.contains(top) && painted && !top.closest("[role=dialog]")) {
          out.push(`Knopf über Text: „${(b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 30)}“ verdeckt „${t.textContent.trim().slice(0, 30)}“`);
          continue outer;
        }
      }
    }
  }
  // Eingabefelder ≥ 16 px (sonst zoomt das iPhone)
  for (const el of document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select")) {
    if (!visible(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) out.push(`Eingabefeld ${fs}px: ${el.getAttribute("aria-label") || el.placeholder || el.name}`);
  }
  // Texte
  const text = document.body.innerText;
  const bad = [
    [/\b(Lorem|TODO|FIXME|undefined|NaN|\[object)/, "Platzhalter"],
    [/Lotte/, "„Lotte“"],
    [/[A-Za-zäöüß]'[a-zäöüß]/, "gerader Apostroph"],
    [/\b(Loading|Submit|Cancel|Save|Delete|Settings|Close|Error)\b/, "englischer Rest"],
    [/Familien-Code/, "„Familien-Code“"],
  ];
  for (const [re, what] of bad) {
    const m = text.match(re);
    if (m) out.push(`${what}: „…${text.slice(Math.max(0, m.index - 25), m.index + 25).replace(/\s+/g, " ")}…“`);
  }
  return out;
}

/** Startseite im festen Raster: Fläche je Größe aus der Breite, Inhalt passt hinein */
function raster() {
  const out = [];
  const board = document.querySelector("[data-raster]");
  if (!board) return out;
  const width = board.getBoundingClientRect().width;
  const s = (width - 8) / 2;
  // Grund-Zeile wie `grundZeile` (lib/heute/raster.ts): mindestens 80 px – auf dem iPhone SE 1 (320 px) ist S darum 168 statt 140 hoch
  const zeile = Math.max(80, (width - 24) / 4);
  const h = 2 * zeile + 8;
  const want = { XS: [s, zeile], S: [s, h], M: [width, h], "S+S": [width, h] };
  // Wasserzeichen (A-036, Tafel 124 A) ragen absichtlich 30 px über den Rand und sind
  // dort angeschnitten – sie zählen nicht als Inhalt, der überquillt (wie im Durchklick `raster`)
  const marks = [...document.querySelectorAll(".kachel-wasserzeichen")];
  for (const m of marks) m.style.display = "none";
  for (const el of board.querySelectorAll(":scope > [data-unit]")) {
    const r = el.getBoundingClientRect();
    // gemessen werden die Kacheln, der Wetter-Himmel und die Bild-Fläche der Essen-Kachel (die schneidet selbst ab – ein Überquellen fiel sonst nicht auf)
    const [w, h] = want[el.dataset.groesse] ?? [r.width, r.height];
    // A-048 (Tafel 135): Reihen nur aus Listen (Termine, Aufgaben, Einkauf) sind so hoch wie ihr Inhalt – geprüft wird dort die Breite und dass mindestens Kopf + eine Zeile dasteht
    if (el.dataset.hoehe === "inhalt") {
      if (Math.abs(r.width - w) > 1.5 || r.height < 80) out.push(`Kachel nicht im Raster: ${el.dataset.unit} ${el.dataset.groesse} ${Math.round(r.width)}×${Math.round(r.height)} statt ${Math.round(w)} breit, mindestens 80 hoch`);
    } else if (Math.abs(r.width - w) > 1.5 || Math.abs(r.height - h) > 1.5) out.push(`Kachel nicht im Raster: ${el.dataset.unit} ${el.dataset.groesse} ${Math.round(r.width)}×${Math.round(r.height)} statt ${Math.round(w)}×${Math.round(h)}`);
    for (const sec of el.querySelectorAll("section, a.wx-himmel, [data-essen-antippen]")) if (!sec.closest("[role=dialog]") && sec.scrollHeight > sec.clientHeight + 2) out.push(`Kachel quillt über: ${el.dataset.unit} (${sec.getAttribute("aria-label") || sec.tagName})`);
  }
  for (const m of marks) m.style.display = "";
  return out;
}

/** Fängt etwas anderes den Tipp ab? (Mitte jedes sichtbaren Knopfs muss der Knopf sein) */
function blocked() {
  const out = [];
  for (const b of document.querySelectorAll("main button, main a[href]")) {
    const r = b.getBoundingClientRect();
    const st = getComputedStyle(b);
    if (r.width < 4 || r.height < 4 || st.visibility === "hidden" || b.disabled || b.closest(".sr-only,[aria-hidden=true],[inert]")) continue;
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x < 0 || y < 60 || x > innerWidth || y > innerHeight - 100) continue;
    const top = document.elementFromPoint(x, y);
    if (!top || b.contains(top) || top.closest("[role=dialog],[role=alertdialog],[data-begleitung-leiste],[data-keep-edit],header")) continue;
    // unter einem mitlaufenden Seitenkopf (beim Scrollen normal)
    let sticky = false;
    for (let n = top; n; n = n.parentElement) if (["sticky", "fixed"].includes(getComputedStyle(n).position)) sticky = true;
    if (sticky) continue;
    // liegt der Knopf IN einem anderen Knopf (z. B. ganze Karte), zählt das nicht
    const other = top.closest("button,a[href]");
    if (other && other.contains(b)) continue;
    out.push(`Knopf fängt keinen Tipp: „${(b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40)}“ (darüber <${top.tagName.toLowerCase()} class="${String(top.className).slice(0, 50)}">)`);
  }
  return out;
}

/** Ganz nach unten scrollen: liegt Inhalt unter der Leiste unten (Tafel 96) bzw. unter dem herausragenden Mia-Knopf? */
async function bottomCheck(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(350);
  const knopf = await page.evaluate(miaKnopfUeberText);
  return [...knopf, ...(await page.evaluate(() => {
    const bar = document.querySelector("[data-leiste-flaeche]");
    if (!bar) return [];
    const top = bar.getBoundingClientRect().top;
    const hidden = [...document.querySelectorAll("main button, main a, main p, main h2, main h3, main li, main img, main input")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        const fixed = (() => {
          for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === "fixed") return true;
          return false;
        })();
        return r.height > 0 && st.visibility !== "hidden" && r.bottom > top + 2 && r.top < innerHeight && !el.closest("[data-begleitung-leiste]") && !fixed;
      })
      .filter((el) => !el.closest("[role=dialog]"));
    return hidden.slice(0, 2).map((el) => `ganz unten unter der Leiste: „${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 40)}“`);
  }))];
}

const stop = await startServer();
const browser = await launch();
const found = new Map();
const note = (where, msg) => {
  const k = msg.replace(/\d+(\.\d+)?px|\d+×\d+/g, "#");
  if (!found.has(k)) found.set(k, { msg, where: [] });
  found.get(k).where.push(where);
};
const t0 = Date.now();
let pages = 0;

for (const device of DEVICES)
  for (const dark of THEMES)
    for (const mode of MODES) {
      const tag = `${device} · ${dark ? "dunkel" : "hell"} · ${mode === "app" ? "App" : "Browser"}`;
      // Startseite zu jeder Uhrzeit: Beispiel-Tag und eigene Familie
      for (const time of quick ? ["12:30"] : TIMES) {
        for (const own of [false, true]) {
          const p = await newPage(browser, device, { dark, time: `2026-10-21T${time}:00+02:00` });
          if (mode === "app") await p.addInitScript(STANDALONE);
          const bad = [];
          p.on("response", (r) => r.status() >= 400 && !r.url().includes("/api/") && bad.push(`${r.status()} ${new URL(r.url()).pathname}`));
          await hello(p);
          if (own) {
            await seedFamily(p, RECIPE_DATA);
            if (dark) await setDark(p);
            await p.goto(BASE);
          }
          await p.waitForTimeout(1500);
          const where = `${tag} · ${time} · ${own ? "Familie" : "Beispiel"} · /`;
          for (const m of [...(await p.evaluate(inspect)), ...(await p.evaluate(raster)), ...(await p.evaluate(blocked)), ...(await bottomCheck(p)), ...(await p.evaluate(blocked)), ...bad, ...p.errors.map((e) => `Konsole: ${e.slice(0, 120)}`)]) note(where, m);
          pages++;
          await p.context().close();
        }
      }
      // Alle Seiten (12:30, eigene Familie)
      const page = await newPage(browser, device, { dark, time: "2026-10-21T12:30:00+02:00" });
      if (mode === "app") await page.addInitScript(STANDALONE);
      const bad = [];
      page.on("response", (r) => r.status() >= 400 && !r.url().includes("/api/") && bad.push(`${r.status()} ${new URL(r.url()).pathname}`));
      await hello(page);
      await seedFamily(page, RECIPE_DATA);
      if (dark) await setDark(page);
      for (const path of PAGES) {
        bad.length = 0;
        page.errors.length = 0;
        await page.goto(BASE + path);
        await page.waitForLoadState("networkidle").catch(() => {});
        await page.waitForTimeout(700);
        const where = `${tag} · ${path}`;
        for (const m of [...(await page.evaluate(inspect)), ...(await page.evaluate(blocked)), ...(await bottomCheck(page)), ...(await page.evaluate(blocked)), ...bad, ...page.errors.map((e) => `Konsole: ${e.slice(0, 120)}`)]) note(where, m);
        pages++;
      }
      await page.context().close();
    }

await browser.close();
stop();
console.log(`\n${pages} Seiten geprüft in ${Math.round((Date.now() - t0) / 1000)} s`);
if (!found.size) console.log("alles ok");
for (const { msg, where } of found.values()) console.log(`✗ ${msg}\n    ${where.length}× z. B. ${where.slice(0, 3).join(" | ")}`);
process.exit(found.size ? 1 : 0);
