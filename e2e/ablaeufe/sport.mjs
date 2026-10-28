// Durchklick Sport als Stempelkarte (A-044, Tafel 132): leere Karte (ohne
// Ziel 3 Felder) → „Training eintragen“ → Ziel-Frage einmalig („2×“) →
// Stempel → zweites Training = „Woche geschafft.“ (grün) → „•••“ mit
// Wochenziel, Packlisten, Meine Sportarten, Erinnerung (Standard aus) →
// Stempel löschen + Rückgängig → Planen (gestricheltes Feld) → absagen +
// Rückgängig → Kachel auf der Startseite (Plus = Training eintragen, antippen
// = Sport-Seite, kein Wasserzeichen).
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const SPORT_KACHEL = { version: 9, tipSeen: true, tiles: [{ id: "sport", visible: true, size: "S" }] };

const eintragen = async (page, sportart) => {
  await page.getByRole("button", { name: "Training eintragen" }).first().tap();
  const sheet = page.getByRole("dialog", { name: "Training eintragen" });
  await sheet.waitFor();
  await sheet.getByRole("button", { name: sportart, exact: true }).tap();
  await sheet.getByRole("button", { name: "Eintragen" }).tap();
  await page.waitForTimeout(700);
};

export const sportStempel = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.startseite": SPORT_KACHEL });
  await page.goto(BASE + "/sport");
  await page.waitForTimeout(1000);
  const karte = page.getByRole("region", { name: "Diese Woche" });
  check(await karte.getByText("Diese Woche ist noch frei.").isVisible(), "leer: „Diese Woche ist noch frei.“");
  check(await karte.getByText("Ohne Ziel").isVisible(), "ohne Ziel steht rechts „Ohne Ziel“");
  check((await karte.locator('[data-feld="frei"]').count()) === 3, "ohne Ziel: 3 Felder");
  check(!(await page.getByText("Die Woche ist bereit für dich.").count()) && !(await page.getByText("Wie oft pro Woche?").count()), "kein Wochensatz alt, keine Ziel-Chips");
  check(!(await page.getByRole("button", { name: "Training eintragen" }).first().locator("svg").count()), "großer Knopf ohne Symbol");

  // Erstes Training → Ziel-Frage einmalig
  await eintragen(page, "Volleyball");
  const frage = page.getByRole("dialog", { name: "Wochenziel" });
  check(await frage.waitFor({ timeout: 3000 }).then(() => true, () => false), "Ziel-Frage nach dem ersten Training");
  check(await frage.getByText("Wie oft willst du Sport machen? Pro Woche. Dann sag ich dir, wenn die Woche geschafft ist.").isVisible(), "Text der Ziel-Frage");
  check((await frage.getByRole("button").filter({ hasText: /^(2×|3×|Ohne Ziel)$/ }).count()) === 3, "drei Knöpfe 2× · 3× · Ohne Ziel");
  await frage.getByRole("button", { name: "2×" }).tap();
  await page.waitForTimeout(500);
  const s1 = await store(page, "wasgibts.sport");
  check(s1?.version === 2 && s1.goal === 2 && s1.zielGefragt === true && s1.erinnerung === false, `Ziel 2, gefragt, Erinnerung aus (${JSON.stringify({ goal: s1?.goal, zielGefragt: s1?.zielGefragt })})`);
  check((await karte.locator('[data-stempel="volleyball"]').count()) === 1 && (await karte.locator("[data-feld]").count()) === 1, "1 Stempel + 1 Feld");
  check(await karte.getByText("Heute war Volleyball.").isVisible(), "„Heute war Volleyball.“");
  check(await karte.getByText("Ziel: 2×").isVisible(), "„Ziel: 2×“");

  // Zweites Training: geschafft, keine zweite Frage
  await eintragen(page, "Laufen");
  check(!(await page.getByRole("dialog", { name: "Wochenziel" }).count()), "nie zweimal fragen");
  check(await karte.getByText("Woche geschafft.").isVisible() && (await karte.getByText("Mehr ist Bonus.").isVisible()), "„Woche geschafft.“ / „Mehr ist Bonus.“");
  check((await karte.getAttribute("data-geschafft")) === "", "Karte grün (data-geschafft)");

  // Drittes = Bonus
  await eintragen(page, "Yoga");
  check((await karte.locator("[data-bonus]").count()) === 1, "drittes Training = Bonus-Stempel");

  // Menü •••
  await page.getByRole("button", { name: "Mehr" }).tap();
  const menu = page.getByRole("dialog", { name: "Sport" });
  await menu.waitFor();
  for (const t of ["Wochenziel", "Packlisten", "Meine Sportarten", "Erinnerung am Vorabend"]) check(await menu.getByText(t, { exact: true }).isVisible(), `Menü: ${t}`);
  check((await menu.getByLabel("Wochenziel").inputValue()) === "2", "Wochenziel 2×");
  const schalter = menu.getByRole("switch", { name: "Erinnerung am Vorabend" });
  check(!(await schalter.isChecked()), "Erinnerung am Vorabend: Standard aus");
  await schalter.tap();
  await page.waitForTimeout(300);
  check((await store(page, "wasgibts.sport"))?.erinnerung === true, "Erinnerung an");
  await menu.getByRole("button", { name: /Meine Sportarten/ }).tap();
  const arten = page.getByRole("dialog", { name: "Meine Sportarten" });
  check(await arten.getByText("Volleyball").isVisible(), "Meine Sportarten zeigt Volleyball");
  await arten.getByRole("button", { name: "Schließen" }).first().tap().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Stempel löschen + Rückgängig
  await karte.getByRole("button", { name: /^Mi: Volleyball, gestempelt/ }).tap();
  await page.getByRole("button", { name: "Löschen" }).tap();
  await page.waitForTimeout(400);
  check((await karte.locator('[data-stempel="volleyball"]').count()) === 0, "Stempel gelöscht");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(400);
  check((await karte.locator('[data-stempel="volleyball"]').count()) === 1, "Rückgängig holt den Stempel zurück");

  // Kachel auf der Startseite
  await page.goto(BASE);
  await page.waitForTimeout(1000);
  const tile = page.getByRole("region", { name: "Sport" });
  check(await tile.getByText("Geschafft.").isVisible(), "Kachel: „Geschafft.“");
  check((await tile.getAttribute("data-geschafft")) === "", "Kachel grün");
  check(!(await tile.locator(".kachel-wasserzeichen").count()), "kein Wasserzeichen");
  await tile.getByRole("button", { name: "Training eintragen" }).tap();
  check(await page.getByRole("dialog", { name: "Training eintragen" }).waitFor({ timeout: 3000 }).then(() => true, () => false), "Kachel-Plus = Training eintragen");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await tile.getByRole("link", { name: "Sport öffnen" }).tap();
  await page.waitForURL(/\/sport/, { timeout: 4000 }).catch(() => {});
  check(page.url().includes("/sport"), "Kachel antippen = Sport-Seite");
};

/** Planen von der Sport-Seite: gestricheltes Feld mit Uhrzeit, absagen + Rückgängig */
export const sportPlanen = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.startseite": SPORT_KACHEL, "wasgibts.sport": { version: 2, goal: 2, zielGefragt: true, erinnerung: false, trainings: [], packs: {}, celebrated: [], hidden: [], custom: [] } });
  await page.goto(BASE + "/sport");
  await page.waitForTimeout(1000);
  const sport = () => page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.eintraege")).entries.filter((e) => e.data.label === "Sport" && e.data.title !== "Fußball Mathis"));
  await page.getByRole("button", { name: "Planen", exact: true }).tap();
  const sheet = page.getByRole("dialog", { name: "Training planen" });
  await sheet.waitFor();
  check(!/\p{Extended_Pictographic}/u.test(await sheet.getByRole("group", { name: "Sportart" }).innerText()), "Sportarten ohne Emojis");
  await sheet.getByRole("button", { name: "Laufen", exact: true }).tap();
  await sheet.getByRole("group", { name: "Uhrzeit" }).getByRole("button", { name: "Andere" }).tap();
  await sheet.getByLabel("Eigene Uhrzeit").fill("18:30");
  await sheet.getByRole("button", { name: "45 Min" }).tap();
  await sheet.getByRole("button", { name: /^Planen · / }).tap();
  await page.waitForTimeout(600);
  const [planned] = await sport();
  check(planned?.data.start === "18:30" && planned?.data.end === "19:15", `geplant ${planned?.data.start}–${planned?.data.end}`);
  const karte = page.getByRole("region", { name: "Diese Woche" });
  const feld = karte.locator('[data-feld="geplant"]');
  check((await feld.count()) >= 1 && (await feld.first().innerText()).includes("18:30"), "gestricheltes Feld mit „18:30“ (nie nur „18“)");
  check(await karte.getByText(/18:30 ist geplant\.$/).isVisible(), "„… 18:30 ist geplant.“");
  await karte.getByRole("button", { name: /18:30: Laufen, geplant/ }).tap();
  await page.getByRole("button", { name: "Absagen" }).tap();
  await page.waitForTimeout(500);
  check((await sport()).length === 0, "abgesagt");
  await page.getByRole("button", { name: "Rückgängig" }).tap();
  await page.waitForTimeout(500);
  check((await sport()).length === 1, "Rückgängig holt es zurück");
};
