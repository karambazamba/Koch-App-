// Kochtipp – spontan mit Mia: Mütze erst ab dem 3. Nutzungstag, Hinweis
// einmal, Mütze → Chat mit Frage + drei Schnellantworten, „Ich hab noch
// Hähnchen, Reis und Paprika“ → Karte, „Anderes“ → andere Karte, „Machen wir“
// → Kachel zeigt das Gericht, der Plan der anderen Tage bleibt. Zeit: Mi 21.10. 10:30.
import { hello, seedFamily, store, tippenFeld } from "../lib.mjs";

const center = (page) => page.getByRole("region", { name: /^Essen/ }).evaluate((el) => el.scrollIntoView({ block: "center" }));
const hat = (page) => page.getByRole("button", { name: /^Kochtipp – spontan mit/ });

export const kochtipp = async (page, check) => {
  await hello(page);
  // Morgen steht schon etwas im Plan – das muss bleiben
  await seedFamily(page, { "wasgibts.wochenplan": { version: 3, weeks: { "2026-10-19": { Donnerstag: { kind: "text", title: "Linsensuppe", category: "vegetarisch" } } } } });
  await page.reload();
  await page.waitForTimeout(900);
  check(!(await hat(page).count()), "Tag 1: noch keine Mütze");

  // Ab dem 3. Nutzungstag
  await page.evaluate(() => localStorage.setItem("wasgibts.kochtipp", JSON.stringify({ version: 1, days: ["2026-10-19", "2026-10-20", "2026-10-21"], unlocked: false, popped: false, last: null, shown: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  check(await hat(page).isVisible(), "Tag 3: Mütze in der Essen-Kachel");
  check(await page.getByText("Tipp auf die Mütze", { exact: false }).isVisible(), "Hinweis mit Pfeil");
  await page.waitForTimeout(6500);
  check(!(await page.getByText("Tipp auf die Mütze", { exact: false }).count()), "Hinweis nach 6 s weg");
  await page.reload();
  await page.waitForTimeout(900);
  check(!(await page.getByText("Tipp auf die Mütze", { exact: false }).count()), "Hinweis nur einmal");

  // Tipp auf den Rest der Kachel: wie bisher (Essen-Seite)
  await center(page);
  await page.getByRole("region", { name: /^Essen/ }).getByRole("button").first().click({ timeout: 5000 });
  await page.waitForTimeout(700);
  check(page.url().includes("seite=essen") || (await page.getByRole("tab", { name: "Essen", selected: true }).count()) > 0, "Kachel ohne Mütze → Essen wie bisher");
  await page.getByRole("tab", { name: "Heute" }).click();
  await page.waitForTimeout(700);

  // Mütze → Kochtipp-Chat
  await center(page);
  await hat(page).click();
  await page.waitForTimeout(800);
  check(await page.getByText("Lust auf was ganz anderes?", { exact: false }).isVisible(), "Mia: „Lust auf was ganz anderes?“");
  for (const c of ["Schau in den Vorrat", "Reste verwerten", "Neu einkaufen"]) check(await page.getByRole("button", { name: c }).isVisible(), `Schnellantwort „${c}“`);
  const box = await tippenFeld(page);
  await box.fill("Ich hab noch Hähnchen, Reis und Paprika");
  await box.press("Enter");
  const card = page.getByRole("article", { name: /^Vorschlag:/ });
  await card.last().waitFor({ timeout: 5000 });
  const first = await card.last().getAttribute("aria-label");
  check(/Hähnchen/.test(first ?? ""), `Karte mit Hähnchen-Gericht (${first})`);
  check(await card.last().getByText("nimmt deine", { exact: false }).isVisible(), "„nimmt deine Hähnchen, Reis …“");
  // Fehler v0.60-Entwurf: Karte im Chat auf 2 px zusammengedrückt
  check(((await card.last().boundingBox())?.height ?? 0) > 200, "Karte in voller Höhe");

  // Anderes → andere Karte
  await card.last().getByRole("button", { name: "Anderes" }).click();
  await page.waitForTimeout(400);
  const second = await card.last().getAttribute("aria-label");
  check(second !== first, `„Anderes“ → andere Karte (${second})`);

  // Machen wir → Kachel zeigt das Gericht, morgen bleibt
  const title = (second ?? "").replace(/^Vorschlag: /, "");
  await card.last().getByRole("button", { name: "Machen wir" }).click();
  const ask = page.getByRole("button", { name: "Hab ich" });
  if (await ask.waitFor({ timeout: 1500 }).then(() => true, () => false)) await ask.click();
  check(await page.getByText(`Heute gibt’s ${title}`).waitFor({ timeout: 3000 }).then(() => true, () => false), "„Heute gibt’s …“");
  await page.waitForTimeout(600);
  await center(page);
  check(await page.getByRole("region", { name: /^Essen/ }).getByText(title).isVisible(), "Essen-Kachel zeigt das neue Gericht");
  const plan = await store(page, "wasgibts.wochenplan");
  check(Object.values(plan?.weeks ?? {}).some((w) => w?.Donnerstag?.title === "Linsensuppe"), "Plan für morgen unverändert");
};
