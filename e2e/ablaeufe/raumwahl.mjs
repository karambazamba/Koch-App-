// Termine – Raumauswahl Familie / Geschäftlich (A-021): Termin per ＋ mit
// demselben Schalter wie bei Aufgaben (Raum aus dem Satz, von Hand
// umstellbar), Filter „Alle · Familie · Geschäftlich“ im Kalender, Raum
// nachträglich ändern (Termin öffnen → Bearbeiten → Schalter), Termin per
// Sprache (Mia erkennt den Raum aus dem Inhalt) und die Migration alter
// „Privat“-Stände. Lisas Sicht prüft `familieTeilen`. Zeit: Mi 21.10. 10:30.
import { BASE, FAKE_HOEREN, eintragFenster, hello, seedFamily, store } from "../lib.mjs";

const entries = async (page) => (await store(page, "wasgibts.eintraege"))?.entries ?? [];
const finde = async (page, title) => (await entries(page)).find((e) => e.data.title === title);

async function oeffne(page, name) {
  const plus = page.getByRole("button", { name }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  const sheet = page.getByRole("dialog", { name });
  await sheet.waitFor({ timeout: 5000 });
  return sheet;
}

export const raumTerminPlus = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Aufgabe und Termin: derselbe Schalter „Familie | Geschäftlich“
  const aufgabe = await oeffne(page, "Neue Aufgabe");
  const aufgabeSchalter = (await aufgabe.getByRole("radiogroup", { name: "Wer sieht es?" }).getByRole("radio").allInnerTexts()).join("|");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const sheet = await oeffne(page, "Neuer Termin");
  const schalter = sheet.getByRole("radiogroup", { name: "Wer sieht es?" });
  const terminSchalter = (await schalter.getByRole("radio").allInnerTexts()).join("|");
  check(terminSchalter === "Familie|Geschäftlich", `Termin: Schalter „Familie | Geschäftlich“ (${terminSchalter})`);
  check(terminSchalter === aufgabeSchalter, "Termin und Aufgabe: gleicher Schalter");
  check(!(await sheet.getByText(/Privat|^Ich$/).count()), "kein „Privat“, kein „Ich“");
  check((await schalter.getByRole("radio", { name: "Familie", checked: true }).count()) === 1, "Start: Familie");

  // Raum aus dem Satz: Tohuus → Geschäftlich
  const box = sheet.getByRole("textbox", { name: "Neuer Termin" });
  await box.fill("Lieferant Tohuus Freitag 9 Uhr");
  check((await schalter.getByRole("radio", { name: "Geschäftlich", checked: true }).count()) === 1, "„Tohuus“ stellt den Schalter auf Geschäftlich");
  await box.press("Enter");
  await page.waitForTimeout(400);
  const lieferant = await finde(page, "Lieferant Tohuus");
  check(lieferant?.raum === "arbeit" && lieferant?.data.date === "2026-10-23", `gespeichert als Geschäftlich (${lieferant?.raum} ${lieferant?.data.date})`);

  // Von Hand geht vor: Satz sagt nichts, Schalter auf Familie
  await box.fill("Kita-Fest Samstag 11 Uhr");
  check((await schalter.getByRole("radio", { name: "Familie", checked: true }).count()) === 1, "„Kita“ → Familie");
  await box.press("Enter");
  await page.waitForTimeout(400);
  check((await finde(page, "Kita-Fest"))?.raum === "familie", "Kita-Fest in Familie");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Kalender: Filter „Alle · Familie · Geschäftlich“, Geschäftlich zeigt nur Geschäftliches
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  const panel = page.locator("[role=tabpanel]:not([inert])");
  const filter = panel.getByRole("radiogroup", { name: "Filter" });
  check((await filter.getByRole("radio").allInnerTexts()).join("|") === "Alle|Familie|Geschäftlich", "Kalender-Filter „Alle · Familie · Geschäftlich“");
  await panel.getByRole("radio", { name: "Liste" }).click();
  await filter.getByRole("radio", { name: "Geschäftlich" }).click();
  await page.waitForTimeout(400);
  check((await panel.getByText("Lieferant Tohuus").count()) > 0 && !(await panel.getByText("Kita-Fest").count()), "Filter Geschäftlich: nur Lieferant");
  await filter.getByRole("radio", { name: "Alle" }).click();

  // Tag-Seite: Schild „Geschäftlich“, Uhrzeit in Blau
  await page.goto(BASE + "/tag?datum=2026-10-23");
  await page.waitForTimeout(900);
  const zeile = page.getByRole("button", { name: /Lieferant Tohuus – Möglichkeiten/ }).first();
  check(await zeile.locator('[data-schild="arbeit"]').getByText("Geschäftlich").isVisible(), "Schild „Geschäftlich“ am Termin");

  // Raum nachträglich ändern: Termin öffnen → Bearbeiten → Schalter → Familie
  await zeile.click();
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  const fenster = eintragFenster(page, "termin");
  await fenster.waitFor({ timeout: 5000 });
  const s2 = fenster.getByRole("radiogroup", { name: "Wer sieht es?" });
  check((await s2.getByRole("radio", { name: "Geschäftlich", checked: true }).count()) === 1, "Bearbeiten zeigt den gespeicherten Raum");
  await s2.getByRole("radio", { name: "Familie" }).click();
  await fenster.getByRole("textbox").press("Enter");
  await page.waitForTimeout(500);
  check((await finde(page, "Lieferant Tohuus"))?.raum === "familie", "Raum geändert: Familie");
  check(!(await page.locator('[data-schild="arbeit"]').count()), "kein Schild mehr");

  // Ohne Geschäftliches: keine Filter-Chips
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  check(!(await page.locator("[role=tabpanel]:not([inert])").getByRole("radiogroup", { name: "Filter" }).count()), "ohne Geschäftliches keine Chips");
};

export const raumTerminSprache = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(900);
  const sprich = async (satz, title) => {
    await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
    await page.waitForFunction(() => window.__rec?.running, null, { timeout: 5000 });
    await page.evaluate((s) => window.__sag([[s, true]]), satz);
    await page.evaluate(() => window.__ende());
    const ok = await page.waitForFunction((t) => (localStorage.getItem("wasgibts.eintraege") ?? "").includes(t), title, { timeout: 10000 }).then(() => true, () => false);
    check(ok, `„${satz}“ eingetragen`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);
    return finde(page, title);
  };
  const lieferant = await sprich("Morgen um 9 Lieferant im Tohuus", "Lieferant");
  check(lieferant?.raum === "arbeit", `Tohuus → Geschäftlich (${lieferant?.raum})`);
  const arzt = await sprich("Kinderarzt Freitag 15 Uhr", "Kinderarzt");
  check(arzt?.raum === "familie", `Kinderarzt → Familie (${arzt?.raum})`);
};

export const raumMigration = async (page, check) => {
  await hello(page);
  // Alter Stand (v3): Wochencheck-„Privat“ lag als Arbeit mit Etikett, dazu ein „ich“ aus Testständen
  const T = "2026-10-20T08:00:00.000Z";
  const e = (id, title, raum, extra = {}) => ({ id, typ: "termin", raum, besitzer: "lokal", erstellt: T, geaendert: T, data: { title, date: "2026-10-22", start: "08:00", reminder: "aus", repeat: null, doneDates: [], skipDates: [], ...extra } });
  await seedFamily(page, {
    "wasgibts.eintraege": { version: 3, migratedTermine: true, seenReminders: [], entries: [e("p1", "Physio", "arbeit", { label: "Privat" }), e("i1", "Therapie", "ich"), e("f1", "Elternabend", "familie")] },
  });
  await page.goto(BASE + "/tag?datum=2026-10-22");
  await page.waitForTimeout(900);
  check(await page.getByText("Physio").first().isVisible(), "alter Termin ist da");
  check(!(await page.getByText("Privat").count()), "Etikett „Privat“ wird nicht gezeigt");
  // gespeichert wird beim nächsten Ändern: einmal etwas eintragen
  await page.getByRole("button", { name: "Neuer Termin an diesem Tag" }).click();
  const fenster = eintragFenster(page, "termin");
  await fenster.waitFor({ timeout: 5000 });
  await fenster.getByRole("textbox").fill("Friseur 14 Uhr");
  await fenster.getByRole("textbox").press("Enter");
  await page.waitForTimeout(500);
  const s = await store(page, "wasgibts.eintraege");
  const raum = (id) => s.entries.find((x) => x.id === id);
  check(s.version === 4, `Speicher v4 (${s.version})`);
  check(raum("p1")?.raum === "familie" && raum("p1")?.data.label === "Privat", "„Privat“ → Familie, Etikett bleibt gespeichert");
  check(raum("i1")?.raum === "arbeit", "altes „ich“ → Geschäftlich (nie ungefragt geteilt)");
  check(raum("f1")?.raum === "familie" && s.entries.length === 4, "nichts verloren");
};
