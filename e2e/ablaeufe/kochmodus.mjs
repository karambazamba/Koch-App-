// Essen-Kachel „Rezept“ und Kochmodus (Tafel 122): „Rezept“ öffnet das
// richtige Rezept (auch Wochenkarten-Gericht ohne recipeId), eigener Eintrag
// ohne Rezept = Fenster „Mia schreibt dir ein Rezept dazu“, „Wochenplan“ →
// „Die nächsten 7 Tage“. Kochmodus: Timer läuft beim Blättern weiter, ✕ merkt
// den Schritt (Kachel „Weiter kochen · Schritt 2 von 3“), „Gegessen“ setzt
// die Kachel um. Rezeptseite: Kurz | Ausführlich gemerkt, Timer-Chip,
// Schritt durchstreichen. (Mi 21.10.2026, 10:30)
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const WOCHE = "2026-10-19";
const plan = (title) => ({ "wasgibts.wochenplan": { version: 3, weeks: { [WOCHE]: { Mittwoch: { kind: "text", title, category: "fleisch" } } } } });
const BOLO = "/kochbuch/kochen?id=" + encodeURIComponent("k:bolognese");
const sichtbar = (loc, ms = 4000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function mitPlan(page, title, path = "/") {
  await hello(page);
  await seedFamily(page, plan(title));
  await page.goto(BASE + path);
  await page.waitForTimeout(1200);
}

const kachel = (page) => page.locator("[role=tabpanel]:not([inert]) [data-essen-kachel]").first();

export const essenKachelRezept = async (page, check) => {
  await mitPlan(page, "Spaghetti Bolognese");
  const tile = kachel(page);
  check(await tile.locator("[data-titel]").innerText().then((t) => t.includes("Spaghetti") && !t.includes("…")), "Name ganz zu sehen");
  const [rezept, woche] = [tile.locator("[data-rezept]"), tile.locator("[data-woche]")];
  const a = await rezept.boundingBox();
  const b = await woche.boundingBox();
  check(a && b && a.height >= 44 && b.height >= 44 && Math.abs(a.width - b.width) < 2 && a.x + a.width <= b.x, "zwei gleich breite Knöpfe ≥ 44 px, nicht überlappend");
  await rezept.tap();
  await page.waitForURL(/\/kochbuch\/rezept\?id=k%3Abolognese/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("k%3Abolognese"), "„Rezept“ öffnet das eingebaute Rezept zum Wochenkarten-Gericht");
  check(/Heute · .* · für 3/i.test(await page.locator("[data-rezept-kopf]").innerText()), "„HEUTE · 18:30 · FÜR 3“ (Haushalt)");
  check(await page.locator("[data-los]").isVisible(), "„Los, Schritt für Schritt“");
};

export const essenKachelOhneRezept = async (page, check) => {
  await mitPlan(page, "Omas Spezialeintopf");
  await kachel(page).locator("[data-rezept]").tap();
  const sheet = page.locator("[data-ohne-rezept]");
  check(await sichtbar(sheet), "ohne Rezept: kurzes Fenster statt Fehler");
  check(await sheet.getByText(/schreibt dir ein Rezept dazu/).isVisible(), "„Mia schreibt dir ein Rezept dazu“");
  check(await sheet.getByRole("button", { name: "Ja, gern" }).isVisible(), "„Ja, gern“");
};

export const essenKachelWochenplan = async (page, check) => {
  await mitPlan(page, "Spaghetti Bolognese");
  await kachel(page).locator("[data-woche]").tap();
  const karte = page.locator("[role=tabpanel]:not([inert]) [data-wochenkarte]");
  check(await sichtbar(karte), "„Wochenplan“ öffnet „Die nächsten 7 Tage“");
  await page.waitForTimeout(900);
  const box = await karte.boundingBox();
  check(box && box.y < page.viewportSize().height, "„Die nächsten 7 Tage“ im Blick");
};

export const kochmodusTimerUndSchritt = async (page, check) => {
  await mitPlan(page, "Spaghetti Bolognese", BOLO);
  check(await sichtbar(page.locator("[data-kochmodus]")), "Kochmodus (dunkel)");
  check(!(await page.locator("[data-leiste]").count()), "ohne Leiste");
  await page.locator("[data-koch-weiter]").tap();
  await page.locator("[data-koch-weiter]").tap();
  check((await page.locator("[data-koch-schritt]").innerText()) === "Schritt 2 von 3", "„Schritt 2 von 3“");
  await page.locator("[data-koch-timer]").tap();
  await page.waitForTimeout(400);
  check((await store(page, "wasgibts.timer"))?.timers?.length === 1, "„Timer 20 Min“ startet den Timer");
  // Wischen nach links = weiter
  const main = await page.locator("[data-kochmodus] main").boundingBox();
  await page.mouse.move(main.x + main.width * 0.8, main.y + 80);
  await page.mouse.down();
  await page.mouse.move(main.x + main.width * 0.2, main.y + 85, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check((await page.locator("[data-koch-schritt]").innerText()) === "Schritt 3 von 3", "Wischen blättert weiter");
  check(await page.locator("[data-timer-leiste]").isVisible(), "Timer läuft beim Blättern weiter");
  await page.locator("[data-kochmodus] button", { hasText: "Zurück" }).tap();
  await page.locator("[data-koch-ende]").tap();
  await page.waitForURL(/\/kochbuch\/rezept/, { timeout: 5000 }).catch(() => {});
  check((await store(page, "wasgibts.kochen"))?.at?.["k:bolognese"] === 2, "✕ beendet ohne Nachfrage und merkt den Schritt");
  check((await store(page, "wasgibts.timer"))?.timers?.length === 1, "Timer läuft nach dem Verlassen weiter");
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
  const tile = kachel(page);
  check(await tile.locator("[data-weiter-kochen]").isVisible(), "Kachel: „Weiter kochen“");
  check((await tile.locator("[data-unterzeile]").innerText()) === "Schritt 2 von 3", "Kachel: „Schritt 2 von 3“");
  await tile.locator("[data-weiter-kochen]").tap();
  check(await sichtbar(page.locator("[data-kochmodus]")), "„Weiter kochen“ öffnet den Kochmodus");
  check((await page.locator("[data-koch-schritt]").innerText()) === "Schritt 2 von 3", "steigt beim gemerkten Schritt ein");
};

export const kochmodusGegessen = async (page, check) => {
  await mitPlan(page, "Spaghetti Bolognese", BOLO);
  for (let i = 0; i < 3; i++) await page.locator("[data-koch-weiter]").tap();
  const fertig = page.locator("[data-koch-fertig]");
  check((await fertig.innerText()).trim() === "Gegessen", "letzter Schritt: „Gegessen“");
  await fertig.tap();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(Boolean((await store(page, "wasgibts.gekocht"))?.days?.["2026-10-21"]), "für heute erledigt");
  check(await page.getByText(/schmecken\./).first().isVisible(), "nur ein kurzer Satz von Mia");
  const tile = kachel(page);
  check(!(await tile.locator("[data-weiter-kochen]").count()), "Kachel nicht mehr „Weiter kochen“");
  check(/morgen/i.test((await tile.getAttribute("aria-label")) ?? "") || (await tile.locator("[data-vorschlag]").count()) > 0, "Kachel zeigt morgen bzw. den Vorschlag");
};

export const rezeptSchnellanleitung = async (page, check) => {
  await mitPlan(page, "Spaghetti Bolognese", "/kochbuch/rezept?id=" + encodeURIComponent("k:bolognese"));
  const so = page.locator("[data-so-gehts]");
  check((await so.getAttribute("data-so-gehts")) === "kurz", "Standard beim ersten Mal: Kurz");
  check((await so.locator("[data-schritt]").count()) === 3, "alle Schritte sichtbar, kein „+ weitere“");
  await so.locator("[data-timer-chip]").first().tap();
  await page.waitForTimeout(400);
  check((await store(page, "wasgibts.timer"))?.timers?.length === 1, "Timer-Chip startet den Timer");
  check(await sichtbar(page.locator("[data-timer-leiste]")), "oben die Leiste „7:42 · …“");
  const erster = so.locator("[data-schritt] [role=checkbox]").first();
  await erster.tap();
  check((await erster.getAttribute("aria-checked")) === "true", "Schritt antippen = durchgestrichen");
  await so.getByRole("radio", { name: "Ausführlich" }).tap();
  check((await so.getAttribute("data-so-gehts")) === "lang", "Ausführlich");
  await page.reload();
  await page.waitForTimeout(1200);
  check((await page.locator("[data-so-gehts]").getAttribute("data-so-gehts")) === "lang", "Wahl wird gemerkt");
  check((await page.locator("[data-so-gehts] [data-schritt] [role=checkbox]").first().getAttribute("aria-checked")) === "true", "Durchgestrichenes bleibt (heute)");
  const zutat = page.locator("[data-zutat]").first();
  await zutat.tap();
  check((await zutat.getAttribute("aria-checked")) === "true", "Zutat abhaken");
  check(await page.locator("[data-gegessen]").isVisible(), "„Gegessen“ am Ende der Liste");
};
