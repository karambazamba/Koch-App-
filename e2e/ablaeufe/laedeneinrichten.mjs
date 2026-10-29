// A-067 (Tafel 151): Läden einrichten in 3 Schritten, danach legt Mia jede
// Sache in den richtigen Laden. Obst bei Wochenmarkt + Rewe (Nachtrag):
// steht in beiden Läden („auch Markt“), Abhaken in einem = überall erledigt.
// Laden-Seite sortiert wie im Laden, Reiter für die anderen Läden.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const KEY = "wasgibts.einkaufsliste";
const sichtbar = (l, timeout = 5000) => l.waitFor({ timeout }).then(() => true, () => false);

/** Familie, noch nicht eingerichtet, drei Sachen ohne Laden (diese und nächste Woche, die Seite zeigt eine davon) */
async function familie(page) {
  await hello(page);
  await seedFamily(page);
  await page.evaluate((key) => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const next = new Date(d);
    next.setDate(d.getDate() + 7);
    const manual = ["Milch", "Zahnpasta", "Äpfel"].map((name, i) => ({ id: `e${i}`, name, amount: "", section: "sonstiges", done: false }));
    const woche = { manual, checked: [], have: [] };
    localStorage.setItem(key, JSON.stringify({ version: 8, weeks: { [iso(d)]: woche, [iso(next)]: woche }, products: {}, shops: [], itemShops: {}, staples: [], myShops: [], shopsAsked: false, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "" }));
  }, KEY);
}

export const laedenEinrichten = async (page, check) => {
  await familie(page);
  await page.goto(BASE + "/einkaufsliste");
  const schritt = page.locator("[data-einrichten]");
  check(await sichtbar(page.getByRole("heading", { name: "Wo kaufst du ein?" })), "Schritt 1 „Wo kaufst du ein?“");
  check(await page.getByRole("button", { name: "Schließen" }).isVisible() && (await page.locator("[data-einrichten-spaeter]").isVisible()), "oben ✕ und „Später“");
  // Mia-Satz im Feld: „Rewe, dm und Wochenmarkt“
  await page.locator("[data-eigener-laden]").fill("Rewe, dm und Wochenmarkt");
  await schritt.getByRole("button", { name: "Dazu", exact: true }).tap();
  for (const l of ["Rewe", "dm", "Wochenmarkt"]) check((await schritt.getByRole("button", { name: l, exact: true }).getAttribute("aria-pressed")) === "true", `${l} gewählt (aus dem Satz)`);
  check((await page.locator("[data-einrichten-weiter]").innerText()).includes("Weiter · 3 Läden"), "„Weiter · 3 Läden“");
  await page.locator("[data-einrichten-weiter]").tap();
  // Schritt 2: Vorschläge, Obst auf zwei Läden
  check(await sichtbar(page.getByRole("heading", { name: "Was holst du wo?" })), "Schritt 2 „Was holst du wo?“");
  check(/Rewe/.test(await page.locator('[data-sorte-laden="haupt"]').innerText()), "Das meiste bei Rewe");
  check(/dm/.test(await page.locator('[data-sorte-laden="drogerie"]').innerText()), "Drogerie → dm");
  check(/Wochenmarkt/.test(await page.locator('[data-sorte-laden="obst"]').innerText()), "Obst → Wochenmarkt");
  await page.locator('[data-sorte-laden="obst"]').tap();
  await page.locator('[data-sorte="obst"]').getByRole("button", { name: "Rewe", exact: true }).tap();
  check((await page.locator('[data-sorte-laden="obst"]').innerText()).includes("Wochenmarkt + Rewe"), "Obst → „Wochenmarkt + Rewe“");
  // Satz: „Getränke kaufe ich bei Edeka“ legt Edeka an
  await page.locator("[data-was-wo-satz]").fill("Getränke kaufe ich bei Edeka");
  await page.locator("[data-was-wo-satz]").press("Enter");
  check((await page.locator('[data-sorte-laden="getraenke"]').innerText()).includes("Edeka"), "Satz: Getränke → Edeka");
  await page.locator("[data-einrichten-speichern]").tap();
  // Schritt 3
  check(await sichtbar(page.getByRole("heading", { name: "Fertig!" })), "Schritt 3 „Fertig!“");
  check(await page.getByText("3 Sachen sind schon einsortiert.").isVisible(), "„3 Sachen sind schon einsortiert.“");
  check((await page.locator('[data-beispiel="Zahnpasta"]').innerText()).includes("dm"), "Beispiel: Zahnpasta → dm");
  check((await page.locator('[data-beispiel="Äpfel"]').innerText()).includes("Wochenmarkt + Rewe"), "Beispiel: Äpfel → Wochenmarkt + Rewe");
  check(await page.getByText("lernt dazu: Holst du etwas zweimal woanders, fragt sie einmal kurz nach.").isVisible(), "„Mia lernt dazu …“");
  await page.locator("[data-einrichten-fertig]").tap();
  await page.waitForTimeout(500);
  const s = await store(page, KEY);
  check(s.ladenPlan?.haupt === "Rewe" && JSON.stringify(s.ladenPlan.regeln.obst) === '["Wochenmarkt","Rewe"]', "Plan gespeichert");
  check(!(await page.locator("[data-ohne-laden]").count()), "kein „Noch ohne Laden“ mehr");
  const rewe = await page.locator('[data-laden-karte="Rewe"]').innerText();
  check(/Milch/.test(rewe) && /Äpfel/.test(rewe), "Rewe: Milch und Äpfel");
  check(/Äpfel/.test(await page.locator('[data-laden-karte="Wochenmarkt"]').innerText()), "Wochenmarkt: Äpfel (auch)");
  // Laden-Seite Rewe: sortiert wie im Laden, „auch Markt“, Reiter
  await page.goto(BASE + "/einkaufsliste/laden?name=Rewe");
  check(await sichtbar(page.getByText("2 Sachen · sortiert wie im Laden")), "„2 Sachen · sortiert wie im Laden“");
  const gruppen = await page.locator("[data-sorten-gruppe]").evaluateAll((els) => els.map((e) => e.getAttribute("data-sorten-gruppe")));
  check(JSON.stringify(gruppen) === '["obst","milch"]', `Obst & Gemüse zuerst (${gruppen.join(", ")})`);
  check((await page.locator('[data-laden-zeile="Äpfel"] [data-auch]').innerText()) === "auch Markt", "„auch Markt“");
  check(/dm\s*1/.test(await page.locator('[data-reiter="dm"]').innerText()), "Reiter „dm 1“");
  // Abhaken bei Rewe = auch auf dem Markt erledigt
  await page.getByRole("checkbox", { name: "Äpfel abhaken" }).tap();
  await page.waitForTimeout(2200);
  await page.locator('[data-reiter="Wochenmarkt"]').tap();
  await page.waitForURL(/name=Wochenmarkt/, { timeout: 5000 }).catch(() => {});
  check(await sichtbar(page.locator("[data-laden-kopf]")), "Wochenmarkt-Seite");
  check(!(await page.getByRole("checkbox", { name: "Äpfel abhaken" }).count()), "Äpfel auch auf dem Markt erledigt");
  // „···“ → „Meine Läden & was wo“ = Schritt 2
  await page.goto(BASE + "/einkaufsliste");
  await page.getByRole("button", { name: "Mehr" }).tap();
  await page.getByRole("dialog", { name: "Einkauf" }).getByRole("button", { name: "Meine Läden & was wo" }).tap();
  check(await sichtbar(page.locator("[data-was-wo]")), "„Meine Läden & was wo“ zeigt Schritt 2");
};

export const laedenEinrichtenSpaeter = async (page, check) => {
  await familie(page);
  await page.goto(BASE + "/einkaufsliste");
  check(await sichtbar(page.locator("[data-einrichten]")), "Einrichtung beim ersten Öffnen");
  await page.getByRole("button", { name: "Schließen" }).tap();
  await page.waitForTimeout(400);
  check(await page.locator("[data-ohne-laden]").isVisible(), "✕: Liste wie bisher, „Noch ohne Laden“");
  check(await page.locator("[data-einrichten-link]").isVisible(), "„Einmal sagen, was du wo holst ›“");
  await page.reload();
  await page.waitForTimeout(1100);
  check(!(await page.locator("[data-einrichten]").count()), "nicht wieder von selbst");
  await page.locator("[data-einrichten-link]").tap();
  await page.waitForURL(/einrichten/, { timeout: 5000 }).catch(() => {});
  check(await sichtbar(page.getByRole("heading", { name: "Wo kaufst du ein?" })), "über den Link wieder da");
};
