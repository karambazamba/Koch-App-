// Mias Wundertüte (A-022, Tafel 116): neue Nutzer haben sie als S hinter
// Essen + Einkauf (mit Beispiel-Karte), bestehende nicht (aber „NEU“ in der
// Auswahl). Antippen dreht um (Antwort, Teilen, „Nochmal tippen = Neues“),
// nochmal = andere Sorte; M = gleiche Karte, breiter; reduced-motion ohne
// Drehung; Schlicht und Dunkel ohne Überlauf.
import { readFileSync, readdirSync } from "node:fs";
import { BASE, hello, newPage, seedFamily, setDark, store } from "../lib.mjs";
import { abgeschnitteneTexte } from "../regeln.mjs";

const KACHEL = "[data-raster] [data-wundertuete]";
const FEATURES = { version: 6, on: ["notizen", "vorrat", "pinnwand", "wundertuete"], launch: true, imHaus: true };

/** Anordnung speichern und neu laden */
async function layout(page, tiles, features = FEATURES) {
  await page.evaluate(
    ({ tiles, features }) => {
      localStorage.setItem("wasgibts.startseite", JSON.stringify({ version: 9, tiles: tiles.map(([id, size]) => ({ id, visible: true, size })), tipSeen: true }));
      localStorage.setItem("wasgibts.funktionen", JSON.stringify(features));
      localStorage.removeItem("wasgibts.beispiel");
    },
    { tiles, features },
  );
  await page.reload();
  await page.locator("[data-raster]").waitFor({ timeout: 6000 });
  await page.waitForTimeout(700);
}

const karte = (page) => page.locator(KACHEL).first();
const info = (page) => karte(page).evaluate((el) => ({ sorte: el.dataset.sorte, seite: el.dataset.seite, w: el.getBoundingClientRect().width, over: [...el.querySelectorAll("[data-frage], [data-antwort]")].some((t) => t.parentElement.scrollHeight > t.parentElement.clientHeight + 1 || t.parentElement.getBoundingClientRect().bottom > t.closest("section").getBoundingClientRect().bottom) }));
// „Quillt über“ = Frage/Antwort passt nicht in ihre Fläche (das Wasserzeichen ragt absichtlich über den Rand, zählt nicht)

export const wundertuete = async (page, check) => {
  // Neuer Nutzer: Kachel steht da, mit Beispiel-Karte
  await hello(page);
  const neu = karte(page);
  check(await neu.isVisible().catch(() => false), "neuer Nutzer: Wundertüte steht auf der Startseite");
  check((await neu.getAttribute("aria-label"))?.includes("Beispiel"), "Beispiel-Tag: feste Karte mit leisem „Beispiel“");
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-raster] > [data-unit]")].map((u) => u.dataset.unit));
  check(order.indexOf("wundertuete") === order.indexOf("essen+einkauf") + 1, "Wundertüte direkt hinter Essen + Einkauf");

  // Bestehender Nutzer: nicht von selbst da, aber in der Auswahl mit „NEU“
  await seedFamily(page);
  await layout(page, [["termine", "M"], ["essen", "S"], ["einkauf", "S"]], { version: 6, on: ["notizen", "vorrat", "pinnwand"], launch: true, imHaus: true });
  check(!(await page.locator(KACHEL).count()), "bestehender Nutzer: keine Wundertüte von selbst");
  await page.getByRole("button", { name: "Startseite bearbeiten" }).last().click();
  await page.getByRole("button", { name: "Verstanden" }).click({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Kachel/ }).first().click();
  const wahl = page.getByRole("button", { name: /Mias Wundertüte – hinzufügen/ });
  check(await wahl.isVisible().catch(() => false), "Auswahl: „Mias Wundertüte“ zum Hinzufügen");
  await page.keyboard.press("Escape");

  // Antippen: umdrehen bzw. nächste Karte, andere Sorte
  await layout(page, [["wundertuete", "S"], ["termine", "M"]]);
  const vorher = await info(page);
  check(Boolean(vorher.sorte) && !vorher.over, `Karte „${vorher.sorte}“ vorne, nichts quillt über`);
  await karte(page).click();
  await page.waitForTimeout(1000);
  const gedreht = await info(page);
  if (gedreht.seite === "hinten") {
    check(await karte(page).getByText("Nochmal tippen = Neues").isVisible(), "Rückseite: „Nochmal tippen = Neues“");
    check(await karte(page).getByRole("button", { name: "Teilen" }).isVisible(), "Rückseite: Teilen oben rechts");
    await karte(page).click();
    await page.waitForTimeout(1000);
  }
  const danach = await info(page);
  check(danach.seite === "vorne" && danach.sorte !== vorher.sorte, `nächste Karte, andere Sorte (${vorher.sorte} → ${danach.sorte})`);
  const stand = await store(page, "wasgibts.wundertuete");
  check(Object.values(stand?.gezeigt ?? {}).flat().length >= 2, "gezeigte Karten gemerkt (nur IDs)");

  // M = gleiche Karte, breiter
  await layout(page, [["wundertuete", "M"], ["termine", "M"]]);
  const breit = await info(page);
  const brett = await page.locator("[data-raster]").evaluate((el) => el.getBoundingClientRect().width);
  check(Math.abs(breit.w - brett) < 2 && !breit.over, "M: ganz breit, nichts quillt über");

  // reduced-motion: Überblenden statt Drehen
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator(KACHEL).waitFor();
  const ohneDreh = await karte(page).evaluate((el) => getComputedStyle(el.querySelector(".wt-dreh")).transitionProperty);
  check(ohneDreh === "all" || ohneDreh === "none" || !ohneDreh.includes("transform"), "reduced-motion: keine Drehung");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Schlicht und Dunkel
  await page.evaluate(() => document.documentElement.setAttribute("data-look", "schlicht"));
  check(!(await info(page)).over, "Schlicht: nichts quillt über");
  await setDark(page);
  await page.reload();
  await page.locator(KACHEL).waitFor();
  const dunkel = await karte(page).evaluate((el) => getComputedStyle(el.querySelector(".wt-vorne")).backgroundColor);
  check(dunkel !== "rgb(255, 255, 255)" && !(await info(page)).over, "Dunkel: dunkle Fläche, nichts quillt über");
  await page.goto(BASE);
};

/** Alle IDs des Pools (aus den Datendateien: Vorsilbe + laufende Nummer) */
function poolIds() {
  const dir = new URL("../../src/lib/wundertuete/data/", import.meta.url);
  return readdirSync(dir).flatMap((f) => {
    const code = readFileSync(new URL(f, dir), "utf8");
    const vor = code.match(/id: `([a-z0-9]+)-\$\{/)?.[1];
    return vor ? [...code.matchAll(/^ {2}e\((\d+),/gm)].map((m) => `${vor}-${m[1].padStart(3, "0")}`) : [];
  });
}

/** Jede Karte des Pools vorne und hinten, in S und M: nichts abgeschnitten, nie „…“ (A-045) */
async function alleKarten(page, check, wo) {
  const ids = poolIds();
  check(ids.length === 459, `${wo}: ${ids.length} Karten im Pool`);
  await page.evaluate(() => localStorage.removeItem("wasgibts.beispiel"));
  for (const size of ["S", "M"]) {
    await layout(page, [["wundertuete", size]]);
    const funde = [];
    for (const id of ids) {
      await page.evaluate((id) => {
        localStorage.setItem("wasgibts.wundertuete", JSON.stringify({ version: 1, karte: id, anzeigen: 1, zuletzt: Date.now(), gezeigt: {} }));
        window.dispatchEvent(new StorageEvent("storage", { key: "wasgibts.wundertuete" }));
      }, id);
      await page.locator(`${KACHEL}[data-karte="${id}"]`).waitFor({ timeout: 3000 });
      const vorne = await page.evaluate(abgeschnitteneTexte);
      funde.push(...vorne.map((f) => `${id} vorne: ${f}`));
      if (await karte(page).locator("[data-rueckseite]").count()) {
        await karte(page).click();
        await page.locator(`${KACHEL}[data-seite="hinten"]`).waitFor({ timeout: 3000 });
        const hinten = await page.evaluate(abgeschnitteneTexte);
        funde.push(...hinten.map((f) => `${id} hinten: ${f}`));
      }
    }
    check(!funde.length, `${wo} · ${size}: alle ${ids.length} Karten ganz${funde.length ? ` – ${funde.slice(0, 12).join(" | ")}${funde.length > 12 ? ` (+${funde.length - 12})` : ""}` : ""}`);
  }
}

export const wundertueteAlle = async (page, check, device) => {
  await hello(page);
  await seedFamily(page);
  await alleKarten(page, check, device);
  // iPhone SE (320 px) einmal mit – im Lauf des 15 Pro
  if (device !== "iPhone 15 Pro") return;
  const se = await newPage(page.context().browser(), "iPhone SE");
  try {
    await hello(se);
    await seedFamily(se);
    await alleKarten(se, check, "iPhone SE");
    check(!se.errors.length, `iPhone SE: keine Fehler ${se.errors.join(" | ")}`);
  } finally {
    await se.context().close();
  }
};
