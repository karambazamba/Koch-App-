// Pinnwand als Kühlschranktür (Tafel 106/107) mit echten Touch-Gesten: Kachel
// „Fächer“ so hoch wie Wetter, ＋ → „Neuer Zettel“ (Text direkt auf dem
// Zettel, Return = neue Zeile) → „Anpinnen“ → „Angepinnt · Rückgängig“, der
// neue Zettel liegt vorn im Fächer; Tipp auf den Zettel = Pinnwand mit ihm
// hervorgehoben; Wischen über der Kachel wechselt die Seite. Seite: Tür mit
// zwei Spalten, Antippen bzw. lange drücken = Menü (Erledigt, Antworten, In
// Notizen, Anheften, Löschen nur eigene), ❤️ → „❤️ Lisa“, Haken-Kreis =
// erledigt (blass, „erledigt von dir“), „Antworten“ = „Antwort an …“.
import { BASE, hello, seedFamily, swipe } from "../lib.mjs";

async function hold(page, x, y, ms = 650) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: Math.round(x), y: Math.round(y), id: 1 }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Der Zettel an der Tür (Knopf über dem ganzen Papier) */
const zettel = (page, text) => page.getByRole("button", { name: new RegExp(`^Zettel von .*: ${text}`) }).filter({ visible: true }).first();
const menu = (page) => page.getByRole("dialog", { name: "Reagieren" });

export const pinnwandGesten = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Kachel: Fächer, gleich hoch wie Wetter, ＋ oben rechts, kein roter Punkt
  const tile = page.getByRole("region", { name: "Pinnwand" });
  await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const t = await tile.boundingBox();
  const w = await page.locator('a[href^="/wetter"]').first().boundingBox();
  check(Math.abs(t.height - w.height) <= 2, `Kachel so hoch wie Wetter (${Math.round(t.height)} / ${Math.round(w.height)} px)`);
  check(await tile.locator(".zettel").first().isVisible(), "Kachel zeigt echte kleine Zettel");
  check(!(await tile.getByLabel("Neue Nachricht").count()), "kein roter Punkt");

  // ＋ → „Neuer Zettel“: Text direkt auf dem Zettel, Return = neue Zeile, „Anpinnen“
  await tile.getByRole("button", { name: "Neuer Zettel" }).click();
  const sheet = page.getByRole("dialog", { name: "Neuer Zettel" });
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), "＋ → „Neuer Zettel“");
  const box = sheet.getByRole("textbox", { name: "Text auf dem Zettel" });
  await box.waitFor();
  await page.keyboard.type("Ich bin um 6");
  await page.keyboard.press("Enter");
  await page.keyboard.type("zurück");
  check((await box.inputValue()) === "Ich bin um 6\nzurück" && (await sheet.isVisible()), "Return = neue Zeile, Fenster bleibt");
  check((await sheet.getByRole("radio", { checked: true }).count()) === 2, "Art „Zettel“ und eigene Farbe vorgewählt");
  check(!(await sheet.getByText("📌").count()), "„Anheften“ ohne Emoji");
  await sheet.getByRole("button", { name: "Anpinnen" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Angepinnt").isVisible(), "„Angepinnt“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit „Rückgängig“");
  const front = tile.getByRole("link", { name: /Ich bin um 6/ }).first();
  check(await front.isVisible(), "neuer Zettel vorn im Fächer");

  // Wischen über der Kachel wechselt weiter die Seite
  const t2 = await tile.boundingBox();
  await swipe(page, { x: t2.x + t2.width * 0.8, y: t2.y + 60, dx: -t2.width * 0.7 });
  await page.waitForTimeout(900);
  check((await page.getByRole("tab", { name: "Essen", selected: true }).count()) > 0, "Wischen über der Kachel → Essen");

  // Fächer: der ganze Fächer ist EIN Link; ein Tipp auf den sichtbaren Rand des hinteren
  // Zettels öffnet die Pinnwand an genau diesem Zettel (der oberste sichtbare bekommt den Tipp)
  await page.goto(BASE + "/");
  await page.waitForTimeout(900);
  await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const fan = tile.getByRole("link", { name: /^Ich bin um 6/ });
  const ids = await fan.locator("[data-zettel]").evaluateAll((els) => els.map((el) => el.dataset.zettel));
  const fb = await fan.boundingBox();
  const backBox = await fan.locator("[data-zettel]").first().boundingBox();
  check(ids.length >= 2 && (await fan.locator("a, button").count()) === 0, `Fächer: EIN Link, Zettel ohne eigene Knöpfe (${ids.length})`);
  await swipe(page, { x: fb.x + fb.width * 0.07, y: backBox.y + backBox.height / 2, dx: 0, dy: 0, ms: 60, steps: 1 });
  await page.waitForURL(/\/pinnwand/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes(`n=${ids[0]}`), "Tipp auf den hinteren Zettel → Pinnwand an diesem Zettel");

  // Pinnwand-Seite: Tür mit zwei Spalten
  await page.goto(BASE + "/pinnwand");
  await page.waitForTimeout(900);
  check(await page.getByRole("region", { name: "Kühlschranktür" }).isVisible(), "Tür sichtbar");
  const own = zettel(page, "Ich bin um 6");
  const other = zettel(page, "Bin um 20 Uhr da");
  check((await own.isVisible()) && (await other.isVisible()), "eigener und fremder Zettel an der Tür");

  // fremder Zettel antippen → Menü ohne Löschen; ❤️ → „❤️ Lisa“
  await other.click();
  check(await menu(page).waitFor({ timeout: 3000 }).then(() => true, () => false), "Antippen → Menü");
  for (const m of ["Erledigt", "Antworten", "In Notizen", "Anheften"]) check(await menu(page).getByRole("menuitem", { name: m }).isVisible(), `Menü „${m}“`);
  check(!(await menu(page).getByRole("menuitem", { name: "Löschen" }).count()), "fremd: kein „Löschen“");
  await menu(page).getByRole("button", { name: "Mit ❤️ reagieren" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("❤️ Lisa").first().isVisible(), "„❤️ Lisa“ unter dem Zettel");

  // lange drücken (Touch) → Menü → „Antworten“ = „Antwort an …“
  const b = await other.boundingBox();
  await hold(page, b.x + b.width / 2, b.y + 20);
  check(await menu(page).waitFor({ timeout: 3000 }).then(() => true, () => false), "lange drücken → Menü");
  await menu(page).getByRole("menuitem", { name: "Antworten" }).click();
  check(await page.getByRole("dialog", { name: /^Antwort an / }).waitFor({ timeout: 4000 }).then(() => true, () => false), "„Antworten“ → neuer Zettel mit Bezug");
  await page.getByRole("dialog", { name: /^Antwort an / }).getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);

  // Haken-Kreis: erledigt (blass, „erledigt von dir“), bleibt an der Tür
  await page.locator("[id^='n-']", { has: other }).getByRole("button", { name: "Erledigt" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("erledigt von dir").first().isVisible(), "Haken → „erledigt von dir“, Zettel bleibt (blass)");

  // eigener Zettel → Menü → Löschen → „Gelöscht · Rückgängig“
  await own.click();
  await menu(page).getByRole("menuitem", { name: "Löschen" }).click();
  await page.waitForTimeout(400);
  check(!(await zettel(page, "Ich bin um 6").count()), "eigener Zettel gelöscht (nur von Hand)");
  check(await page.getByText("Gelöscht").isVisible(), "„Gelöscht · Rückgängig“");
};
