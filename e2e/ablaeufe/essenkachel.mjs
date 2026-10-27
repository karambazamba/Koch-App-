// Essen-Kachel: ⇄ zeigt einen Vorschlag als Bild-Kachel („Vorschlag“), Antippen
// öffnet genau dieses Gericht, „Für heute nehmen“ plant es ein. Beispiel-Tag:
// Antippen öffnet das Beispielgericht, erst „Nehmen“ übernimmt es.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const planTitles = async (page) => JSON.stringify((await store(page, "wasgibts.wochenplan")) ?? {});

export const essenKachelVorschlag = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const swap = page.getByRole("button", { name: "Andere Idee" }).first();
  check(await swap.isVisible(), "⇄ auf der Essen-Kachel");
  await swap.click();
  const tile = page.getByRole("button", { name: /· Vorschlag$/ }).first();
  check(await tile.waitFor({ timeout: 4000 }).then(() => true, () => false), "Vorschlag als Bild-Kachel");
  const name = (await tile.getAttribute("aria-label")).split(" · ").slice(-2, -1)[0];
  check(!(await page.getByText("Ideen ansehen").count()), "kein „Ideen ansehen“ unter einem Gericht");
  await tile.click();
  const sheet = page.locator("[data-gericht-fenster]");
  check(await sheet.waitFor({ timeout: 4000 }).then(() => true, () => false), `Antippen öffnet genau „${name}“`);
  await sheet.getByRole("button", { name: "Für heute nehmen" }).click();
  await page.waitForTimeout(600);
  check((await planTitles(page)).includes(name), `„${name}“ steht im Plan`);
  check(!(await page.getByRole("button", { name: /· Vorschlag$/ }).count()), "danach geplant, kein „Vorschlag“ mehr");
};

export const essenKachelBeispiel = async (page, check) => {
  await hello(page);
  const label = (await page.getByRole("button", { name: /^Essen · .* · Beispiel$|^Morgen · .* · Beispiel$/ }).first().getAttribute("aria-label")) ?? "";
  const title = label.split(" · ").slice(-2, -1)[0];
  await page.getByRole("button", { name: label }).click();
  const sheet = page.locator("[data-gericht-fenster]");
  check(await sheet.waitFor({ timeout: 4000 }).then(() => true, () => false), "Beispiel-Tag: Antippen öffnet das Gericht");
  check(!(await planTitles(page)).includes(title), "noch nicht im echten Plan");
  await sheet.getByRole("button", { name: /^Für (heute|morgen) nehmen$/ }).click();
  await page.waitForTimeout(600);
  check((await planTitles(page)).includes(title), `„${title}“ jetzt im echten Plan`);
};
