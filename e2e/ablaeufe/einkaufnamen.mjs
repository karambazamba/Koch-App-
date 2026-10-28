// A-040 „Einkaufsliste nur mit Namen“ (Tafel 127) und A-041 „Abhaken wie
// Aufgaben, Mia merkt sich den Laden“ (Tafel 128), Mi 21.10.: Wochenplan als
// Angebot oben auf der Laden-Seite („Alle dazu“ → „Steht drauf.“, Liste nur
// mit Namen, Zeile antippen = Fenster mit „wofür“), Abhaken merkt den Laden
// („Oft bei Rewe“, einmal „Merk ich mir, wenn du bei Rewe abhakst.“), Mia
// legt Tomaten gleich bei Rewe an („Rewe · wie immer ⌄“, antippen = anderer
// Laden, gemerkt), Einstellungen → „Was ich mir gemerkt hab“ mit Löschen und
// die Tipps beim ersten Mal (je Stelle einmal, „Alles klar“, zurückholen).
import { BASE, hello, miaTippen, seedFamily, store } from "../lib.mjs";
import { RECIPE_DATA } from "./essen.mjs";

const KEY = "wasgibts.einkaufsliste";
const PLAN = { version: 3, weeks: { "2026-10-19": { Mittwoch: { kind: "recipe", recipeId: "sp", title: "Spaghetti Bolognese", category: "fleisch" } } } };
const sichtbar = (l, timeout = 5000) => l.waitFor({ timeout }).then(() => true, () => false);

/** Familie mit Plan (Spaghetti am Mi), Meine Läden Rewe und Edeka, neuer Speicher (v8: Wochenplan = Angebot) */
async function familie(page, extra = {}) {
  await hello(page);
  await seedFamily(page, {
    ...RECIPE_DATA,
    "wasgibts.wochenplan": PLAN,
    [KEY]: { version: 8, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], myShops: ["Rewe", "Edeka"], shopsAsked: true, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "", ...extra },
  });
}

/** Mias Tipps beim ersten Mal wieder offen (der Testhaushalt kennt sonst alle Seiten) */
async function tippsOffen(page) {
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("wasgibts.miadenkt"));
    d.besucht = d.besucht.filter((s) => s !== "seite:einkaufsliste" && s !== "seite:einkauf-laden");
    localStorage.setItem("wasgibts.miadenkt", JSON.stringify(d));
  });
}

// Tafel 127: Angebot oben, „Alle dazu“, Liste nur mit Namen, Zeile antippen = Fenster
export const wochenplanAngebot = async (page, check) => {
  await familie(page);
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  const angebot = page.locator("[data-wochenplan-angebot]");
  check(await sichtbar(angebot), "oben „Für deinen Wochenplan“");
  check(/Spaghetti Bolognese · Mi/.test(await angebot.innerText()), "Kopf „Spaghetti Bolognese · Mi“");
  for (const n of ["Spaghetti", "Hackfleisch"]) check(await angebot.locator(`[data-angebot="${n}"]`).isVisible(), `Chip ${n}`);
  check(!(await page.locator("[data-laden-zeile]").count()), "nicht von selbst auf der Liste");
  const chip = await angebot.locator('[data-angebot="Spaghetti"]').boundingBox();
  check(chip && chip.height >= 44, `Chip ≥ 44 px (${Math.round(chip?.height ?? 0)})`);
  await angebot.locator("[data-alle-dazu]").tap();
  check(await sichtbar(page.getByText("Steht drauf.", { exact: true }), 3000), "„Steht drauf.“");
  check(!(await page.locator("[data-wochenplan-angebot]").count()), "das Angebot ist weg");
  const zeile = page.locator('[data-laden-zeile="Spaghetti"]');
  check(await sichtbar(zeile), "Spaghetti steht ganz normal auf der Liste");
  const text = (await zeile.innerText()).replace(/\s+/g, " ").trim();
  check(text === "Spaghetti", `nur der Name, ohne Gramm und ohne „für …“ (${text})`);
  const s = await store(page, KEY);
  check(Object.values(s.weeks).some((w) => w.manual.some((m) => m.name === "Spaghetti" && m.amount === "" && m.rezeptMenge === "500 g")), "gespeichert ohne Menge, Rezeptmenge als Hinweis");
  // Zeile antippen = Fenster mit wofür, Menge, Laden, „Von der Liste nehmen“
  await zeile.getByRole("button", { name: "Spaghetti öffnen" }).tap();
  const fenster = page.getByRole("dialog", { name: "Spaghetti" });
  check(await sichtbar(fenster, 3000), "Fenster „Spaghetti“");
  check(/für Spaghetti Bolognese · Mi/.test(await fenster.innerText()), "erst hier: „für Spaghetti Bolognese · Mi“");
  check((await fenster.locator("[data-menge]").getAttribute("placeholder")) === "z. B. 1 Packung", "Menge „z. B. 1 Packung“");
  await fenster.locator("[data-laden-aendern]").tap();
  check(await fenster.getByRole("radio", { name: "Edeka" }).isVisible(), "Laden ändern ⌄");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await page.locator('[data-laden-zeile="Hackfleisch"]').getByRole("button", { name: "Hackfleisch öffnen" }).tap();
  await page.getByRole("dialog", { name: "Hackfleisch" }).locator("[data-von-der-liste]").tap();
  check(await sichtbar(page.getByText("Hackfleisch gelöscht"), 3000), "„Von der Liste nehmen“ mit Rückgängig");
};

// Tafel 128: Abhaken merkt den Laden, „Oft bei Rewe“, Mia legt „wie immer“ an, Korrektur, Einstellungen
export const ladenMerken = async (page, check) => {
  // Tomaten stehen schon bei Rewe (gewählt, keine feste Regel)
  await familie(page, { itemShops: { tomaten: "Rewe" }, weeks: { "2026-10-19": { manual: [{ id: "t", name: "Tomaten", amount: "", section: "obst-gemuese", done: false }], checked: [], have: [] } } });
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  const merken = page.locator("[data-merken-hinweis]");
  check(await sichtbar(merken, 3000), "einmal klein: „Merk ich mir, wenn du bei Rewe abhakst.“");
  check((await merken.innerText()).trim() === "Merk ich mir, wenn du bei Rewe abhakst.", "Text des Hinweises");
  await page.getByRole("checkbox", { name: "Tomaten abhaken" }).tap();
  await page.waitForTimeout(2100);
  const s = await store(page, KEY);
  check(s.learned.tomaten?.shop === "Rewe" && s.learned.tomaten?.am === "2026-10-21", "gemerkt: Tomaten → Rewe, mit Datum");
  check(!(await merken.count()), "der Hinweis kommt nur einmal");
  const oft = page.locator("[data-oft-bei]");
  check(await oft.getByRole("heading", { name: "Oft bei Rewe" }).isVisible(), "„Oft bei Rewe“");
  check(await oft.locator('[data-vorschlag="Tomaten"]').isVisible(), "„Oft bei Rewe“ lernt mit: Tomaten");
  // „Einkauf fertig“ schließt ab wie bisher
  await page.locator("[data-einkauf-fertig]").tap();
  await page.waitForURL(/\/einkaufsliste$/, { timeout: 5000 }).catch(() => {});
  // Mia: „Tomaten auf die Liste“ landet direkt bei Rewe („Rewe · wie immer ⌄“)
  const box = await miaTippen(page);
  await box.fill("Tomaten auf die Liste");
  await box.press("Enter");
  const karte = page.locator('[data-ergebnis="einkauf"]').last();
  check(await sichtbar(karte, 10000), "Ergebnis-Karte Tomaten");
  await page.waitForTimeout(900);
  const laden = karte.locator("[data-ergebnis-laden]");
  check(/Rewe · wie immer/.test(await laden.innerText()), `„Rewe · wie immer ⌄“ (${(await laden.innerText()).replace(/\s+/g, " ")})`);
  check(await karte.locator("[data-laden-gewaehlt-hinweis]").isVisible(), "einmal: „Hab Rewe genommen, wie letztes Mal.“");
  await laden.getByRole("button", { name: /Laden: Rewe · wie immer/ }).tap();
  await laden.getByRole("button", { name: "Edeka" }).tap();
  await page.waitForTimeout(300);
  check((await store(page, KEY)).learned.tomaten?.shop === "Edeka", "anderer Laden wird gemerkt (nächstes Mal Edeka)");
  // Einstellungen → Mia → „Was ich mir gemerkt hab“: „Tomaten → Edeka“ mit Löschen
  await page.goto(BASE + "/profil/mia-merkt");
  const gruppe = page.getByRole("region", { name: "Wo du was kaufst" });
  check(await sichtbar(gruppe), "eigene Gruppe „Wo du was kaufst“");
  check(await gruppe.getByText("Tomaten → Edeka").isVisible(), "„Tomaten → Edeka“");
  await gruppe.getByRole("button", { name: "Tomaten → Edeka vergessen" }).tap();
  await page.waitForTimeout(300);
  check(!(await store(page, KEY)).learned.tomaten, "Löschen wirkt");
};

// Die Einkaufsliste stellt sich beim ersten Mal vor (Liste und Laden-Seite je einmal, zurückholen)
export const einkaufTipps = async (page, check) => {
  await familie(page);
  await tippsOffen(page);
  await page.goto(BASE + "/einkaufsliste");
  const tipp = page.locator('[data-tipp="seite:einkaufsliste"]');
  check(await sichtbar(tipp), "Einkaufsliste: Mias Tipp oben");
  const text = await tipp.innerText();
  for (const z of ["Ich merk mir, wo du was kaufst.", "Sag einfach ‚Tomaten auf die Liste‘, den Laden such ich aus.", "Abgehakt ist weg. Fürs Rezept leg ich dir Zutaten oben hin."]) check(text.includes(z), `„${z}“`);
  await tipp.getByRole("button", { name: "Alles klar" }).tap();
  await page.waitForTimeout(1100);
  check(!(await tipp.count()), "„Alles klar“ schließt");
  await page.locator('[data-laden-karte="Rewe"]').tap();
  await page.waitForURL(/\/einkaufsliste\/laden\?name=Rewe/, { timeout: 5000 }).catch(() => {});
  const laden = page.locator('[data-tipp="seite:einkauf-laden"]');
  check(await sichtbar(laden), "Laden-Seite: einmal der Tipp");
  check(/Abhaken, was im Wagen liegt\. Ich merk mir das für Rewe\./.test(await laden.innerText()), "„… Ich merk mir das für Rewe.“");
  await laden.getByRole("button", { name: "Alles klar" }).tap();
  await page.waitForTimeout(1100);
  // nicht je Laden: Edeka zeigt ihn nicht mehr, die Liste auch nicht
  await page.goto(BASE + "/einkaufsliste/laden?name=Edeka");
  await page.waitForTimeout(1000);
  check(!(await page.locator('[data-tipp="seite:einkauf-laden"]').count()), "bei Edeka kein zweites Mal");
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1000);
  check(!(await page.locator('[data-tipp="seite:einkaufsliste"]').count()), "die Liste nie wieder");
  // Zurückholen: Einstellungen → Mia → „Tipps nochmal zeigen“
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.getByRole("button", { name: /Tipps nochmal zeigen/ }).tap();
  check(await sichtbar(page.getByText("Kommen beim nächsten Mal wieder."), 3000), "„Kommen beim nächsten Mal wieder.“");
  await page.goto(BASE + "/einkaufsliste");
  check(await sichtbar(page.locator('[data-tipp="seite:einkaufsliste"]')), "der Tipp ist wieder da");
};
