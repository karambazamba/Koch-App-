// Kochidee (Tafel 64 C/65): Knopf erst ab dem 3. Nutzungstag; geplantes
// Gericht → „Was anderes?“ → Mia zeigt ohne Frage drei Vorschläge (nie das
// geplante) → Mia in der Karte antippen → erzählen → „Dann mach doch …!“,
// Karussell → zweimal wischen → „Nehmen“ → Kachel zeigt das Gericht, das
// alte steht bei den Ideen, der Plan von morgen bleibt. Zeit: Mi 21.10. 10:30.
import { hello, seedFamily, store, swipe, tippenFeld } from "../lib.mjs";

const PASTA = "Pasta mit Tomaten & Burrata";
const center = (page) => page.getByRole("region", { name: /^Essen/ }).evaluate((el) => el.scrollIntoView({ block: "center" }));
const knopf = (page) => page.getByRole("button", { name: /^(Was anderes kochen\?|Kochidee –)/ });

export const kochtipp = async (page, check) => {
  await hello(page);
  // Heute ist Pasta geplant, morgen Linsensuppe – die muss bleiben
  const plan = { version: 3, weeks: { "2026-10-19": { Mittwoch: { kind: "text", title: PASTA, category: "vegetarisch" }, Donnerstag: { kind: "text", title: "Linsensuppe", category: "vegetarisch" } } } };
  await seedFamily(page, { "wasgibts.wochenplan": plan });
  await page.reload();
  await page.waitForTimeout(900);
  check(!(await knopf(page).count()), "Tag 1: noch kein Kochidee-Knopf");

  // Ab dem 3. Nutzungstag
  await page.evaluate(() => localStorage.setItem("wasgibts.kochtipp", JSON.stringify({ version: 1, days: ["2026-10-19", "2026-10-20", "2026-10-21"], unlocked: false, popped: false, last: null, shown: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  await center(page);
  const pill = page.getByRole("button", { name: "Was anderes kochen? Mia schlägt Alternativen vor" });
  check(await pill.isVisible(), "geplantes Gericht → Pille „Was anderes?“");
  check((await pill.innerText()).trim() === "Was anderes?", "Text „Was anderes?“");
  check(await page.getByText("Neu: Kochidee").isVisible(), "einmal „Neu: Kochidee“");
  await page.waitForTimeout(6500);
  check(!(await page.getByText("Neu: Kochidee").count()), "Blase nach 6 s weg");

  // Drei Vorschläge ohne Frage
  await pill.click();
  const stage = page.getByRole("dialog").last();
  await stage.getByText("Ganz was anderes?").waitFor({ timeout: 5000 });
  check(await stage.getByText("KOCHIDEE", { exact: true }).isVisible(), "Bereichs-Kopf „KOCHIDEE“");
  check(await stage.getByText(`Lust auf was anderes als ${PASTA}?`).isVisible(), "„Lust auf was anderes als …?“");
  check(await stage.getByText(`${PASTA} – bleibt, wenn du nichts nimmst`).isVisible(), "geplantes Gericht bleibt (gestrichelt)");
  const rows = stage.getByRole("article", { name: /^Vorschlag:/ });
  const titles = await rows.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  check(titles.length === 3 && !titles.some((t) => t?.includes(PASTA)), `drei Vorschläge, nie das geplante (${titles.join(" | ")})`);
  check(!(await stage.getByRole("button", { name: /Vorrat|Neu einkaufen|Reste verwerten/ }).count()), "keine Auswahl-Knöpfe");
  check(!(await stage.getByRole("dialog", { name: /Zugangscode/ }).count()), "kein Zugangscode davor");

  // Mia in der Karte antippen → erzählen (hier getippt)
  await stage.getByText("Ganz was anderes?").click();
  const box = await tippenFeld(page);
  await box.fill("Ich hab Hähnchen gekauft, Paprika und Sahne sind noch da, was Cremiges");
  await box.press("Enter");
  check(await stage.getByText("Dann mach doch", { exact: false }).waitFor({ timeout: 5000 }).then(() => true, () => false), "„Dann mach doch …!“");
  check(await stage.getByText("merk ich mir als „im Haus“", { exact: false }).isVisible(), "„… merk ich mir als „im Haus“ ✓“");
  const track = stage.getByLabel("Vorschläge zum Durchwischen");
  const cards = track.getByRole("article", { name: /^Vorschlag:/ });
  check((await cards.count()) === 3, "Karussell mit drei Gerichten");
  check(await track.getByRole("button", { name: /Noch was anderes\?/ }).count() === 1, "zuletzt „Noch was anderes?“");
  check(await stage.getByText("Passt nicht?").isVisible(), "darunter „Passt nicht?“");

  // Zweimal wischen → dritte Karte nehmen
  const b = await track.boundingBox();
  for (let i = 0; i < 2; i++) {
    await swipe(page, { x: b.x + b.width * 0.8, y: b.y + 80, dx: -b.width * 0.75 });
    await page.waitForTimeout(500);
  }
  const third = cards.nth(2);
  const title = ((await third.getAttribute("aria-label")) ?? "").replace(/^Vorschlag: /, "");
  const box3 = await third.boundingBox();
  check(Boolean(box3) && box3.x >= 0 && box3.x < b.width * 0.5, `nach zweimal Wischen: dritte Karte vorn (${title})`);
  await third.getByRole("button", { name: "Nehmen" }).click();
  check(await page.getByText(/^Eingetragen\./).waitFor({ timeout: 3000 }).then(() => true, () => false), "„Eingetragen. …“ mit Rückgängig");
  await page.waitForTimeout(600);
  await center(page);
  check(await page.getByRole("region", { name: /^Essen/ }).getByText(title).isVisible(), "Essen-Kachel zeigt das neue Gericht");
  const wishes = await store(page, "wasgibts.wuensche");
  check(JSON.stringify(wishes ?? {}).includes(PASTA), "Pasta wandert zurück zu den Ideen");
  const after = await store(page, "wasgibts.wochenplan");
  check(Object.values(after?.weeks ?? {}).some((w) => w?.Donnerstag?.title === "Linsensuppe"), "Plan für morgen unverändert");
};
