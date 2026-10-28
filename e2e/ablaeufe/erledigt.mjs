// Erledigte Aufgaben nur 12 Stunden (A-043): „Erledigt ⌄“ ist zugeklappt und
// ohne Zahl; aufgeklappt nur, was in den letzten 12 Stunden abgehakt wurde
// (neueste oben); Älteres und Abgehaktes ohne Zeitpunkt (vor dem Update) ist
// still weg – auch im Speicher. Häkchen antippen = wieder offen, dann bleibt
// sie auch nach 13 Stunden. Zwei Geräte: Ablauf `erledigtAbgleich` (konten.mjs).
import { BASE, hello, seedFamily, store } from "../lib.mjs";

// Feste Zeit der Durchklicks: Mi 21.10.2026, 10:30 (Berlin) = 08:30 UTC
const vor = (stunden) => new Date(Date.parse("2026-10-21T08:30:00.000Z") - stunden * 3_600_000).toISOString();
const aufgabe = (id, title, doneOn, doneAt) => ({ id, typ: "aufgabe", raum: "familie", besitzer: "lokal", erstellt: "2026-10-19T08:00:00.000Z", geaendert: doneAt ?? "2026-10-20T08:00:00.000Z", data: { title, reminder: "aus", doneOn, ...(doneAt ? { doneAt } : {}) } });
const titel = async (page) => ((await store(page, "wasgibts.eintraege"))?.entries ?? []).map((e) => e.data.title);

export const erledigtZwoelf = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.evaluate((extra) => {
    const s = JSON.parse(localStorage.getItem("wasgibts.eintraege"));
    s.entries.push(...extra);
    localStorage.setItem("wasgibts.eintraege", JSON.stringify(s));
  }, [aufgabe("e-muell", "Müll rausbringen", "2026-10-21", vor(2)), aufgabe("e-spuel", "Spülmaschine ausräumen", "2026-10-20", vor(11)), aufgabe("e-fenster", "Fenster putzen", "2026-10-20", vor(13)), aufgabe("e-alt", "Keller aufräumen", "2026-10-19", null)]);

  await page.goto(BASE + "/aufgaben");
  const knopf = page.locator("[data-erledigt]").getByRole("button");
  await knopf.waitFor();
  check((await knopf.textContent()).trim() === "Erledigt", "„Erledigt“ ohne Zahl");
  check((await knopf.getAttribute("aria-expanded")) === "false", "„Erledigt ⌄“ standardmäßig zugeklappt");
  check(!(await page.getByText("Müll rausbringen").count()), "zugeklappt: nichts Erledigtes zu sehen");
  await knopf.click();
  const liste = page.locator("[data-erledigt] ul");
  await liste.waitFor();
  const zeilen = (await liste.locator("li").allTextContents()).map((t) => t.trim());
  check(zeilen.length === 2 && zeilen[0].includes("Müll rausbringen") && zeilen[1].includes("Spülmaschine ausräumen"), `aufgeklappt: vor 2 h und vor 11 h, neueste oben (${zeilen.join(" | ")})`);
  check(!(await page.getByText("Fenster putzen").count()) && !(await page.getByText("Keller aufräumen").count()), "vor 13 h und ohne Zeitpunkt: nicht zu sehen");

  // Aufräumen läuft kurz nach dem Start still (ohne „Gelöscht · Rückgängig“)
  await page.waitForTimeout(6000);
  const nachher = await titel(page);
  check(!nachher.includes("Fenster putzen") && !nachher.includes("Keller aufräumen"), "Älteres ist auch im Speicher weg");
  check(nachher.includes("Müll rausbringen") && nachher.includes("Spülmaschine ausräumen"), "die letzten 12 h bleiben gespeichert");
  check(!(await page.getByText("Gelöscht").count()), "keine Meldung beim Aufräumen");

  // Häkchen antippen = wieder offen
  await liste.getByRole("checkbox", { name: "Müll rausbringen erledigt" }).click();
  await page.waitForTimeout(800);
  check(await page.locator("[data-aufgaben-liste]").getByText("Müll rausbringen").isVisible(), "wieder offen: steht wieder in der Liste");

  // 13 Stunden später: die wieder offene bleibt, die andere ist weg
  await page.clock.setFixedTime(new Date(Date.parse("2026-10-21T08:30:00.000Z") + 13 * 3_600_000));
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(800);
  const spaeter = await titel(page);
  check(spaeter.includes("Müll rausbringen"), "wieder offen: wird nicht gelöscht");
  check(!spaeter.includes("Spülmaschine ausräumen"), "nach 12 h still weg");
  check(!(await page.locator("[data-erledigt]").count()), "nichts mehr erledigt: „Erledigt“ verschwindet");
};
