// Einkauf neu (Tafel 110/111): Seite „Einkauf“ wie die Kachel, Aussuchen
// (erst Laden, dann Sachen) und Einsprechen (Mia im Modus „Einkauf“).
import { BASE, FAKE_HOEREN, aussuchen, aussuchenTippen, hello, seedFamily, store } from "../lib.mjs";

const KEY = "wasgibts.einkaufsliste";

/** Familie + Meine Läden (Edeka, Rewe, Lidl, Rossmann) */
async function laeden(page) {
  await hello(page);
  await seedFamily(page);
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key) ?? "null") ?? { version: 6, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], shopRules: {}, learned: {}, learnAsked: [], alwaysList: [] };
    localStorage.setItem(key, JSON.stringify({ ...s, version: 6, myShops: ["Edeka", "Rewe", "Lidl", "Rossmann"], shopsAsked: true }));
  }, KEY);
}

// Seite „Einkauf“: zwei große Knöpfe, Karten auch mit 0, Menü „···“, keine alten Elemente; Kachel-Zeile = Laden-Seite
export const einkaufSeite = async (page, check) => {
  await laeden(page);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1000);
  check(await page.getByRole("heading", { name: "Einkauf", level: 1 }).isVisible(), "Titel „Einkauf“");
  const sprechen = page.locator("[data-einsprechen]");
  const suchen = page.locator("[data-aussuchen]");
  check((await sprechen.isVisible()) && (await suchen.isVisible()), "zwei große Knöpfe Einsprechen · Aussuchen");
  const a = await sprechen.boundingBox();
  const b = await suchen.boundingBox();
  check(a && b && Math.abs(a.y - b.y) < 2 && a.height >= 80, "nebeneinander, groß");
  for (const shop of ["Edeka", "Rewe", "Lidl", "Rossmann"]) check(/0/.test(await page.locator(`[data-laden-karte="${shop}"]`).innerText()), `Karte ${shop} auch mit 0`);
  check(!(await page.locator("[data-ohne-laden]").count()), "ohne Sachen kein „Noch ohne Laden“");
  for (const alt of ["[data-wochen-zeile]", "[data-laden-reihe]", "[data-einkaufsmodus]", "[data-grundsachen]"]) check(!(await page.locator(alt).count()), `kein ${alt}`);
  check(!(await page.getByRole("button", { name: "Etwas auf die Einkaufsliste setzen" }).count()), "kein ＋ im Kopf");
  await page.getByRole("button", { name: "Mehr" }).tap();
  const menue = page.getByRole("dialog", { name: "Einkauf" });
  for (const l of ["Zuletzt gekauft", "Stammliste", "Liste teilen", "Meine Läden bearbeiten"]) check(await menue.getByRole("button", { name: l }).isVisible(), `Menü: ${l}`);
  await menue.getByRole("button", { name: "Meine Läden bearbeiten" }).tap();
  check(await page.locator("[data-meine-laeden]").waitFor({ timeout: 3000 }).then(() => true, () => false), "„Meine Läden“ bearbeiten");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  // Karte = Laden-Seite, „Was noch bei Edeka?“ landet bei Edeka
  await page.locator('[data-laden-karte="Edeka"]').tap();
  await page.waitForURL(/\/einkaufsliste\/laden\?name=Edeka/, { timeout: 5000 }).catch(() => {});
  check(await page.locator("[data-laden-kopf]").isVisible(), "Karte öffnet die Laden-Seite (große Laden-Karte)");
  await page.locator("[data-was-noch]").fill("Quark");
  await page.locator("[data-was-noch]").press("Enter");
  await page.waitForTimeout(400);
  const s = await store(page, KEY);
  check(s.itemShops.quark === "Edeka" && Object.values(s.weeks).some((w) => w.manual.some((m) => m.name === "Quark")), "„Was noch bei Edeka?“ landet bei Edeka");
  // Kachel auf der Startseite (mit Sachen; leer steht dort ein freundlicher Satz): Laden-Zeile = Laden-Seite
  await page.goto(BASE + "/");
  await page.waitForTimeout(1000);
  await page.locator("[data-laden-zeile]").first().tap();
  await page.waitForURL(/\/einkaufsliste\/laden\?name=/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/einkaufsliste/laden?name=Edeka"), "Kachel-Zeile öffnet die Laden-Seite");
  check(await page.getByRole("checkbox", { name: "Quark abhaken" }).isVisible(), "Quark auf der Edeka-Seite");
};

// Aussuchen (Tafel 111): Laden oben, Antippen = sofort dort, Laden wechseln, Haken, Leiste unten, Abschnitte
export const aussuchenLaeden = async (page, check) => {
  await laeden(page);
  await aussuchen(page, "Rewe");
  const rewe = page.locator('[data-aussuchen-laden="Rewe"]');
  check((await rewe.getAttribute("aria-checked")) === "true", "Rewe aktiv");
  check((await page.locator("[data-aussuchen-oben] input").getAttribute("placeholder")) === "In Rewe suchen …", "„In Rewe suchen …“");
  check(await page.locator('[data-abschnitt="oft"]').getByText("Beliebt").isVisible(), "ohne Verlauf „Beliebt“");
  for (const n of ["Milch", "Butter", "Eier"]) await page.locator(`[data-abschnitt="oft"] [data-kachel="${n}"]`).tap();
  await page.waitForTimeout(300);
  check((await page.locator('[data-abschnitt="oft"] [data-kachel="Milch"]').getAttribute("data-laden")) === "Rewe", "Milch: Haken in Rewe-Farbe");
  check(/3/.test(await rewe.innerText()), "Rewe-Knopf zeigt 3");
  const leiste = page.locator("[data-aussuchen-leiste]");
  check(/Rewe 3/.test(await leiste.innerText()), "Leiste „Rewe 3“");
  // nochmal antippen = wieder raus
  await page.locator('[data-abschnitt="oft"] [data-kachel="Eier"]').tap();
  await page.waitForTimeout(300);
  check(!(await page.locator('[data-abschnitt="oft"] [data-kachel="Eier"]').getAttribute("data-drauf")), "Eier nochmal = raus");
  // Laden wechseln: Rossmann → Drogerie zuerst, Gewähltes aus Rewe bleibt sichtbar mit Ladennamen
  await page.locator('[data-aussuchen-laden="Rossmann"]').tap();
  await page.waitForTimeout(300);
  check((await page.locator("[data-abschnitt]").first().getAttribute("data-abschnitt")) === "oft", "Rossmann: zuerst „Beliebt“");
  check((await page.locator("[data-abschnitt]").nth(1).getAttribute("data-abschnitt")) === "drogerie", "dann Drogerie & Haushalt");
  check(await page.locator("[data-lebensmittel]").getByText("Lebensmittel bei Rossmann").isVisible(), "„Lebensmittel bei Rossmann ›“ eingeklappt");
  await page.locator('[data-abschnitt="oft"] [data-kachel="Klopapier"]').tap();
  await aussuchenTippen(page, "Windeln");
  await aussuchenTippen(page, "Milch");
  await page.waitForTimeout(300);
  check(/Rewe 1[\s\S]*Rossmann 3/.test(await leiste.innerText()), "Milch zieht um: Leiste „Rewe 1 · Rossmann 3“");
  check((await page.locator('[data-treffer], [data-abschnitt="oft"]').locator('[data-kachel="Klopapier"]').first().getAttribute("data-laden")) === "Rossmann", "Klopapier: Haken in Rossmann-Farbe");
  // Leiste bleibt beim Scrollen sichtbar, Suche klebt oben
  await page.mouse.wheel(0, 1600);
  await page.waitForTimeout(500);
  const box = await leiste.boundingBox();
  const vp = page.viewportSize();
  check(box && box.y + box.height <= vp.height && box.y > vp.height / 2, "Leiste unten bleibt sichtbar");
  const oben = await page.locator("[data-aussuchen-oben]").boundingBox();
  check(oben && oben.y >= 0 && oben.y < 200, "Suchfeld klebt oben");
  // Sprung per Chip
  await page.locator("[data-abschnitt-chips]").getByRole("button", { name: "Drogerie & Haushalt" }).tap();
  await page.waitForTimeout(900);
  check((await page.locator("[data-abschnitt-chips]").getByRole("button", { name: "Drogerie & Haushalt" }).getAttribute("aria-pressed")) === "true", "Chip springt und ist hervorgehoben");
  await leiste.getByRole("button", { name: "Fertig" }).tap();
  await page.waitForURL(/\/einkaufsliste$/, { timeout: 5000 }).catch(() => {});
  const s = await store(page, KEY);
  check(s.shopRules.klopapier === "Rossmann" && s.shopRules.milch === "Rossmann" && s.shopRules.butter === "Rewe", "jede Wahl als feste Regel gemerkt");
  check(/Butter/.test(await page.locator('[data-laden-karte="Rewe"]').innerText()), "Fertig: Butter auf der Rewe-Karte");
  // Halten = Menge
  await aussuchen(page, "Rewe");
  const butter = page.locator('[data-abschnitt="oft"] [data-kachel="Butter"]');
  const bb = await butter.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: Math.round(bb.x + bb.width / 2), y: Math.round(bb.y + bb.height / 2), id: 1 }] });
  await page.waitForTimeout(700);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
  const menge = page.getByRole("dialog", { name: "Wie viel?" });
  check(await menge.waitFor({ timeout: 3000 }).then(() => true, () => false), "Halten → „Wie viel?“");
  await menge.getByRole("button", { name: "Butter: mehr" }).tap();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check(/×2/.test(await butter.innerText()), "Kachel zeigt „×2“");
};

// Einsprechen: Mia hört zu (Modus „Einkauf“), Ignoriertes durchgestrichen, „Hab ich:“, × , Passt → Meldung
export const einsprechen = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await laeden(page);
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...s, itemShops: { ...s.itemShops, milch: "Edeka" } }));
  }, KEY);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1000);
  await page.locator("[data-einsprechen]").tap();
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 8000 }).catch(() => {});
  check(await page.evaluate(() => Boolean(window.__rec?.running)), "Mia hört gleich zu");
  check(await page.getByText("Zähl einfach auf.").isVisible(), "„Zähl einfach auf.“");
  check(await page.getByText("EINKAUF").first().isVisible(), "Bühnen-Kopf „EINKAUF“");
  await page.evaluate(() => window.__sag([["Äh Milch, M…, Sahne, nee keine Sahne, zwei Joghurt und Spinat", false]]));
  await page.waitForTimeout(200);
  check((await page.locator("[data-ignoriert]").count()) > 0, "Live-Blase: Ignoriertes durchgestrichen");
  await page.evaluate(() => window.__sag([["Äh Milch, M…, Sahne, nee keine Sahne, zwei Joghurt und Spinat", true]]));
  await page.evaluate(() => window.__ende());
  const karte = page.locator("[data-einsprechen-karte]");
  check(await karte.waitFor({ timeout: 10000 }).then(() => true, () => false), "„Hab ich:“-Karte");
  check(await karte.getByText("Hab ich: 3 Sachen").isVisible(), "„Hab ich: 3 Sachen“");
  check(!(await karte.locator('[data-sache="Sahne"]').count()), "Sahne korrigiert (nicht dabei)");
  check(await karte.getByText("2 Joghurt").isVisible(), "Menge „2 Joghurt“");
  await karte.locator('[data-sache="Spinat"]').tap();
  check(await karte.getByText("Hab ich: 2 Sachen").isVisible(), "× nimmt Spinat raus");
  await karte.locator("[data-passt]").tap();
  check(await page.getByText("2 drauf · 1 ohne Laden").waitFor({ timeout: 5000 }).then(() => true, () => false), "Meldung „2 drauf · 1 ohne Laden“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit Rückgängig");
  const names = Object.values((await store(page, KEY)).weeks).flatMap((w) => w.manual.map((m) => m.name));
  check(names.includes("Milch") && names.includes("Joghurt") && !names.includes("Spinat") && !names.includes("Sahne"), "Milch und Joghurt auf der Liste, Sahne/Spinat nicht");
  await page.waitForTimeout(600);
  check(/Milch/.test(await page.locator('[data-laden-karte="Edeka"]').innerText()), "Milch direkt bei Edeka (gemerkt)");
  check(await page.locator("[data-ohne-laden]").getByText("Joghurt").isVisible(), "Joghurt in „Noch ohne Laden“");
};

// Nachtrag A-018, Punkt 1: Laden ohne Einträge – „Für Edeka steht nichts
// drauf.“, „Oft bei Edeka“, Antippen landet direkt bei Edeka („Steht drin.“)
export const ladenLeer = async (page, check) => {
  await laeden(page);
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key));
    localStorage.setItem(key, JSON.stringify({ ...s, shopRules: { butter: "Edeka" }, learned: { quark: { shop: "Edeka", n: 2 } } }));
  }, KEY);
  await page.goto(BASE + "/einkaufsliste/laden?name=Edeka");
  const leer = page.locator("[data-laden-leer]");
  check(await leer.waitFor({ timeout: 5000 }).then(() => true, () => false), "leerer Laden zeigt einen Satz");
  check((await leer.innerText()).trim() === "Für Edeka steht nichts drauf.", "„Für Edeka steht nichts drauf.“");
  check(!(await page.getByText(/Antippen: Laden wählen|Abhaken im Laden/).count()), "kein „Antippen: Laden wählen. Abhaken im Laden.“");
  const oft = page.locator("[data-oft-bei]");
  check(await oft.getByRole("heading", { name: "Oft bei Edeka" }).isVisible(), "„Oft bei Edeka“");
  check((await oft.locator("[data-vorschlag]").count()) >= 2, "Vorschläge zum Antippen");
  const chip = await oft.locator('[data-vorschlag="Butter"]').boundingBox();
  check(chip && chip.height >= 44, `Tippfläche ≥ 44 px (${Math.round(chip?.height ?? 0)})`);
  await oft.locator('[data-vorschlag="Butter"]').tap();
  check(await page.getByText("Steht drin.").waitFor({ timeout: 3000 }).then(() => true, () => false), "kurz „Steht drin.“");
  check(!(await page.getByRole("dialog", { name: "Wo kaufst du das?" }).count()), "kein Laden-Wählen");
  check(await page.getByRole("checkbox", { name: "Butter abhaken" }).isVisible(), "Butter steht auf der Edeka-Seite");
  check(!(await page.locator("[data-laden-leer]").count()), "der Leer-Satz ist weg");
  const s = await store(page, KEY);
  check(s.shopRules.butter === "Edeka" && Object.values(s.weeks).some((w) => w.manual.some((m) => m.name === "Butter" && !m.done)), "Butter bei Edeka auf der Liste");
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(800);
  check(/Butter/.test(await page.locator('[data-laden-karte="Edeka"]').innerText()), "Edeka-Karte zeigt Butter");
};

// Nachtrag A-018, Punkt 2: Abhaken im Laden – Häkchen orange, 1 s stehen,
// nochmal tippen = doch nicht, dann „Schon im Wagen“ (zugeklappt, ohne Zahl),
// „Einkauf fertig“ → Im Haus, zurück zur Übersicht, Rückgängig
export const imWagen = async (page, check) => {
  await laeden(page);
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  for (const n of ["Milch", "Brot"]) {
    await page.locator("[data-was-noch]").fill(n);
    await page.locator("[data-was-noch]").press("Enter");
  }
  const hinweis = page.locator("[data-wagen-hinweis]");
  check(await hinweis.waitFor({ timeout: 3000 }).then(() => true, () => false), "einmal oben: „Abhaken, was im Wagen liegt.“");
  const milch = page.getByRole("checkbox", { name: /^Milch/ });
  await milch.tap();
  await page.waitForTimeout(300);
  check((await milch.getAttribute("aria-checked")) === "true" && (await page.getByRole("list", { name: "Rewe" }).getByText("Milch").isVisible()), "abgehakt: bleibt kurz oben stehen");
  const deko = await page.locator('[data-laden-zeile="Milch"] span').first().evaluate((el) => getComputedStyle(el).textDecorationLine);
  check(deko !== "line-through", "nicht durchgestrichen");
  await milch.tap();
  await page.waitForTimeout(1800);
  check((await milch.getAttribute("aria-checked")) === "false" && !(await page.locator("[data-wagen]").count()), "nochmal tippen = doch nicht (Rückgängig)");
  await milch.tap();
  await page.waitForTimeout(2100);
  const wagen = page.locator("[data-wagen]");
  check(await wagen.isVisible(), "nach 1 s gleitet Milch in „Schon im Wagen“");
  check((await wagen.innerText()).trim() === "Schon im Wagen", "zugeklappt, ohne Zahl");
  check(!(await hinweis.count()), "der Satz oben kommt nur einmal");
  await wagen.getByRole("button", { name: "Schon im Wagen" }).tap();
  check(await wagen.getByText("Milch").isVisible(), "antippen = aufklappen");
  await page.locator("[data-einkauf-fertig]").tap();
  check(await page.getByText("Fertig. Liegt jetzt bei Im Haus.").waitFor({ timeout: 4000 }).then(() => true, () => false), "„Fertig. Liegt jetzt bei Im Haus.“");
  await page.waitForURL(/\/einkaufsliste$/, { timeout: 5000 }).catch(() => {});
  check(/\/einkaufsliste$/.test(page.url()), "zurück zur Übersicht");
  const imHaus = async () => ((await store(page, "wasgibts.vorrat"))?.items ?? []).some((i) => i.name === "Milch" && !i.usedAt);
  check(await imHaus(), "Milch liegt bei Im Haus");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(300);
  check(!(await imHaus()), "Rückgängig: wieder raus aus Im Haus");
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  check(await page.locator("[data-wagen]").waitFor({ timeout: 4000 }).then(() => true, () => false), "Rückgängig: wieder im Wagen");
  await page.locator("[data-einkauf-fertig]").tap();
  await page.waitForURL(/\/einkaufsliste$/, { timeout: 5000 }).catch(() => {});
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  await page.getByRole("checkbox", { name: /^Brot/ }).waitFor({ timeout: 4000 });
  check(!(await page.locator("[data-wagen]").count()), "nach „Einkauf fertig“ ist der Wagen leer");
};

// Nachtrag A-018, Punkt 3: gleiche Sache im selben Laden = ein Eintrag –
// beim Hinzufügen und rückwirkend für ältere Listen (Speicher v6 → v7)
export const doppeltEins = async (page, check) => {
  await laeden(page);
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  for (const n of ["Zucchini", "zucchinis"]) {
    await page.locator("[data-was-noch]").fill(n);
    await page.locator("[data-was-noch]").press("Enter");
    await page.waitForTimeout(200);
  }
  check((await page.locator("[data-laden-zeile]").count()) === 1, "„Zucchini“ zweimal = ein Eintrag");
  // Älterer Stand mit Doppelten (v6): beim Laden zusammengefasst, Mengen addiert
  await page.evaluate((key) => {
    const s = JSON.parse(localStorage.getItem(key));
    const [week] = Object.keys(s.weeks);
    const w = s.weeks[week];
    w.manual = [{ id: "a1", name: "Zucchini", amount: "2", section: "obst-gemuese", done: false }, { id: "b2", name: "Zucchini", amount: "1", section: "obst-gemuese", done: false }];
    localStorage.setItem(key, JSON.stringify({ ...s, version: 6 }));
  }, KEY);
  await page.reload();
  const zeile = page.locator('[data-laden-zeile="Zucchini"]');
  await zeile.first().waitFor({ timeout: 5000 });
  check((await zeile.count()) === 1 && /3/.test(await zeile.innerText()), "alte Liste: Zucchini 2 + 1 = eine Zeile „3“");
  const s = await store(page, KEY);
  check(s.version === 7 && Object.values(s.weeks).every((w) => w.manual.filter((m) => m.name === "Zucchini").length === 1), "Speicher v7, ein Eintrag (nichts verloren)");
};
