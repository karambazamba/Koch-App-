// Pinnwand (Tafel 69–71) mit echten Touch-Gesten: Kachel klein (gleich hoch
// wie Wetter, ＋ und Mikro ≥ 44 px auseinander), ＋ → Schnelleingabe
// „NACHRICHT AN ALLE“ → ➤ = angepinnt; Seite: eigene nach links weg (Gelöscht · Rückgängig),
// fremde federt zurück, rechts wischen = Antwort, lange drücken → ❤️ →
// „❤️ Lisa“ unter der Nachricht; Wischen über der Kachel wechselt die Seite.
import { BASE, hello, schnell, seedFamily, swipe } from "../lib.mjs";

async function hold(page, x, y, ms = 650) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: Math.round(x), y: Math.round(y), id: 1 }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

const row = (page, text) => page.getByRole("group", { name: new RegExp(`^${text}`) });

export const pinnwandGesten = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Kachel: klein, gleich hoch wie Wetter, ＋ oben und Mikro unten getrennt
  const tile = page.getByRole("region", { name: "Pinnwand" });
  await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const t = await tile.boundingBox();
  const w = await page.locator('a[href^="/wetter"]').first().boundingBox();
  check(Math.abs(t.height - w.height) <= 2, `Kachel so hoch wie Wetter (${Math.round(t.height)} / ${Math.round(w.height)} px)`);
  const plus = await tile.getByRole("button", { name: /^Nachricht an die Pinnwand/ }).boundingBox();
  const mic = await tile.getByRole("button", { name: /Aufnahme|Sprachnachricht|Mikro/ }).first().boundingBox();
  if (mic) check(mic.y - (plus.y + plus.height) >= 44 || Math.abs(mic.x - plus.x) >= 44, "＋ und Mikro mindestens 44 px auseinander");
  check(!(await tile.getByLabel("Neue Nachricht").count()), "kein roter Punkt");

  // ＋ → Schnelleingabe „NACHRICHT AN ALLE“ → ➤ = angepinnt
  await tile.getByRole("button", { name: /^Nachricht an die Pinnwand/ }).click();
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  check(await sheet.getByText("NACHRICHT AN ALLE", { exact: true }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Schnelleingabe „NACHRICHT AN ALLE“");
  await schnell(page, "Ich bin um 6 zurück", { close: false });
  check(await page.getByText("Angepinnt: Ich bin um 6 zurück").isVisible(), "„Angepinnt: …“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit „Rückgängig“");
  await sheet.getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);
  check(await tile.getByText("Ich bin um 6 zurück").isVisible(), "Nachricht in der Kachel");

  // Wischen über der Kachel wechselt weiter die Seite
  const t2 = await tile.boundingBox();
  await swipe(page, { x: t2.x + t2.width * 0.8, y: t2.y + 60, dx: -t2.width * 0.7 });
  await page.waitForTimeout(900);
  check((await page.getByRole("tab", { name: "Essen", selected: true }).count()) > 0, "Wischen über der Kachel → Essen");

  // Pinnwand-Seite
  await page.goto(BASE + "/pinnwand");
  await page.waitForTimeout(900);
  const own = row(page, "Ich bin um 6 zurück");
  const other = row(page, "Bin um 20 Uhr da");
  check(await own.isVisible() && (await other.isVisible()), "eigene und fremde Nachricht auf der Seite");

  // fremde nach links: federt zurück
  let b = await other.boundingBox();
  await swipe(page, { x: b.x + b.width * 0.85, y: b.y + b.height / 2, dx: -b.width * 0.7, ms: 300 });
  await page.waitForTimeout(700);
  check(await other.isVisible(), "fremde Nachricht: nur zurückgefedert");

  // eigene nach links ganz durch: gelöscht
  b = await own.boundingBox();
  await swipe(page, { x: b.x + b.width * 0.9, y: b.y + b.height / 2, dx: -b.width * 0.8, ms: 300 });
  await page.waitForTimeout(500);
  check(!(await own.count()), "eigene Nachricht nach links weggewischt");
  check(await page.getByText("Gelöscht").isVisible(), "„Gelöscht · Rückgängig“");

  // rechts wischen = antworten (Schnelleingabe)
  b = await other.boundingBox();
  await swipe(page, { x: b.x + 30, y: b.y + b.height / 2, dx: b.width * 0.4, ms: 300 });
  check(await page.getByRole("dialog", { name: "Schnelleingabe" }).waitFor({ timeout: 4000 }).then(() => true, () => false), "rechts wischen → Antwort");
  await page.getByRole("dialog", { name: "Schnelleingabe" }).getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(500);

  // lange drücken → ❤️ → „❤️ Lisa“
  b = await other.boundingBox();
  await hold(page, b.x + b.width / 2, b.y + b.height / 2);
  const menu = page.getByRole("dialog", { name: "Reagieren" });
  check(await menu.waitFor({ timeout: 3000 }).then(() => true, () => false), "lange drücken → Reaktionen + Menü");
  check(await menu.getByRole("menuitem", { name: "Antworten" }).isVisible(), "Menü „Antworten“");
  check(!(await menu.getByRole("menuitem", { name: "Löschen" }).count()), "fremde: kein „Löschen“");
  await menu.getByRole("button", { name: "Mit ❤️ reagieren" }).click();
  await page.waitForTimeout(400);
  check(await other.getByText("❤️ Lisa").isVisible(), "„❤️ Lisa“ unter der Nachricht");
};
