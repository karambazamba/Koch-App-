// Eintragen, Kalender, Pinnwand, Wetter, Chat ohne KI (Testmodus)
import { BASE, hello, seedFamily, store } from "../lib.mjs";

const family = async (page, path = "/") => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + path);
  await page.waitForTimeout(1000);
};

export const eintragen = async (page, check) => {
  await family(page, "/?seite=kalender");
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neu eintragen" }).click();
  await page.waitForTimeout(500);
  check(await page.getByText("Was möchtest du eintragen?").isVisible(), "Eintragen-Fenster");
  await page.getByRole("button", { name: /^Termin/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("textbox").first().fill("Friseur");
  await page.locator('input[type="time"]').first().fill("14:00");
  await page.getByRole("dialog").getByRole("button", { name: "Eintragen" }).last().click();
  await page.waitForTimeout(600);
  const entries = (await store(page, "wasgibts.eintraege")).entries;
  check(entries.some((e) => e.data.title === "Friseur" && e.typ === "termin"), "Termin „Friseur“ gespeichert");
};

export const kalender = async (page, check) => {
  await family(page, "/?seite=kalender");
  const panel = page.locator("[role=tabpanel]:not([inert])");
  check(await panel.getByText("Oktober").first().isVisible(), "Monat Oktober");
  await panel.locator('button[aria-label^="Freitag, 23. Oktober"]').click();
  await page.waitForTimeout(400);
  check(await panel.getByText("Fußball Mathis").isVisible(), "Tag 23. zeigt „Fußball Mathis“");
};

export const pinnwand = async (page, check) => {
  await family(page, "/pinnwand");
  check(await page.getByText("Bin um 20 Uhr da").isVisible(), "Nachricht von Felix");
  await page.getByRole("textbox", { name: "Nachricht an alle" }).fill("Pizza ist im Ofen");
  await page.getByRole("button", { name: "Anheften" }).click();
  await page.waitForTimeout(400);
  check(await page.getByText("Pizza ist im Ofen").isVisible(), "eigene Nachricht angeheftet");
};

export const wetter = async (page, check) => {
  await family(page, "/wetter");
  check(await page.locator(".wx-sky").isVisible(), "Himmel-Karte");
  await page.getByRole("tab", { name: "7 Tage" }).click();
  await page.waitForTimeout(300);
  check((await page.locator(".wx-col").count()) === 7, "7 Säulen");
};

export const chat = async (page, check) => {
  await family(page, "/");
  await page.getByRole("button", { name: /was ansteht/ }).first().click();
  await page.waitForTimeout(800);
  const box = page.getByRole("textbox").last();
  await box.fill("Was steht auf der Pinnwand?");
  await box.press("Enter");
  await page.waitForTimeout(2500);
  check(await page.getByText(/Bin um 20 Uhr da/).last().isVisible(), "Mia liest die Pinnwand vor");
};

/** Selbst gebaute Kalender-Datei im Google-Stil (keine echten Daten) */
const ICS = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "X-WR-CALNAME:Familie",
  "BEGIN:VEVENT",
  "UID:e2e-1@google.com",
  "DTSTART;TZID=Europe/Berlin:20261022T170000",
  "DTEND;TZID=Europe/Berlin:20261022T180000",
  "RRULE:FREQ=WEEKLY",
  "SUMMARY:Schwimmen",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:e2e-2@google.com",
  "DTSTART;VALUE=DATE:20261030",
  "DTEND;VALUE=DATE:20261031",
  "SUMMARY:Omas Geburtstag",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:e2e-3@google.com",
  "DTSTART;TZID=Europe/Berlin:20260901T100000",
  "SUMMARY:Alt",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

export const kalenderImport = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.funktionen": { version: 2, on: ["vorrat", "rezepte", "wochenplan", "regiontipps", "kalender"] } });
  // Eintragen-Fenster: leiser Link
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neu eintragen" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Aus Apple/Google übernehmen" }).click();
  await page.waitForURL(/\/profil\/kalender/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/profil/kalender"), "Eintragen → „Aus Apple/Google übernehmen“ öffnet die Seite");
  const before = (await store(page, "wasgibts.eintraege")).entries.length;
  await page.locator("#kalender-datei").setInputFiles({ name: "familie.ics", mimeType: "text/calendar", buffer: Buffer.from(ICS) });
  await page.waitForTimeout(500);
  check((await page.getByTestId("kalender-vorschau").textContent())?.trim() === "3 Termine gefunden · 1 Serie · ab heute 2", "Vorschau „3 Termine gefunden · 1 Serie · ab heute 2“");
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await page.waitForTimeout(500);
  const after = (await store(page, "wasgibts.eintraege")).entries;
  check(after.length === before + 2 && after.some((e) => e.data.title === "Schwimmen" && e.data.source?.kind === "google"), "2 Termine übernommen (mit Herkunft)");
  check(await page.getByText("2 Termine übernommen").isVisible(), "Meldung „2 Termine übernommen“");
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(400);
  check((await store(page, "wasgibts.eintraege")).entries.length === before, "Rückgängig nimmt alle auf einmal weg");
  // Nochmal einlesen und zweimal übernehmen: keine doppelten
  for (let i = 0; i < 2; i++) {
    await page.locator("#kalender-datei").setInputFiles({ name: "familie.ics", mimeType: "text/calendar", buffer: Buffer.from(ICS) });
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Übernehmen" }).click();
    await page.waitForTimeout(400);
  }
  check((await store(page, "wasgibts.eintraege")).entries.length === before + 2, "doppelt eingelesen → nicht doppelt");
};

/** Kalender-Link (Abo) im Testmodus: https://kalender.test/… liefert der Testserver selbst */
export const kalenderAbo = async (page, check) => {
  await hello(page);
  await seedFamily(page, { "wasgibts.funktionen": { version: 2, on: ["vorrat", "rezepte", "wochenplan", "regiontipps", "kalender"] } });
  await page.goto(BASE + "/profil/kalender");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Kalender verbinden" }).click();
  await page.getByPlaceholder("https://… oder webcal://…").fill("webcal://kalender.test/verein.ics");
  await page.getByRole("button", { name: "Verbinden", exact: true }).click();
  await page.getByText("Verbunden – 2 Termine").waitFor({ timeout: 6000 }).catch(() => {});
  check(await page.getByText("Verbunden – 2 Termine").isVisible(), "Abo hinzugefügt: „Verbunden – 2 Termine“");
  check((await page.getByRole("textbox", { name: "Name des Kalenders" }).inputValue()) === "Fußballverein", "Name aus dem Kalender übernommen");
  const own = (await store(page, "wasgibts.eintraege")).entries.length;
  check(!(await store(page, "wasgibts.eintraege")).entries.some((e) => e.besitzer?.startsWith("abo:")), "Abo-Termine nicht in den eigenen Terminen");

  // Im Kalender: Do 22.10. Training, Sa 24.10. Turnier
  const day = async (label) => {
    await page.goto(BASE + "/?seite=kalender");
    await page.waitForTimeout(900);
    const panel = page.locator("[role=tabpanel]:not([inert])");
    await panel.locator(`button[aria-label^="${label}"]`).click();
    await page.waitForTimeout(400);
    return panel;
  };
  let panel = await day("Donnerstag, 22. Oktober");
  check(await panel.getByText("Training", { exact: true }).isVisible(), "Abo-Termin erscheint im Kalender");
  await panel.getByRole("button", { name: /Training – Möglichkeiten/ }).first().click();
  await page.waitForTimeout(500);
  check(await page.getByText(/nur lesen/).isVisible(), "Antippen: nur lesen, aus „Fußballverein“");
  await page.getByRole("button", { name: "In unseren Kalender kopieren" }).click();
  await page.waitForTimeout(500);
  const copied = (await store(page, "wasgibts.eintraege")).entries;
  check(copied.length === own + 1 && copied.some((e) => e.data.title === "Training" && e.besitzer === "lokal"), "„In unseren Kalender kopieren“ macht einen eigenen Termin");

  // Änderung im Original kommt an (Link mit v=2, Abruf fällig)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("wasgibts.kalenderabos"));
    s.abos[0].url = "https://kalender.test/verein.ics?v=2";
    s.abos[0].fetchedAt = "2026-10-21T07:00:00.000Z";
    localStorage.setItem("wasgibts.kalenderabos", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(1500);
  panel = await day("Donnerstag, 22. Oktober");
  check(await panel.getByText("Training (verlegt)").isVisible(), "Änderung im Feed kommt an (verlegt)");
  panel = await day("Samstag, 24. Oktober");
  check(!(await panel.getByText("Turnier").count()), "im Original gelöschter Termin verschwindet");
};
