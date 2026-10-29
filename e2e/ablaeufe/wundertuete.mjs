// Mias Wundertüte und Rätsel (A-022, Tafel 116; A-052, Tafel 137/140): neue
// Nutzer haben die Wundertüte als S (mit Beispiel-Karte „Kiek mol an“),
// bestehende nicht (aber „NEU“ in der Auswahl). Keine Punkte; vorn nur die
// Frage mit „Antippen für die Lösung“, Antippen dreht die Karte (hinten die
// Lösung im weißen Feld), „Mehr ›“ öffnet die Seite mit der Lösung offen
// (A-059, Tafel 145); dort nach „Noch eine ›“ (nie doppelt) erst verdeckt. Mias Witze per
// Mock-KI, ohne Vorrat „… kommt bald.“. Rätsel-Fenster (über „Für
// Entwickler“, bis Paket A den Mini-Kreis anbindet): Lösung erst nach
// Antippen, „Noch eins ›“. M = gleiche Karte, breiter; Schlicht und Dunkel
// ohne Überlauf.
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
/** Heute in Berlin (wie `todayIso` der App) */
const heute = (page) => page.evaluate(() => new Date().toLocaleDateString("sv", { timeZone: "Europe/Berlin" }));
/** Stand der Wundertüte bzw. der Rätsel setzen und neu zeichnen lassen */
async function setzeStand(page, stand, key = "wasgibts.wundertuete") {
  await page.evaluate(({ stand, key }) => {
    localStorage.setItem(key, JSON.stringify(stand));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }, { stand, key });
}
const info = (page) => karte(page).evaluate((el) => ({ sorte: el.dataset.sorte, w: el.getBoundingClientRect().width, over: [...el.querySelectorAll("[data-frage]")].some((t) => { const box = t.parentElement.parentElement; return box.scrollHeight > box.clientHeight + 1 || box.getBoundingClientRect().bottom > t.closest("section").getBoundingClientRect().bottom; }) }));
// „Quillt über“ = Frage/Antwort passt nicht in ihre Fläche (das Wasserzeichen ragt absichtlich über den Rand, zählt nicht)

export const wundertuete = async (page, check) => {
  // Neuer Nutzer: Kachel steht da, mit Beispiel-Karte
  await hello(page);
  const neu = karte(page);
  check(await neu.isVisible().catch(() => false), "neuer Nutzer: Wundertüte steht auf der Startseite");
  check((await neu.locator("[data-drehen]").getAttribute("aria-label"))?.includes("Beispiel"), "Beispiel-Tag: feste Karte, „Beispiel“ für VoiceOver");
  check(!(await neu.getByText("Beispiel", { exact: true }).count()), "Beispiel-Tag: kein eigenes Schild (das eine steht an der Pinnwand, Tafel 119)");
  check((await neu.getAttribute("data-karte")) === "pl-090" && (await neu.locator('[data-seite-karte="vorn"]').getByText("Platt för Plietsche").isVisible()) && (await neu.getByText("Antippen für die Lösung").isVisible()), "Beispiel: „Kiek mol an“ unter „Platt för Plietsche“, „Antippen für die Lösung“ (Tafel 140)");
  check((await neu.locator('[data-seite-karte="vorn"] [data-symbol="anchor"]').count()) === 1, "Platt: Wasserzeichen Anker");
  const order = await page.evaluate(() => [...document.querySelectorAll("[data-raster] > [data-unit]")].map((u) => u.dataset.unit));
  check(order.indexOf("wundertuete") === order.indexOf("essen") + 1 && order.indexOf("einkauf") === order.indexOf("wundertuete") + 1, `Wundertüte neben Essen, darunter Einkauf breit (Tafel 140: ${order.join(", ")})`);

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

  // Kachel: keine Punkte; Antippen öffnet die Seite mit der Lösung groß
  await layout(page, [["wundertuete", "S"], ["termine", "M"]]);
  const tag = await heute(page);
  const vorher = await info(page);
  const id = await karte(page).getAttribute("data-karte");
  check(Boolean(vorher.sorte) && !vorher.over, `Karte „${vorher.sorte}“, nichts quillt über`);
  check(!(await page.locator("[data-punkte]").count()), "keine Punkte");
  const stand = await store(page, "wasgibts.wundertuete");
  check(stand?.version === 2 && stand.aktuell?.tag === tag && stand.aktuell?.id === id && stand.gesehen?.includes(id), "Karte des Tages gemerkt und als gesehen (nur IDs)");
  await setzeStand(page, { version: 2, aktuell: { id: "aw-001", tag }, gesehen: ["aw-001"], eigene: [] });
  await page.locator(`${KACHEL}[data-karte="aw-001"]`).waitFor({ timeout: 3000 });
  check(await karte(page).getByText("Antippen für die Lösung").isVisible(), "Angeberwissen: „Antippen für die Lösung“");
  check(await karte(page).locator('[data-seite-karte="vorn"] [data-sorte-label]').getByText("Angeberwissen").isVisible(), "kleine Sorte über dem Text");
  // Tafel 145: vorn keine Lösung; Antippen dreht um, nochmal antippen dreht zurück; zur Seite nur über „Mehr ›“
  const hinten = karte(page).locator('[data-seite-karte="hinten"]');
  check((await hinten.getAttribute("inert")) !== null && !(await karte(page).locator("[data-mehr]").count()), "vorn: Lösung verdeckt (Rückseite inert), kein „Mehr ›“");
  await karte(page).locator("[data-drehen]").click();
  await page.waitForTimeout(700);
  check((await karte(page).getAttribute("data-gedreht")) !== null && (await hinten.getAttribute("inert")) === null && (await hinten.locator("[data-loesung]").getByText("30").isVisible()), "Antippen: Karte dreht sich, Lösung im weißen Feld");
  check(new URL(page.url()).pathname === "/", "Antippen öffnet nicht die Seite");
  const mehr = karte(page).locator("[data-mehr]");
  const mehrBox = await mehr.boundingBox();
  check(mehrBox && mehrBox.width >= 44 && mehrBox.height >= 44, `„Mehr ›“ eigene Tippfläche ≥ 44 px (${Math.round(mehrBox?.width ?? 0)}×${Math.round(mehrBox?.height ?? 0)})`);
  await karte(page).locator("[data-drehen]").click();
  await page.waitForTimeout(700);
  check((await karte(page).getAttribute("data-gedreht")) === null, "nochmal antippen: zurückgedreht");
  await karte(page).locator("[data-drehen]").click();
  await page.waitForTimeout(700);
  await karte(page).locator("[data-mehr]").click();
  await page.waitForURL(/\/wundertuete$/, { timeout: 5000 });
  const groß = page.locator('[data-wt-karte="aw-001"]');
  await groß.waitFor({ timeout: 3000 });
  check(await groß.locator("[data-loesung]").getByText("30").isVisible(), "„Mehr ›“: Seite mit derselben Karte, Lösung schon offen");
  const chips = await page.locator("[data-filter]").evaluateAll((els) => els.map((e) => ({ t: e.textContent.trim(), ganz: e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= window.innerWidth })));
  check(chips.map((c) => c.t).join(" · ") === "Alles · Witze · Platt · Wissen" && chips.every((c) => c.ganz), `Filter ganz lesbar (${chips.map((c) => c.t).join(" · ")})`);
  await page.locator("[data-noch-eine]").click();
  await page.waitForTimeout(150);
  check((await page.locator("[data-verdeckt]").isVisible()) && !(await page.locator("[data-wt-karte] [data-loesung], [data-wt-karte] [data-pointe]").count()) && (await page.locator("[data-noch-eine]").getAttribute("data-hell")) !== null, "nach „Noch eine“: Lösung verdeckt, „Noch eine“ hell");
  await page.locator("[data-aufdecken]").click();
  check((await page.locator("[data-wt-karte] [data-loesung], [data-wt-karte] [data-pointe]").first().isVisible()) && (await page.locator("[data-noch-eine]").getAttribute("data-hell")) === null, "Karte antippen deckt auf, „Noch eine“ orange");
  check(await page.getByText("Nie doppelt.", { exact: false }).isVisible(), "„Nie doppelt. Mia legt immer neue nach.“");

  // „Noch eine ›“: 12× ohne Wiederholung; Filter
  const ids = ["aw-001", await page.locator("[data-wt-karte]").getAttribute("data-wt-karte")];
  for (let i = 0; i < 12; i++) {
    await page.locator("[data-noch-eine]").click();
    await page.waitForTimeout(120);
    ids.push(await page.locator("[data-wt-karte]").getAttribute("data-wt-karte"));
  }
  check(new Set(ids).size === ids.length, `„Noch eine“ 12×: nie doppelt (${ids.join(" ")})`);
  await page.locator('[data-filter="platt"]').click();
  await page.waitForTimeout(150);
  const plattSorten = [];
  for (let i = 0; i < 4; i++) {
    plattSorten.push(await page.locator("[data-wt-karte]").getAttribute("data-sorte"));
    await page.locator("[data-noch-eine]").click();
    await page.waitForTimeout(120);
  }
  check(plattSorten.every((s) => s === "platt"), `Filter Plattdeutsch: nur Platt (${plattSorten.join(" ")})`);
  await page.locator('[data-filter="witz"]').click();
  await page.waitForTimeout(150);
  const pointeVorher = await page.locator("[data-pointe]").count();
  await page.locator("[data-aufdecken]").click();
  check((await page.locator("[data-wt-karte]").getAttribute("data-sorte")) === "witz" && !pointeVorher && (await page.locator("[data-pointe]").isVisible()), "Filter Witze: Pointe erst nach Antippen");

  // Witze alle gesehen: Mia legt nach (Mock-KI); ohne Vorrat und ohne KI „Neue Witze kommen bald.“
  const witze = poolKarten().filter((x) => x.sorte === "witz").map((x) => x.id);
  await setzeStand(page, { version: 2, aktuell: null, gesehen: witze, eigene: [] });
  await page.reload();
  await page.locator('[data-filter="witz"]').click();
  await page.waitForFunction(() => (JSON.parse(localStorage.getItem("wasgibts.wundertuete") ?? "{}").eigene ?? []).length > 0, null, { timeout: 8000 }).catch(() => {});
  const ki = await store(page, "wasgibts.wundertuete");
  check((ki?.eigene ?? []).length >= 3 && ki.eigene.every((x) => x.sorte === "witz" && x.id.startsWith("ki-")), `Mia legt Witze nach (${(ki?.eigene ?? []).length}, nur Witze)`);
  await page.locator("[data-noch-eine]").click();
  await page.waitForTimeout(200);
  const neuerWitz = await page.locator("[data-wt-karte]").getAttribute("data-wt-karte").catch(() => null);
  check(Boolean(neuerWitz?.startsWith("ki-")), `„Noch eine“ bringt Mias neuen Witz (${neuerWitz})`);
  await setzeStand(page, { version: 2, aktuell: null, gesehen: [...witze, ...(ki?.eigene ?? []).map((x) => x.id)], eigene: ki?.eigene ?? [], ki: { tag, n: 6 } });
  await page.locator("[data-noch-eine]").click();
  await page.waitForTimeout(200);
  check(await page.locator("[data-kommt-bald]").getByText("Neue Witze kommen bald.").isVisible().catch(() => false), "ohne Vorrat und ohne KI: „Neue Witze kommen bald.“ statt Wiederholung");

  // Alles gesehen: Kachel „Neue Wundertüte kommt bald.“
  await page.goto(BASE);
  await setzeStand(page, { version: 2, aktuell: null, gesehen: poolKarten().map((x) => x.id), eigene: [], ki: { tag, n: 6 } });
  const bald = page.locator("[data-raster] [data-kommt-bald]");
  await bald.waitFor({ timeout: 4000 }).catch(() => {});
  check(await bald.getByText("Neue Wundertüte kommt bald.").isVisible().catch(() => false), "alles gesehen: Kachel „Neue Wundertüte kommt bald.“");
  await setzeStand(page, { version: 2, aktuell: { id, tag }, gesehen: [id], eigene: [] });

  // Rätsel-Fenster (Test-Öffner unter „Für Entwickler“)
  await page.goto(BASE + "/profil/admin");
  await page.getByRole("button", { name: "Rätsel-Fenster öffnen" }).click();
  const fenster = page.locator("[data-raetsel-fenster]");
  await fenster.waitFor({ timeout: 4000 });
  const r1 = await fenster.locator("[data-raetsel]").getAttribute("data-raetsel");
  check(await page.getByText("Kinder raten zuerst").isVisible(), "Rätsel: „Kinder raten zuerst“");
  check(!(await fenster.locator("[data-loesung]").count()) && (await fenster.locator("[data-verdeckt]").isVisible()) && (await page.locator("[data-noch-eins]").getAttribute("data-hell")) !== null, "Lösung erst nach Antippen (verdeckt, „Noch eins“ hell)");
  const groesse = await fenster.locator("[data-frage]").evaluate((el) => getComputedStyle(el).fontSize);
  check(groesse === "27px", `Frage 27 px (${groesse})`);
  await fenster.locator("[data-raetsel]").click();
  check((await fenster.locator("[data-loesung]").isVisible()) && (await page.locator("[data-noch-eins]").getAttribute("data-hell")) === null, "Antippen: Lösung im gestrichelten Kasten, „Noch eins“ orange");
  const rs = [r1];
  for (let i = 0; i < 8; i++) {
    await page.locator("[data-noch-eins]").click();
    await page.waitForTimeout(100);
    rs.push(await fenster.locator("[data-raetsel]").getAttribute("data-raetsel"));
  }
  check(new Set(rs).size === rs.length && !(await fenster.locator("[data-loesung]").count()), `„Noch eins“ 8×: nie doppelt, Lösung wieder zu (${rs.join(" ")})`);
  const rt = await store(page, "wasgibts.raetsel");
  check(rs.every((r) => rt?.gesehen?.includes(r)), "Rätsel als gesehen gemerkt");
  await page.keyboard.press("Escape");
  await setzeStand(page, { version: 1, aktuell: null, gesehen: raetselIds(), eigene: [], ki: { tag, n: 6 } }, "wasgibts.raetsel");
  await page.getByRole("button", { name: "Rätsel-Fenster öffnen" }).click();
  check(await page.locator("[data-raetsel-fenster] [data-kommt-bald]").getByText("Neue Rätsel kommen bald.").isVisible().catch(() => false), "ohne Vorrat und ohne KI: „Neue Rätsel kommen bald.“");
  await page.keyboard.press("Escape");

  // M = gleiche Karte, breiter
  await page.goto(BASE);
  await layout(page, [["wundertuete", "M"], ["termine", "M"]]);
  const breit = await info(page);
  const brett = await page.locator("[data-raster]").evaluate((el) => el.getBoundingClientRect().width);
  check(Math.abs(breit.w - brett) < 2 && !breit.over, "M: ganz breit, nichts quillt über");

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

/** Alle Karten der Wundertüte (aus den Paketen `content/wundertuete/paket-*.json`) */
function poolKarten() {
  const dir = new URL("../../content/wundertuete/", import.meta.url);
  return readdirSync(dir)
    .filter((f) => /^paket-\d{3}\.json$/.test(f))
    .sort()
    .flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")).eintraege);
}

/** Alle Rätsel-IDs (aus `content/raetsel/paket-*.json`) */
function raetselIds() {
  const dir = new URL("../../content/raetsel/", import.meta.url);
  return readdirSync(dir)
    .filter((f) => /^paket-\d{3}\.json$/.test(f))
    .flatMap((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")).eintraege.map((x) => x.id));
}

/** Mias Witze aus dem Testmodus (die längsten erlaubten Texte) – als eigene Karten */
function mockWitze() {
  const code = readFileSync(new URL("../../src/lib/wundertuete/kiKarte.ts", import.meta.url), "utf8");
  const teil = code.slice(code.indexOf("witz: [", code.indexOf("MOCK_KARTEN")));
  return [...teil.slice(0, teil.indexOf("],")).matchAll(/\{ vorne: "([^"]+)", hinten: "([^"]+)" \}/g)].map((m, i) => ({ id: `ki-mock-${i}`, sorte: "witz", vorne: m[1], hinten: m[2] }));
}

/** Jede Karte der Wundertüte auf der Kachel, in S und M, Vorder- und Rückseite (beide liegen in der Kachel, A-059): nichts abgeschnitten, nie „…“ (A-045), vorn die Frage möglichst in ≤ 2 Zeilen */
async function alleKarten(page, check, wo) {
  const karten = poolKarten();
  const eigene = mockWitze();
  check(karten.length >= 300, `${wo}: ${karten.length} Karten in den Paketen`);
  check(eigene.length === 6, `${wo}: ${eigene.length} Witze von Mia (Mock)`);
  await page.evaluate(() => localStorage.removeItem("wasgibts.beispiel"));
  const tag = await heute(page);
  for (const size of ["S", "M"]) {
    await layout(page, [["wundertuete", size]]);
    const funde = [];
    for (const id of [...karten.map((x) => x.id), ...eigene.map((x) => x.id)]) {
      await setzeStand(page, { version: 2, aktuell: { id, tag }, gesehen: [id], eigene });
      await page.locator(`${KACHEL}[data-karte="${id}"]`).waitFor({ timeout: 3000 });
      const vorne = await page.evaluate(abgeschnitteneTexte);
      funde.push(...vorne.map((f) => `${id}: ${f}`));
    }
    check(!funde.length, `${wo} · ${size}: alle ${karten.length + eigene.length} Karten ganz${funde.length ? ` – ${funde.slice(0, 12).join(" | ")}${funde.length > 12 ? ` (+${funde.length - 12})` : ""}` : ""}`);
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
