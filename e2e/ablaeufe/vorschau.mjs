// Vorschläge erst anschauen, dann nehmen (A-038, Tafel 122). Bühne: „Was
// anderes?“ → drei Vorschläge, einmal „Antippen zum Reinschauen.“ → Karte
// antippen = Vorschau (Bild, Zeit, Personen, Zutaten, Kurz | Ausführlich,
// unten „Zurück zu den Ideen“ und „Nehmen“) → Zurück (Knopf und Geste) =
// dieselben drei Vorschläge, gleiche Scrollposition → „Nehmen“ aus der
// Vorschau trägt ein und setzt Fehlendes auf die Liste. Essen: Tag-Fenster
// eines freien Tages, Idee antippen → Vorschau → Zurück → „Nehmen“.
// Zeit: Mi 21.10. 10:30.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const PASTA = "Pasta mit Tomaten & Burrata";
const center = (page) => page.getByRole("region", { name: /^Essen/ }).evaluate((el) => el.scrollIntoView({ block: "center" }));
const titelVon = (rows) => rows.evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? "").replace(/^Vorschlag: /, "")));

export const vorschauBuehne = async (page, check) => {
  await hello(page);
  const plan = { version: 3, weeks: { "2026-10-19": { Mittwoch: { kind: "text", title: PASTA, category: "vegetarisch" } } } };
  await seedFamily(page, { "wasgibts.wochenplan": plan });
  await page.evaluate(() => localStorage.setItem("wasgibts.kochtipp", JSON.stringify({ version: 1, days: ["2026-10-19", "2026-10-20", "2026-10-21"], unlocked: false, popped: true, last: null, shown: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  await center(page);
  await page.getByRole("button", { name: "Was anderes kochen? Mia schlägt Alternativen vor" }).click();
  const stage = page.getByRole("dialog").last();
  await stage.getByText("Oder worauf hast du Lust?").waitFor({ timeout: 5000 });
  const rows = stage.getByRole("article", { name: /^Vorschlag:/ });
  const vorher = await titelVon(rows);
  check(vorher.length === 3, `drei Vorschläge (${vorher.join(" | ")})`);
  check((await stage.getByText("Antippen zum Reinschauen.").count()) === 1, "einmal „Antippen zum Reinschauen.“ unter der ersten Karte");

  // Karte antippen → Vorschau über der Bühne
  const gespraech = stage.locator("[data-gespraech]");
  const scrollVorher = await gespraech.evaluate((el) => el.scrollTop);
  await rows.first().locator("[data-vorschau-oeffnen]").click();
  const vorschau = page.getByRole("dialog", { name: vorher[0] });
  check(await vorschau.waitFor({ timeout: 4000 }).then(() => true, () => false), "Karte antippen öffnet die Vorschau");
  check(await vorschau.locator(`[data-vorschau="${vorher[0]}"]`).isVisible(), "Vorschau mit Bild und Name");
  check(/\d+ Min · für \d/.test(await vorschau.locator("[data-vorschau] > p").first().innerText()), "Zeit und Personen");
  check(/alles im Haus|auf die Liste: |vermutlich im Haus/.test(await vorschau.innerText()), "„alles im Haus“ bzw. „auf die Liste: …“");
  check(await vorschau.getByRole("region", { name: "Zutaten" }).isVisible(), "Zutaten");
  check(await vorschau.getByRole("radio", { name: "Kurz" }).isVisible() && (await vorschau.getByRole("radio", { name: "Ausführlich" }).count()) === 1, "So geht’s mit Kurz | Ausführlich");
  check(!(await vorschau.locator("[data-zutat][role=checkbox]").count()), "nur zum Lesen: keine Kästchen");
  check(await vorschau.getByRole("button", { name: "Nehmen" }).isVisible() && (await vorschau.getByRole("button", { name: "Zurück zu den Ideen" }).isVisible()), "unten „Nehmen“ und „Zurück zu den Ideen“");

  // „Zurück zu den Ideen“ → dieselben drei, gleiche Scrollposition
  await vorschau.getByRole("button", { name: "Zurück zu den Ideen" }).click();
  await page.waitForTimeout(700);
  check(!(await page.getByRole("dialog", { name: vorher[0] }).count()), "Vorschau zu");
  check(JSON.stringify(await titelVon(rows)) === JSON.stringify(vorher), "Zurück: dieselben drei Vorschläge");
  check(Math.abs((await gespraech.evaluate((el) => el.scrollTop)) - scrollVorher) <= 2, "Scrollposition gleich");

  // Zurück-Geste (Verlauf) schließt nur die Vorschau
  await rows.nth(1).locator("[data-vorschau-oeffnen]").click();
  await page.getByRole("dialog", { name: vorher[1] }).waitFor({ timeout: 4000 });
  await page.evaluate(() => history.back());
  await page.waitForTimeout(800);
  check(!(await page.getByRole("dialog", { name: vorher[1] }).count()) && (await stage.isVisible()), "Zurück schließt nur die Vorschau, die Bühne bleibt");
  check(JSON.stringify(await titelVon(rows)) === JSON.stringify(vorher), "wieder dieselben drei, nichts neu geladen");

  // „Nehmen“ aus der Vorschau = „Nehmen“ auf der Karte
  const zeile = await rows.nth(2).innerText();
  const liste = zeile.match(/auf die Liste: (.+)/)?.[1]?.replace(/ …$/, "").split(", ")[0] ?? null;
  await rows.nth(2).locator("[data-vorschau-oeffnen]").click();
  const dritte = page.getByRole("dialog", { name: vorher[2] });
  await dritte.waitFor({ timeout: 4000 });
  await dritte.getByRole("button", { name: "Nehmen" }).click();
  check(await page.getByText(/^Eingetragen\./).waitFor({ timeout: 3000 }).then(() => true, () => false), "„Eingetragen. …“ wie auf der Karte");
  await page.waitForTimeout(600);
  const after = await store(page, "wasgibts.wochenplan");
  check(Object.values(after?.weeks ?? {}).some((w) => w?.Mittwoch?.title === vorher[2]), `für heute eingetragen (${vorher[2]})`);
  if (liste) {
    const einkauf = JSON.stringify((await store(page, "wasgibts.einkaufsliste")) ?? {});
    check(einkauf.includes(liste), `Zutaten auf der Liste (${liste})`);
  }
  await center(page);
  check(await page.getByRole("region", { name: /^Essen/ }).getByText(vorher[2]).isVisible(), "Essen-Kachel zeigt das Gericht");

  // Hinweis nie wieder
  await page.reload();
  await page.waitForTimeout(900);
  await center(page);
  await page.getByRole("button", { name: /^(Was anderes kochen\?|Kochidee –)/ }).click();
  await page.getByRole("dialog").last().getByText("Oder worauf hast du Lust?").waitFor({ timeout: 5000 });
  check(!(await page.getByText("Antippen zum Reinschauen.").count()), "Hinweis danach nie wieder");
};

export const vorschauEssen = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.wochenplan": { version: 3, weeks: {} } });
  await page.goto(BASE + "/?seite=essen");
  await page.waitForTimeout(1300);
  const karte = page.locator("[role=tabpanel]:not([inert]) [data-wochenkarte]");
  await karte.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await karte.locator("[data-sieben-liste] > li").first().getByRole("button").first().tap();
  const fenster = page.getByRole("dialog", { name: "Heute · Mi 21." });
  check(await fenster.waitFor({ timeout: 4000 }).then(() => true, () => false), "freier Tag öffnet sein Fenster");
  const rows = fenster.getByRole("article", { name: /^Vorschlag:/ });
  const vorher = await titelVon(rows);
  check(vorher.length === 3, `drei Ideen (${vorher.join(" | ")})`);
  await rows.first().locator("[data-vorschau-oeffnen]").tap();
  const vorschau = page.getByRole("dialog", { name: vorher[0] });
  check(await vorschau.waitFor({ timeout: 4000 }).then(() => true, () => false), "Idee antippen öffnet die Vorschau");
  check(await vorschau.getByRole("region", { name: "So geht’s" }).isVisible(), "Rezept zum Reinschauen");
  await vorschau.getByRole("button", { name: "Zurück zu den Ideen" }).tap();
  await page.waitForTimeout(700);
  check(await fenster.isVisible() && JSON.stringify(await titelVon(rows)) === JSON.stringify(vorher), "Zurück: Tag-Fenster mit denselben Ideen");
  await rows.first().locator("[data-vorschau-oeffnen]").tap();
  await vorschau.waitFor({ timeout: 4000 });
  await vorschau.getByRole("button", { name: "Nehmen" }).tap();
  await page.waitForTimeout(800);
  const plan = await store(page, "wasgibts.wochenplan");
  check(Object.values(plan?.weeks ?? {}).some((w) => w?.Mittwoch?.title === vorher[0]), `„Nehmen“ trägt für heute ein (${vorher[0]})`);
};
