// Essen-Kachel final (A-046, Tafel 134): ohne Plan zeigt sie gleich einen
// Vorschlag („KOCHIDEE · HEUTE“), „Was anderes?“ blättert weiter (öffnet
// nicht das Rezept), Kachel antippen = Rezept-Vorschau, „Zurück zu den
// Ideen“ lässt denselben Vorschlag stehen, „Nehmen“ trägt ein und bietet die
// Zutaten an („Alle dazu“, Wochenplan-Angebot A-040). Beispiel-Tag:
// Antippen öffnet die Vorschau des Beispielgerichts, erst „Nehmen“ übernimmt es.
import { hello, seedFamily, store } from "../lib.mjs";

const planTitles = async (page) => JSON.stringify((await store(page, "wasgibts.wochenplan")) ?? {});
const kachel = (page) => page.locator("[role=tabpanel]:not([inert]) [data-essen-kachel]").first();
const titel = async (page) => (await kachel(page).locator("[data-titel]").innerText()).trim();

export const essenKachelVorschlag = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(1200);
  const tile = kachel(page);
  check(/^Kochidee · Heute$/i.test((await tile.locator("[data-kopf]").innerText()).trim()), "ohne Plan gleich ein Vorschlag: „KOCHIDEE · HEUTE“");
  check(!(await page.getByText("Ideen ansehen").count()), "kein „Ideen ansehen“");
  const erster = await titel(page);
  // „Was anderes?“ = neuer Vorschlag, öffnet nicht das Rezept
  const swap = tile.getByRole("button", { name: "Andere Idee" });
  check(await swap.isVisible(), "oben links „Was anderes?“");
  await swap.click();
  await page.waitForTimeout(400);
  const name = await titel(page);
  check(name !== erster, `„Was anderes?“ zeigt einen neuen Vorschlag (${erster} → ${name})`);
  check(!(await page.locator("[data-vorschau]").count()), "„Was anderes?“ öffnet kein Rezept");
  // Kachel antippen = Vorschau dieses Gerichts
  await tile.locator("[data-essen-antippen]").click();
  const sheet = page.locator(`[data-vorschau="${name}"]`);
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), `Antippen öffnet die Vorschau von „${name}“`);
  check(/Kochidee · Heute/i.test(await page.locator("[data-vorschau-kopf]").innerText().catch(() => "")), "Vorschau mit Statuszeile");
  await page.getByRole("button", { name: "Zurück zu den Ideen" }).click();
  await page.waitForTimeout(500);
  check((await titel(page)) === name, "„Zurück zu den Ideen“: derselbe Vorschlag steht noch da");
  check(!(await planTitles(page)).includes(name), "noch nicht im Plan");
  await tile.locator("[data-essen-antippen]").click();
  await sheet.waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Nehmen", exact: true }).click();
  await page.waitForTimeout(700);
  check((await planTitles(page)).includes(name), `„Nehmen“: „${name}“ steht im Plan`);
  // A-040: danach bietet eine kleine Meldung die Zutaten an („Auf die Liste: … ?“ · „Alle dazu“)
  const angebot = page.locator("[data-toast-action]");
  check(await angebot.waitFor({ timeout: 3000 }).then(() => true, () => false), "„Nehmen“ bietet die Zutaten an („Alle dazu“)");
  check(/^Auf die Liste: .+\?$/.test((await page.getByRole("status").innerText().catch(() => "")).split("\n")[0].trim()), "Meldung „Auf die Liste: …?“");
  await angebot.click().catch(() => {});
  await page.waitForTimeout(400);
  const manual = Object.values((await store(page, "wasgibts.einkaufsliste"))?.weeks ?? {}).flatMap((w) => w.manual ?? []);
  check(manual.length > 0 && manual.every((m) => !m.amount), "„Alle dazu“: Zutaten stehen drauf, nur mit Namen");
  check(/^Essen/i.test((await kachel(page).locator("[data-kopf]").innerText()).trim()) && (await titel(page)) === name, "danach fest geplant („ESSEN …“)");
};

export const essenKachelBeispiel = async (page, check) => {
  await hello(page);
  const frame = kachel(page).locator("[data-essen-antippen]");
  const label = (await frame.getAttribute("aria-label")) ?? "";
  const title = label.split(" · ").slice(-2, -1)[0];
  check(/· Beispiel$/.test(label), "Beispiel-Tag: Beispielgericht in der Kachel");
  check((await kachel(page).locator("[data-woche]").count()) > 0 && !(await kachel(page).locator("[data-rezept]").count()), "Beispiel: Pille „Wochenplan ›“, kein großer Knopf");
  await frame.click();
  const sheet = page.locator(`[data-vorschau="${title}"]`);
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), "Beispiel-Tag: Antippen öffnet die Vorschau");
  check(/für \d/.test(await sheet.innerText()), "Beispiel-Rezept für die Personen des Haushalts");
  check(!(await planTitles(page)).includes(title), "noch nicht im echten Plan");
  await page.getByRole("button", { name: "Nehmen", exact: true }).click();
  await page.waitForTimeout(600);
  check((await planTitles(page)).includes(title), `„${title}“ jetzt im echten Plan`);
};
