// Essen, Rezept, Einkauf, Im Haus
import { BASE, FAKE_HOEREN, aussuchen, hello, seedFamily, store } from "../lib.mjs";

const RECIPE = { id: "sp", title: "Spaghetti Bolognese", category: "fleisch", servings: 4, prepMinutes: 30, ingredients: [{ id: "a", amount: 500, unit: "g", name: "Spaghetti" }, { id: "b", amount: 400, unit: "g", name: "Hackfleisch" }], steps: ["Zwiebeln schneiden.", "Anbraten.", "Köcheln lassen."], note: "", source: "eigenes", ai: null, favorite: true, thumbsUp: 0, thumbsDown: 0, cookedCount: 3, lastCookedAt: null, known: true, createdAt: "2026-10-01", updatedAt: "2026-10-01" };
export const RECIPE_DATA = { "wasgibts.kochbuch": { version: 2, recipes: { sp: RECIPE } } };
const extra = RECIPE_DATA;

const family = async (page, path) => {
  await hello(page);
  await seedFamily(page, extra);
  await page.goto(BASE + path);
  await page.waitForTimeout(1100);
};

export const essen = async (page, check) => {
  await family(page, "/?seite=essen");
  const panel = page.locator("[role=tabpanel]:not([inert])");
  check(await panel.getByRole("heading", { name: "Die nächsten 7 Tage" }).isVisible(), "„Die nächsten 7 Tage“");
  check(await panel.getByRole("region", { name: "Im Haus" }).getByRole("button", { name: /^Joghurt/ }).isVisible(), "„Im Haus“ mit Joghurt");
  check(!(await panel.getByRole("region", { name: "Spontan kochen" }).count()), "kein eigener Bereich „Spontan kochen“ mehr");
};

export const rezept = async (page, check) => {
  await family(page, "/kochbuch/rezept?id=sp");
  check(await page.getByRole("heading", { name: "Spaghetti Bolognese" }).isVisible(), "Rezeptseite mit Titel");
  check(await page.getByText("Hackfleisch").first().isVisible(), "Zutaten");
};

// Einkauf (Einkauf neu): aussuchen → Laden-Karte → Laden-Seite: Kreis = gekauft,
// „Zuletzt gekauft“ im „···“, lange drücken = „Wo kaufst du das?“ → Ändern
export const einkauf = async (page, check) => {
  await family(page, "/einkaufsliste");
  await page.locator("[data-laden-frage]").getByRole("button", { name: "Rewe" }).tap();
  await page.locator("[data-laden-frage]").getByRole("button", { name: "Fertig" }).tap();
  await aussuchen(page, "Rewe");
  for (const n of ["Milch", "Brot", "Bananen"]) await page.locator(`[data-abschnitt="oft"] [data-kachel="${n}"]`).tap();
  check(/Rewe 3/.test(await page.locator("[data-aussuchen-leiste]").innerText()), "Aussuchen: „Rewe 3“");
  await page.locator("[data-aussuchen-leiste]").getByRole("button", { name: "Fertig" }).tap();
  await page.waitForURL(/\/einkaufsliste$/, { timeout: 5000 }).catch(() => {});
  await page.locator('[data-laden-karte="Rewe"]').tap();
  await page.waitForURL(/\/einkaufsliste\/laden/, { timeout: 5000 }).catch(() => {});
  const milch = page.getByRole("checkbox", { name: "Milch abhaken" });
  check((await milch.isVisible()) && (await page.getByRole("checkbox", { name: "Bananen abhaken" }).isVisible()), "Milch und Bananen auf der Rewe-Seite");
  const done = async () => Object.values((await store(page, "wasgibts.einkaufsliste")).weeks).some((w) => w.manual.some((m) => m.name === "Milch" && m.done));
  await milch.tap();
  await page.waitForTimeout(2600);
  check(await done(), "Kreis hakt ab");
  check(await page.getByRole("region", { name: "Im Korb" }).getByText("Milch").isVisible(), "abgehakt → „Im Korb“");
  // Lange drücken = „Wo kaufst du das?“ (anderer Laden, Ändern, Löschen)
  const brot = page.locator('[data-laden-zeile="Brot"]');
  const box = await brot.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  const wo = page.getByRole("dialog", { name: "Wo kaufst du das?" });
  check(await wo.waitFor({ timeout: 3000 }).then(() => true, () => false), "lange drücken → „Wo kaufst du das?“");
  await wo.getByRole("button", { name: "Ändern" }).tap();
  check(await page.getByRole("dialog", { name: "Artikel bearbeiten" }).waitFor({ timeout: 3000 }).then(() => true, () => false), "„Ändern“ → „Artikel bearbeiten“");
  // „Zuletzt gekauft“ steckt im „···“
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Mehr" }).tap();
  await page.getByRole("dialog", { name: "Einkauf" }).getByRole("button", { name: "Zuletzt gekauft" }).tap();
  check(await page.locator("[data-zuletzt-gekauft]").getByText("Milch").waitFor({ timeout: 3000 }).then(() => true, () => false), "„···“ → „Zuletzt gekauft“ mit Milch");
};

// „Im Haus“ (Tafel 102): Chips in Gruppen, oranger Punkt = bald; Brot auf der
// Laden-Seite abhaken (Kreis) → steht unter „Brot“ → Chip = Fenster →
// „Aufgebraucht“ → Zeile „Aufgebraucht: Brot“ → „Auf die Liste“; „Was koch
// ich daraus?“ schwebt über der Leiste und öffnet Spontan kochen.
export const imHaus = async (page, check) => {
  await family(page, "/vorrat");
  check(await page.getByRole("heading", { name: "Im Haus", level: 1 }).isVisible(), "Seite heißt „Im Haus“");
  check(await page.getByRole("region", { name: "Was ist da?" }).getByRole("button", { name: "Reinsprechen" }).isVisible(), "„Was ist da?“ mit rundem Knopf");
  check(await page.locator('[data-sache="Joghurt"] [data-bald]').isVisible(), "Joghurt mit orangem Punkt (bald aufbrauchen)");
  check((await page.locator("[data-legende]").count()) === 1, "Legende einmal");
  check(!(await page.getByText(/500 g|2 Stück/).count()), "keine Mengen");
  // „Was koch ich daraus?“ liegt über der Leiste
  const koch = await page.locator("[data-was-koch-ich]").boundingBox();
  const leiste = await page.locator("[data-leiste]").boundingBox();
  check(koch && leiste && koch.y + koch.height <= leiste.y + 1, `„Was koch ich daraus?“ über der Leiste (${Math.round(koch?.y + koch?.height)} ≤ ${Math.round(leiste?.y)})`);
  // Laden-Seite: „Was noch bei Rewe?“ → Brot, Kreis = gekauft → kommt ins Haus
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  await page.locator("[data-was-noch]").fill("Brot");
  await page.locator("[data-was-noch]").press("Enter");
  await page.getByRole("checkbox", { name: "Brot abhaken" }).tap();
  check(await page.getByText("Im Haus: Brot").waitFor({ timeout: 5000 }).then(() => true, () => false), "Meldung „Im Haus: Brot“");
  await page.goto(BASE + "/vorrat");
  const brot = page.getByRole("region", { name: "Brot" }).getByRole("button", { name: "Brot", exact: true });
  check(await brot.waitFor({ timeout: 5000 }).then(() => true, () => false), "Brot steht unter „Brot“");
  await brot.tap();
  const fenster = page.getByRole("dialog", { name: "Brot" });
  check(await fenster.getByRole("radiogroup", { name: "Gruppe" }).isVisible(), "Fenster: Gruppe ändern");
  await fenster.getByRole("button", { name: "Aufgebraucht" }).tap();
  const zeile = page.locator("[data-aufgebraucht]");
  check(await zeile.getByText("Aufgebraucht: Brot").waitFor({ timeout: 5000 }).then(() => true, () => false), "Zeile „Aufgebraucht: Brot“");
  await zeile.getByRole("button", { name: "Auf die Liste" }).tap();
  check(await page.getByText("Brot steht auf der Liste").waitFor({ timeout: 4000 }).then(() => true, () => false), "„Auf die Liste“ meldet sich");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(Object.values(list.weeks).some((w) => w.manual.some((m) => m.name === "Brot" && !m.done)), "Brot steht wieder im Einkauf");
  await page.getByRole("button", { name: "Was koch ich daraus?" }).tap();
  check(await page.getByRole("dialog").last().getByText(/^Noch da:/).waitFor({ timeout: 5000 }).then(() => true, () => false), "„Was koch ich daraus?“ öffnet Spontan kochen");
};

// „Was ist da?“ reinsprechen (Tafel 102): ein Satz, rein und raus →
// „Hab ich so verstanden:“ → „Passt“; „gar nicht im Haus“ wird nie zur Sache.
export const imHausReinsprechen = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await family(page, "/vorrat");
  await page.locator("[data-reinsprechen]").tap();
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 8000 }).catch(() => {});
  check(await page.evaluate(() => Boolean(window.__rec?.running)), "Mia hört gleich zu");
  await page.evaluate(() => window.__sag([["Milch ist da, Joghurt gar nicht im Haus", true]]));
  await page.evaluate(() => window.__ende());
  const karte = page.locator("[data-im-haus-karte]");
  check(await karte.waitFor({ timeout: 8000 }).then(() => true, () => false), "„Hab ich so verstanden:“");
  check(await karte.locator('[data-zeile="rein"]').getByText("Milch").isVisible(), "+ Milch");
  check(await karte.locator('[data-zeile="raus"]').getByText("Joghurt").isVisible(), "− Joghurt");
  check(await karte.locator("[data-auf-die-liste]").isVisible(), "bei − „auf die Liste“");
  check(!(await karte.getByText(/im Haus/i).count()), "kein Satzteil als Sache");
  await karte.getByRole("button", { name: "Passt" }).tap();
  await page.waitForTimeout(1500);
  const v = await store(page, "wasgibts.vorrat");
  check(v.items.some((i) => i.name === "Milch" && !i.usedAt), "Milch ist im Haus");
  check(v.items.some((i) => i.name === "Joghurt" && i.usedAt), "Joghurt ist raus");
  check(!v.items.some((i) => /haus/i.test(i.name)), "nie „Gar nicht im Haus“ als Sache");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(Object.values(list.weeks).some((w) => w.manual.some((m) => m.name === "Joghurt")), "Joghurt steht auf der Liste");
};

// Kurz-Check „Im Haus“ (Tafel 102): alle Sachen als Kacheln, antippen = weg
// (durchgestrichen), „Fertig · 2 weg“ = aufgebraucht, Woche erledigt.
export const kuehlcheck = async (page, check) => {
  await family(page, "/vorrat/check");
  check(await page.getByRole("heading", { name: "Kurz-Check", level: 1 }).isVisible(), "Seite heißt „Kurz-Check“");
  const tiles = page.locator("[data-kuehlcheck] button");
  check((await tiles.count()) >= 2, `Sachen als Kacheln (${await tiles.count()})`);
  check(await page.getByRole("button", { name: "Fertig", exact: true }).isVisible(), "„Fertig“ ohne Zahl");
  const names = [];
  for (const i of [0, 1]) {
    const label = await tiles.nth(i).getAttribute("aria-label");
    names.push(label.replace(/ ist weg$/, ""));
    await tiles.nth(i).tap();
  }
  check((await tiles.nth(0).getAttribute("aria-pressed")) === "true", "angetippt = weg");
  const fertig = page.getByRole("button", { name: "Fertig · 2 weg" });
  check(await fertig.isVisible(), "Knopf „Fertig · 2 weg“");
  check(await page.getByRole("button", { name: "Heute nicht" }).isVisible(), "„Heute nicht“");
  await fertig.tap();
  await page.waitForTimeout(600);
  const vorrat = await store(page, "wasgibts.vorrat");
  const weg = vorrat.items.filter((p) => p.usedAt).map((p) => p.name);
  check(names.every((n) => weg.includes(n)) && weg.length === 2, `genau die zwei sind aufgebraucht (${weg.join(", ")})`);
  const erledigt = await store(page, "wasgibts.kuehlcheck");
  check(Boolean(erledigt?.woche), "Woche erledigt");
};

// Essen-Seite: EIN Bereich „Im Haus“ (gehört zu 1.0). Mia stellt ihn beim
// ersten Besuch vor; Chips (bald aufbrauchen zuerst, leicht orange), Chip
// antippen = Sache öffnen; ＋ = mehrere auf einmal („Eier, Milch, Hack“);
// „Was koch ich daraus?“ = Spontan kochen mit genau diesen Sachen.
export const imHausEssen = async (page, check) => {
  await family(page, "/?seite=essen");
  // Die Vorstellung „Im Haus“ stand noch nie (die Test-Familie hat alle anderen Seiten schon gesehen)
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("wasgibts.miadenkt"));
    d.besucht = d.besucht.filter((s) => s !== "seite:essen-imhaus");
    localStorage.setItem("wasgibts.miadenkt", JSON.stringify(d));
  });
  await page.reload();
  await page.waitForTimeout(1200);
  const panel = page.locator("[role=tabpanel]:not([inert])");
  const besuch = page.locator('[data-tipp="seite:essen-imhaus"]');
  check(await besuch.getByText("Sag mir, was im Kühlschrank ist. Dann koch ich spontan was mit dir.").isVisible(), "Mia stellt „Im Haus“ beim ersten Besuch vor");
  // Tafel 101: direkt unter dem Titel „Essen“ im Seitenfluss, nicht schwebend
  const lage = await besuch.evaluate((el) => {
    const h1 = el.closest("[role=tabpanel]").querySelector("h1").getBoundingClientRect();
    const naechstes = el.nextElementSibling?.getBoundingClientRect();
    return { fixed: getComputedStyle(el).position === "fixed", unterTitel: el.getBoundingClientRect().top >= h1.bottom - 1, ueberInhalt: !naechstes || el.getBoundingClientRect().bottom <= naechstes.top + 1, direkt: el.previousElementSibling?.tagName === "H1" };
  });
  check(!lage.fixed && lage.unterTitel && lage.ueberInhalt && lage.direkt, `Tipp unter dem Titel, über dem Inhalt (${JSON.stringify(lage)})`);
  await besuch.getByRole("button", { name: "Alles klar" }).tap();
  const bereich = panel.getByRole("region", { name: "Im Haus" });
  await bereich.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const chips = bereich.locator("div.flex-wrap > button");
  check((await chips.first().getAttribute("aria-label")) === "Joghurt, bald aufbrauchen", "„bald aufbrauchen“ zuerst (Joghurt)");
  check((await chips.count()) <= 8, `höchstens 8 Chips (${await chips.count()})`);
  check(await bereich.getByRole("link", { name: "Alle" }).isVisible(), "„Alle ›“ zur Seite „Im Haus“");

  // Chip antippen = Sache öffnen
  await chips.first().tap();
  const sache = page.getByRole("dialog", { name: "Joghurt" });
  check(await sache.waitFor({ timeout: 5000 }).then(() => true, () => false), "Chip → Fenster „Joghurt“");
  check(await sache.getByRole("button", { name: "Aufgebraucht" }).isVisible(), "„Aufgebraucht“");
  await sache.getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);

  // ＋ = mehrere auf einmal
  await bereich.getByRole("button", { name: "Ins Haus eintragen" }).tap();
  const quick = page.getByRole("dialog", { name: "Schnelleingabe" });
  await quick.waitFor({ timeout: 5000 });
  await quick.getByRole("textbox", { name: "Im Haus" }).fill("Eier, Milch, Hack");
  await quick.getByRole("textbox", { name: "Im Haus" }).press("Enter");
  check(await page.getByText("Im Haus: Eier, Milch, Hack").waitFor({ timeout: 5000 }).then(() => true, () => false), "„Im Haus: Eier, Milch, Hack“");
  await quick.getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);
  for (const name of ["Eier", "Milch", "Hack"]) check(await bereich.getByRole("button", { name, exact: true }).isVisible(), `Chip ${name}`);

  // „Was koch ich daraus?“ = Spontan kochen mit diesen Sachen
  await bereich.getByRole("button", { name: "Was koch ich daraus?" }).tap();
  const noch = page.getByRole("dialog").last().getByText(/^Noch da:/);
  check(await noch.waitFor({ timeout: 5000 }).then(() => true, () => false), "Spontan kochen öffnet");
  check(/^Noch da: Joghurt/.test(await noch.innerText()), "dieselbe Reihe wie die Chips (Joghurt zuerst)");
};

// Rezept-Link an Mia (Teilen-Menü): Karte mit Zutaten → „auf die Liste“
export const rezeptLink = async (page, check) => {
  await family(page, "/?geteilt=1&title=Suppe&url=" + encodeURIComponent("https://rezept.test/kuerbissuppe"));
  const card = page.locator("[data-rezept-link]");
  check(await card.waitFor({ timeout: 10000 }).then(() => true, () => false), "Karte zum Rezept-Link");
  check(await card.getByText("Kürbissuppe mit Ingwer").isVisible(), "Titel aus der Seite");
  check(await card.getByRole("link", { name: /rezept\.test/ }).isVisible(), "Quelle verlinkt");
  check(await card.getByText(/^auf die Liste: /).isVisible(), "„auf die Liste: …“");
  await card.getByRole("button", { name: /auf die Liste$/ }).click();
  check(await card.getByText("Steht auf der Liste.").isVisible(), "„Steht auf der Liste.“");
  const list = await store(page, "wasgibts.einkaufsliste");
  check(Object.values(list.weeks).some((w) => w.manual.some((m) => m.name === "Hokkaido-Kürbis" && m.dish === "Kürbissuppe mit Ingwer")), "Kürbis mit Gericht auf der Liste");
  check(!page.url().includes("geteilt"), "Adresse aufgeräumt");
};
