// Neue Aufgabe & Termin – ein Feld, Familie · Ich · Arbeit (Tafel 114, A-034).
// Aufgaben-＋ → EIN Fenster „Neue Aufgabe“: Feld hat sofort den Fokus →
// Chip „Arbeit“ → Satz → Return → „Steht drin · Rückgängig“, Feld leer und
// offen; nächstes ＋ wählt wieder Mias Vorschlag (Aufgaben „Ich“). Glocke → 16:00 → Zeile „Erinnern heute 16:00 ✕“.
// „Mehr ›“ = genau drei Zeilen. „Freitag …“ → „Ab Freitag“. Termin-＋
// „Zahnarzt Jonne Fr 16 Uhr“ → blaue Chips „Fr 23. Okt · 16:00 · 1 Std“;
// ohne Uhrzeit „Uhrzeit?“ und erst danach gespeichert. Dazu: jeder Einstieg
// öffnet dasselbe Fenster (`einFenster`). Zeit: Mi 21.10. 10:30.
import { BASE, eintragFenster, hello, seedFamily, store } from "../lib.mjs";

const entries = async (page) => (await store(page, "wasgibts.eintraege"))?.entries ?? [];

async function oeffne(page, name) {
  const plus = page.getByRole("button", { name }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  const sheet = page.getByRole("dialog", { name });
  await sheet.waitFor({ timeout: 5000 });
  return sheet;
}

export const schnelleingabe = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Aufgaben-＋ → das eine Fenster „Neue Aufgabe“
  const sheet = await oeffne(page, "Neue Aufgabe");
  check(await sheet.locator('[data-fenster="aufgabe"]').isVisible(), "＋ → Fenster „Neue Aufgabe“");
  const box = sheet.getByRole("textbox", { name: "Neue Aufgabe" });
  await page.waitForTimeout(300);
  check((await box.getAttribute("placeholder")) === "Was steht an?", "Platzhalter „Was steht an?“");
  check(await box.evaluate((el) => el === document.activeElement), "Feld hat sofort den Fokus (Tastatur offen)");
  check(!(await sheet.getByRole("button", { name: /Mikro|Einsprechen/ }).count()), "kein eigenes Mikro");
  check(!(await sheet.getByRole("radio", { name: "Termin" }).count()) && !(await sheet.getByText("Mehr Details").count()), "kein Termin/Aufgabe-Umschalter, kein „Mehr Details“");
  const fs = await box.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check(fs >= 16, `Feld ≥ 16 px (${fs})`);
  check(await sheet.getByText("Für heute. Return = speichern.").isVisible(), "Hinweis „Für heute. Return = speichern.“");

  // EINE Zeile: Familie · Ich · Arbeit (genau eins), Glocke, Mehr
  const schalter = sheet.getByRole("radiogroup", { name: "Wer sieht es?" });
  check((await schalter.getByRole("radio").allInnerTexts()).map((t) => t.trim()).join("|") === "Familie|Ich|Arbeit", "Chips „Familie · Ich · Arbeit“");
  check((await schalter.getByRole("radio", { checked: true }).count()) === 1, "genau einer an");
  const glocke = sheet.getByRole("button", { name: "Erinnern" });
  const g = await glocke.boundingBox();
  check(Math.round(g.width) === 42 && Math.round(g.height) === 42, `Glocke 42 px (${Math.round(g.width)})`);

  // Leeres ➤ tut nichts
  const before = (await entries(page)).length;
  check((await sheet.getByRole("button", { name: "Speichern" }).getAttribute("aria-disabled")) === "true", "leeres ↑ blass");
  await box.press("Enter");
  await page.waitForTimeout(300);
  check((await entries(page)).length === before && (await sheet.isVisible()), "leer speichern tut nichts");

  // Arbeit + Return → gespeichert, „Steht drin · Rückgängig“, Feld leer und offen
  await schalter.getByRole("radio", { name: "Arbeit" }).click();
  await box.fill("Tim antworten");
  await box.press("Enter");
  await page.waitForTimeout(400);
  const tim = (await entries(page)).find((e) => e.data.title === "Tim antworten");
  check(tim?.raum === "arbeit" && tim?.data.date === "2026-10-21", `gespeichert für heute als Arbeit (${tim?.raum} ${tim?.data.date})`);
  check(await page.getByText("Steht drin", { exact: true }).isVisible(), "„Steht drin“");
  check(await page.getByRole("button", { name: "Rückgängig" }).isVisible(), "mit „Rückgängig“");
  check((await box.inputValue()) === "" && (await sheet.isVisible()), "Feld leer, bleibt offen für die nächste");
  check(await box.evaluate((el) => el === document.activeElement), "Fokus bleibt im Feld");

  // Glocke → Uhrzeit → eigene Zeile „Erinnern heute 16:00 ✕“
  await glocke.click();
  await sheet.getByRole("radiogroup", { name: "Erinnern um" }).getByRole("radio", { name: "16:00" }).click();
  check(await sheet.getByText("Erinnern heute 16:00").isVisible(), "Zeile „Erinnern heute 16:00“");
  check((await glocke.getAttribute("aria-pressed")) === "true", "Glocke orange (an)");
  await box.fill("Rechnung Steuerberater");
  await schalter.getByRole("radio", { name: "Familie" }).click();
  await box.press("Enter");
  await page.waitForTimeout(400);
  const rechnung = (await entries(page)).find((e) => e.data.title === "Rechnung Steuerberater");
  check(rechnung?.raum === "familie" && rechnung?.data.time === "16:00" && rechnung?.data.reminder !== "aus", `Familie + Erinnern 16:00 (${rechnung?.raum} ${rechnung?.data.time})`);
  check(!(await sheet.getByText("Erinnern heute 16:00").count()), "nach dem Speichern ist die Zeile weg");

  // „Freitag …“ → „Ab Freitag“; „Mehr ›“ = genau drei Zeilen + Speichern
  await box.fill("Freitag Geschenk für Oma besorgen");
  check(await sheet.getByText("Ab Freitag. Return = speichern.").isVisible(), "„Freitag …“ → „Ab Freitag“");
  await sheet.getByRole("button", { name: /^Mehr/ }).click();
  const zeilen = sheet.locator("[data-mehr-zeilen] > div > button");
  check((await zeilen.count()) === 3, `„Mehr“: genau drei Zeilen (${await zeilen.count()})`);
  check((await zeilen.allInnerTexts()).map((t) => t.split("\n")[0]).join("|") === "Ab wann|Wiederholen|An jemanden geben", "Ab wann · Wiederholen · An jemanden geben");
  check(await zeilen.first().getByText("Freitag").isVisible(), "Ab wann: „Freitag“ (korrigierbar)");
  await schalter.getByRole("radio", { name: "Familie" }).click();
  await sheet.getByRole("button", { name: "Speichern", exact: true }).last().click();
  await page.waitForTimeout(500);
  const geschenk = (await entries(page)).find((e) => e.data.title === "Geschenk für Oma besorgen");
  check(geschenk?.data.date === "2026-10-23" && geschenk?.raum === "familie", `ab Freitag, Familie (${geschenk?.data.date})`);
  check(!(await sheet.isVisible().catch(() => false)), "„Speichern“ schließt");

  // Nächstes ＋: Mia wählt wieder vor (Aufgaben „Ich“), keine „letzte Wahl“ mehr
  const wieder = await oeffne(page, "Neue Aufgabe");
  check((await wieder.getByRole("radio", { name: "Ich", checked: true }).count()) === 1, "Aufgaben starten mit „Ich“");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Liste: „Arbeit“ blau, Familie ohne Schild; Filter mit den vorhandenen Räumen
  await page.goto(BASE + "/aufgaben");
  await page.evaluate(() => localStorage.setItem("wasgibts.tagesablauf", JSON.stringify({ version: 1, routine: { ruhe: false } })));
  await page.reload();
  await page.waitForTimeout(900);
  check((await page.getByRole("radiogroup", { name: "Filter" }).getByRole("radio").allInnerTexts()).join("|") === "Alle|Familie|Arbeit", "Filter „Alle · Familie · Arbeit“");
  check(await page.locator('[data-item]:has-text("Tim antworten") [data-schild="arbeit"]').getByText("Arbeit").isVisible(), "„Arbeit“-Schild an „Tim antworten“");
  check(!(await page.locator('[data-item]:has-text("Rechnung Steuerberater") [data-schild]').count()), "Familie ohne Schild");

  // Termin-＋: blaue Chips Tag · Uhrzeit · Dauer
  await page.goto(BASE + "/");
  await page.waitForTimeout(900);
  const termin = await oeffne(page, "Neuer Termin");
  const tbox = termin.getByRole("textbox", { name: "Neuer Termin" });
  check((await tbox.getAttribute("placeholder")) === "Zahnarzt Freitag 13 Uhr", "Platzhalter „Zahnarzt Freitag 13 Uhr“");
  await tbox.fill("Zahnarzt Jonne Fr 16 Uhr");
  const chips = termin.locator("[data-termin-chips] button");
  check((await chips.allInnerTexts()).join(" · ") === "Fr 23. Okt · 16:00 · 1 Std", `Chips „Fr 23. Okt · 16:00 · 1 Std“ (${(await chips.allInnerTexts()).join(" · ")})`);
  check(await termin.getByText("Tag und Uhrzeit hab ich rausgelesen. Antippen = ändern.").isVisible(), "Hinweis „rausgelesen“");
  await termin.locator('[data-chip="dauer"]').click();
  await termin.getByRole("radiogroup", { name: "Dauer" }).getByRole("radio", { name: "30 Min" }).click();
  await tbox.press("Enter");
  await page.waitForTimeout(400);
  const t = (await entries(page)).find((e) => e.typ === "termin" && e.data.title === "Zahnarzt Jonne");
  check(t?.data.date === "2026-10-23" && t?.data.start === "16:00" && t?.data.end === "16:30", `gespeichert Fr 23.10. 16:00–16:30 (${t?.data.date} ${t?.data.start}–${t?.data.end})`);

  // Ohne Uhrzeit: „Uhrzeit?“ hervorgehoben, gespeichert wird erst danach
  await tbox.fill("Oma besuchen Samstag");
  const frage = termin.locator('[data-chip="uhr"]');
  check((await frage.innerText()) === "Uhrzeit?", "Chip „Uhrzeit?“");
  await tbox.press("Enter");
  await page.waitForTimeout(300);
  check(!(await entries(page)).some((e) => e.data.title === "Oma besuchen"), "ohne Uhrzeit nicht gespeichert");
  await termin.getByRole("radiogroup", { name: "Uhrzeit" }).getByRole("radio", { name: "15:00" }).click();
  await tbox.press("Enter");
  await page.waitForTimeout(400);
  const oma = (await entries(page)).find((e) => e.data.title === "Oma besuchen");
  check(oma?.data.date === "2026-10-24" && oma?.data.start === "15:00", `danach gespeichert Sa 15:00 (${oma?.data.date} ${oma?.data.start})`);

  // Rückgängig nimmt ihn wieder weg
  await tbox.fill("Probe morgen 9 Uhr");
  await tbox.press("Enter");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(400);
  check(!(await entries(page)).some((e) => e.data.title === "Probe"), "Rückgängig nimmt den Termin weg");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.goto(BASE + "/tag?datum=2026-10-23");
  await page.waitForTimeout(900);
  check(await page.getByText("Zahnarzt Jonne").first().isVisible(), "im Kalender am Freitag");
};

/**
 * EIN Fenster je Art: ＋ auf der Startseiten-Kachel, ＋ oben auf der
 * Aufgaben-Seite, ＋ im Kalender, ＋ auf der Tag-Seite und „Bearbeiten“
 * (Dein Tag, Kalender) öffnen nacheinander genau dieses Fenster.
 */
export const einFenster = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const zu = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  };
  const erwartet = async (art, wo) => {
    const ok = await eintragFenster(page, art).waitFor({ timeout: 5000 }).then(() => true, () => false);
    check(ok && (await page.locator("[data-fenster]").count()) === 1, `${wo} → Fenster „${art === "aufgabe" ? "Neue Aufgabe" : "Neuer Termin"}“`);
    await zu();
  };

  // Startseite: Kachel-＋
  for (const [name, art] of [["Neue Aufgabe", "aufgabe"], ["Neuer Termin", "termin"]]) {
    const plus = page.getByRole("button", { name }).first();
    await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await plus.click();
    await erwartet(art, `Startseite ＋ ${name}`);
  }
  // Aufgaben-Seite ＋
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Neue Aufgabe" }).first().click();
  await erwartet("aufgabe", "Aufgaben-Seite ＋");
  // Kalender ＋
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  const panel = page.locator("[role=tabpanel]:not([inert])");
  await panel.getByRole("button", { name: "Neuer Termin" }).click();
  await erwartet("termin", "Kalender ＋");
  // Tag-Seite ＋
  await page.goto(BASE + "/tag?datum=2026-10-23");
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "Neuer Termin an diesem Tag" }).click();
  await erwartet("termin", "Tag-Seite ＋");
  // Bearbeiten: Termin antippen → „Bearbeiten“ → dasselbe Fenster („Termin“)
  await page.getByRole("button", { name: /– Möglichkeiten/ }).first().click();
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  const fenster = eintragFenster(page, "termin");
  const offen = await fenster.waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(offen && (await page.getByRole("dialog", { name: "Termin" }).count()) === 1, "Bearbeiten → dasselbe Fenster „Termin“");
  await zu();
};

/**
 * Erinnerungen (Tafel 77/114): beim ersten Start keine Frage; erster Termin
 * mit Uhrzeit → Zeile „Erinnern 30 Min vorher“ → nach dem Schließen des
 * Fensters Mias Frage „Soll ich dich erinnern?“ (Ja, gern / Lieber nicht) →
 * „Lieber nicht“ wird gemerkt.
 */
export const erinnerungFrage = async (page, check) => {
  // Wie ein neues Handy: Mitteilungen noch nicht gefragt (headless meldet sonst „abgelehnt“)
  await page.addInitScript(() => {
    if (!("Notification" in window)) return;
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => window.__notifyPerm ?? "default" });
    Notification.requestPermission = async () => (window.__notifyPerm = "denied");
  });
  await hello(page);
  await page.waitForTimeout(600);
  check(!(await page.getByRole("dialog", { name: "Soll ich dich erinnern?" }).count()), "erster Start: keine Frage nach Mitteilungen");
  const sheet = await oeffne(page, "Neuer Termin");
  await sheet.getByRole("textbox").fill("Zahnarzt morgen 16 Uhr");
  check(await sheet.getByText("Erinnern 30 Min vorher").isVisible(), "Zeile „Erinnern 30 Min vorher“");
  await sheet.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(300);
  check(!(await page.getByRole("dialog", { name: "Soll ich dich erinnern?" }).count()), "keine Frage mitten ins Tippen");
  await sheet.getByRole("button", { name: "Schließen" }).last().click();
  const ask = page.getByRole("dialog", { name: "Soll ich dich erinnern?" });
  check(await ask.waitFor({ timeout: 4000 }).then(() => true, () => false), "danach Mias Frage");
  check((await ask.getByRole("button", { name: "Ja, gern" }).isVisible()) && (await ask.getByRole("button", { name: "Lieber nicht" }).isVisible()), "„Ja, gern“ / „Lieber nicht“");
  await ask.getByRole("button", { name: "Lieber nicht" }).click();
  await page.waitForTimeout(400);
  const saved = await store(page, "wasgibts.mitteilungen");
  check(saved?.answer === "nein" && saved?.asks === 1, "„Lieber nicht“ gemerkt");
  const t = (await entries(page)).find((e) => e.data.title === "Zahnarzt");
  check(t?.data.reminder === "30", "Termin mit Erinnerung 30 Min vorher");
};
