// Eintragen, Kalender, Pinnwand, Wetter, Chat ohne KI (Testmodus)
import { BASE, hello, miaTippen, schnell, seedFamily, store, pinnwandSchreiben } from "../lib.mjs";

const family = async (page, path = "/") => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + path);
  await page.waitForTimeout(1000);
};

export const eintragen = async (page, check) => {
  await family(page, "/?seite=kalender");
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neuer Termin" }).click();
  check(await page.getByRole("dialog", { name: "Neuer Termin" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Fenster „Neuer Termin“");
  await schnell(page, "Friseur 14:00");
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
  check(await page.getByRole("region", { name: "Kühlschranktür" }).isVisible(), "Kühlschranktür");
  check(await page.getByText("Bin um 20 Uhr da").isVisible(), "Zettel von Felix (von gestern – bleibt)");
  await pinnwandSchreiben(page, "Pizza ist im Ofen");
  check(await page.getByText("Pizza ist im Ofen", { exact: true }).first().isVisible(), "eigener Zettel hängt");
  check(!(await page.locator("[data-privat-linie]").count()), "ohne private Zettel keine Linie");
  // Mia: „nur für mich an die Pinnwand“ → Ecke „Nur für mich“ (A-028)
  const box = await miaTippen(page);
  await box.fill("Häng nur für mich an die Pinnwand: Geschenk für Oma");
  await box.press("Enter");
  await page.waitForTimeout(2500);
  await page.goto(BASE + "/pinnwand");
  await page.waitForTimeout(900);
  const linie = page.locator("[data-privat-linie]");
  check(await linie.isVisible(), "Mia „nur für mich“ → Linie „Nur für mich · sieht nur du“");
  const z = await page.getByText("Geschenk für Oma", { exact: true }).first().boundingBox();
  check(Boolean(z) && z.y > (await linie.boundingBox()).y, "der Zettel liegt unter der Linie");
};

export const wetter = async (page, check) => {
  // Kachel (Tafel 120): Himmel je Wetter, kleine stille Szene rechts oben, EIN kurzer Satz
  await family(page, "/");
  const tile = page.locator('a[href="/wetter"][data-himmel]').first();
  check(await tile.isVisible(), "Wetter-Kachel mit Himmel");
  check((await tile.locator("[data-windsack]").count()) === 0 && (await tile.getAttribute("data-szene")) !== "wind", "keine Wind-Szene bei leichtem Wind (erst ab Frischer Wind)");
  check((await tile.locator("svg.wx-szene").count()) === 1, "kleine Szene rechts oben");
  const satz = (await tile.locator("[data-wetter-zeile]").textContent()) ?? "";
  check(satz.length > 0 && satz.length <= 22, `kurzer Satz (${satz})`);
  await page.goto(BASE + "/wetter");
  await page.waitForTimeout(800);
  check(await page.locator(".wx-sky").isVisible(), "Himmel-Karte");
  await page.getByRole("tab", { name: "7 Tage" }).click();
  await page.waitForTimeout(300);
  check((await page.locator(".wx-col").count()) === 7, "7 Säulen");
};

export const chat = async (page, check) => {
  await family(page, "/");
  const box = await miaTippen(page);
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
  await page.goto(BASE + "/profil/kalender");
  await page.waitForTimeout(900);
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

/** „Kalender mitbringen“: Karte im Kalender → Apple → Schritte → Link → „Steht drin.“; „Später“ blendet aus */
export const kalenderMitbringen = async (page, check) => {
  await family(page, "/?seite=kalender");
  const panel = page.locator("[role=tabpanel]:not([inert])");
  const card = panel.getByRole("region", { name: "Kalender mitbringen" });
  check(await card.getByText("Termine schon woanders? Hol sie rein.").isVisible(), "Karte „Termine schon woanders?“");
  await card.getByRole("button", { name: "Apple" }).click();
  const sheet = page.getByRole("dialog", { name: "Apple-Kalender holen" });
  await sheet.getByRole("radio", { name: "iPhone" }).click();
  check(await sheet.getByText("Schritt 1 von 4").isVisible(), "iPhone: Schritt 1 von 4");
  for (let i = 0; i < 4; i++) await sheet.getByRole("button", { name: "Weiter" }).click();
  check(await sheet.getByText(/Der Link ist geheim/).isVisible(), "Hinweis: Link ist geheim");
  await sheet.getByLabel("Kalender-Link").fill("webcal://kalender.test/verein.ics");
  await sheet.getByRole("button", { name: "Verbinden" }).click();
  const done = page.getByRole("dialog", { name: "Apple verbunden" });
  check(await done.getByText(/^Steht drin\./).waitFor({ timeout: 8000 }).then(() => true, () => false), "„Steht drin. … in den nächsten 4 Wochen.“");
  await done.getByRole("button", { name: "Fertig" }).click();
  check(!(await card.isVisible()), "danach keine Karte mehr");
  const abos = await store(page, "wasgibts.kalenderabos");
  check(abos.abos.length === 1 && abos.abos[0].name === "Fußballverein", "Kalender verbunden, Name aus dem Kalender");

  // Später: bei einer neuen Familie blendet „Später“ die Karte aus
  await page.evaluate(() => localStorage.removeItem("wasgibts.kalenderabos"));
  await page.evaluate(() => localStorage.removeItem("wasgibts.kalenderangebot"));
  await page.reload();
  await page.waitForTimeout(1000);
  await card.getByRole("button", { name: "Später" }).click();
  check(!(await card.isVisible()), "„Später“ blendet die Karte aus");
};

export const listeEinfuegen = async (page, check) => {
  await family(page, "/aufgaben");
  // Arbeit ruht nach Feierabend (Tafel 103) – hier immer da, egal zu welcher Uhrzeit der Durchklick läuft
  await page.evaluate(() => localStorage.setItem("wasgibts.tagesablauf", JSON.stringify({ version: 1, routine: { ruhe: false } })));
  await page.reload();
  await page.waitForTimeout(1000);
  check(await page.getByText(/^Heute · /).isVisible(), "Kopf: leise „Heute · …“ unter „Aufgaben“");
  const text = ["Haus:", ...Array.from({ length: 14 }, (_, i) => `☐ Haus-Sache ${i + 1}`), "☑ Fenster putzen", "KINDER", "- [ ] Turnbeutel morgen waschen", ...Array.from({ length: 12 }, (_, i) => `• Kinder-Sache ${i + 1}`), "Arbeit:", "* Angebot bis Freitag", "* Präsentation nächste Woche", "1. Ablage machen"].join("\n");
  // Ganze Liste ins Feld „Neue Aufgabe“ einfügen → „Liste einfügen“ mit Vorschau
  await page.getByRole("button", { name: "Neue Aufgabe" }).first().click();
  const feld = page.getByRole("dialog", { name: "Neue Aufgabe" }).getByRole("textbox", { name: "Neue Aufgabe" });
  await feld.waitFor({ timeout: 5000 });
  await feld.evaluate((el, t) => {
    const data = new DataTransfer();
    data.setData("text", t);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
  const sheet = page.getByRole("dialog", { name: "Liste einfügen" });
  await sheet.waitFor({ timeout: 5000 });
  // Eingefügt = gleich die Vorschau (sonst: Text rein, „Weiter“)
  if (await sheet.getByLabel("Liste hier einfügen").isVisible().catch(() => false)) {
    await sheet.getByLabel("Liste hier einfügen").fill(text);
    await sheet.getByRole("button", { name: "Weiter" }).click();
  }
  check(await sheet.getByText("30 Aufgaben gefunden · 3 mit Datum · 3 Listen (Haus, Kinder, Arbeit)").isVisible(), "Vorschau: 30 Aufgaben · 3 mit Datum · 3 Listen");
  check(await sheet.getByText("1 schon abgehakt").isVisible(), "Abgehaktes weggelassen");
  await sheet.getByRole("checkbox", { name: /Ablage machen/ }).click();
  await sheet.getByRole("button", { name: "29 übernehmen" }).click();
  const entries = (await store(page, "wasgibts.eintraege")).entries;
  check(entries.filter((e) => e.data.liste === "Haus").length === 14, "14 Aufgaben in der Liste „Haus“");
  check(!entries.some((e) => e.data.title === "Ablage machen"), "Abgewähltes nicht übernommen");
  // Alles ist heute (Tafel 103): EINE Liste; Turnbeutel (morgen) und Präsentation (nächste Woche) unter „Geplant“
  check(await page.getByRole("region", { name: "Heute", exact: true }).getByText("Angebot").isVisible(), "die eine Liste zeigt „Angebot“ (bis Freitag)");
  check(!(await page.getByText("Irgendwann", { exact: true }).count()) && !(await page.getByText("von gestern").count()), "kein „Irgendwann“, kein „von gestern“");
  const geplant = page.getByRole("button", { name: /^Geplant · 2/ });
  check(await geplant.isVisible(), "unten leise „Geplant · 2“");
  await geplant.click();
  check(await page.getByRole("region", { name: "Geplant" }).getByText("Turnbeutel waschen").isVisible(), "„Geplant“ zeigt den Turnbeutel");
  // Mehrere Räume da → Chips „Alle · … · Arbeit“, die Wahl wird gemerkt
  const filter = page.getByRole("radiogroup", { name: "Filter" });
  check(await filter.isVisible(), "Filter-Chips, weil es Arbeitsaufgaben gibt");
  await filter.getByRole("radio", { name: "Arbeit" }).click();
  await page.reload();
  await page.waitForTimeout(1000);
  check((await page.getByRole("radiogroup", { name: "Filter" }).getByRole("radio", { name: "Arbeit" }).getAttribute("aria-checked")) === "true", "Filter „Arbeit“ bleibt nach dem Neuladen");
  await page.getByRole("radiogroup", { name: "Filter" }).getByRole("radio", { name: "Alle" }).click();
  const haus = page.getByRole("button", { name: /^Haus · 14/ });
  check(await haus.isVisible(), "Liste „Haus · 14“ eingeklappt");
  check(!(await page.getByText("Haus-Sache 1", { exact: true }).isVisible()), "Haus-Sachen erst nach Aufklappen");
  await haus.click();
  check(await page.getByText("Haus-Sache 1", { exact: true }).isVisible(), "Aufklappen zeigt die Haus-Sachen");
  await page.goto(BASE + "/");
  await page.waitForTimeout(1000);
  const tile = page.locator('[data-tile~="aufgaben"]').first();
  check(await tile.getByText("Angebot").isVisible(), "Kachel zeigt „Angebot“ (bis Freitag)");
  check(await tile.getByText("Arbeit", { exact: true }).first().isVisible(), "Kachel: kleines Schild „Arbeit“");
  check(!(await tile.getByText("Haus-Sache 1").isVisible()), "Kachel zeigt keine Liste ohne Datum");
};

export const todoistAufgaben = async (page, check) => {
  await family(page, "/");
  const box = await miaTippen(page);
  await box.fill("Hol meine Todoist-Aufgaben");
  await box.press("Enter");
  // Vorschlag der KI (Testmodus): „Passt“ führt den App-Befehl aus
  const passt = page.getByRole("button", { name: /^Passt/ });
  if (await passt.waitFor({ timeout: 5000 }).then(() => true, () => false)) await passt.click();
  const sheet = page.getByRole("dialog", { name: "Todoist-Aufgaben holen" });
  check(await sheet.waitFor({ timeout: 8000 }).then(() => true, () => false), "Mia öffnet „Todoist-Aufgaben holen“");
  check(await sheet.getByRole("radiogroup", { name: "Ich bin am" }).isVisible(), "Umschalter „Ich bin am …“");
  for (let i = 0; i < 3; i++) await sheet.getByRole("button", { name: "Weiter" }).click();
  await sheet.getByLabel("Kalender-Link").fill("https://app.todoist.com/app/today");
  await sheet.getByRole("button", { name: "Verbinden" }).click();
  check(await sheet.getByText(/Kalender-Abonnement-URL/).first().isVisible(), "falscher Link: freundlich erklärt");
  while (await sheet.getByRole("button", { name: "Weiter" }).isVisible()) await sheet.getByRole("button", { name: "Weiter" }).click();
  await sheet.getByLabel("Kalender-Link").fill("https://todoist.test/ical");
  await sheet.getByRole("button", { name: "Verbinden" }).click();
  const done = page.getByRole("dialog", { name: "Todoist verbunden" });
  check(await done.getByText("Steht drin. 2 Aufgaben zum Nachschauen.").waitFor({ timeout: 8000 }).then(() => true, () => false), "„Steht drin. 2 Aufgaben zum Nachschauen.“");
  await done.getByRole("button", { name: "Fertig" }).click();
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(1000);
  // Todoist-Aufgaben mit Tag (nach dem Testtag) warten unter „Geplant“ (Tafel 103/104)
  check(!(await page.getByText("Oma anrufen").isVisible()), "Todoist-Aufgabe mit Tag erst ab dem Tag");
  await page.getByRole("button", { name: /^Geplant · 2/ }).click();
  check(await page.getByText("Oma anrufen").isVisible(), "Todoist-Aufgabe unter „Geplant“ auf der Aufgaben-Seite");
};
