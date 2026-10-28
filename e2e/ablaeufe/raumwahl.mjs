// Räume Familie · Ich · Arbeit (A-034, Nachtrag zu A-020): EINE Raum-Wahl
// (ui/RaumChips) in Schnelleingabe, Detail-Fenster, Bearbeiten und unter
// Mias Bestätigung; Mia wählt vor (Termine Familie, Aufgaben Ich, sonst aus
// dem Satz), einmal „Hab … gewählt. Tippen zum Ändern.“, Mia lernt aus
// Korrekturen („Was ich mir gemerkt hab“), Raum später ändern (Chip im
// Detail-Fenster, lange drücken auf die Zeile) mit Rückgängig, gleiche
// Anzeige in Listen und Kalender, Migration v4 → v5 und zwei Konten
// (Familie kommt beim Partner an, Ich/Arbeit nicht). Zeit: Mi 21.10. 10:30.
import { BASE, FAKE_HOEREN, eintragFenster, familieEinladen, hello, kontoAnmelden, newPage, perLinkBeitreten, seedFamily, store } from "../lib.mjs";

const entries = async (page) => (await store(page, "wasgibts.eintraege"))?.entries ?? [];
const finde = async (page, title) => (await entries(page)).find((e) => e.data.title === title);
const chipsText = async (gruppe) => (await gruppe.getByRole("radio").allInnerTexts()).map((t) => t.trim()).join("|");
const aktiv = async (gruppe, name) => (await gruppe.getByRole("radio", { name, checked: true }).count()) === 1;

async function oeffne(page, name) {
  const plus = page.getByRole("button", { name }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  const sheet = page.getByRole("dialog", { name });
  await sheet.waitFor({ timeout: 5000 });
  return sheet;
}

/** Lange drücken (600 ms) auf ein Element */
async function langDruecken(page, locator) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
}

const T = "2026-10-20T08:00:00.000Z";
const eintrag = (id, typ, title, raum, extra = {}) => ({
  id,
  typ,
  raum,
  besitzer: "lokal",
  erstellt: T,
  geaendert: T,
  data: typ === "termin" ? { title, date: "2026-10-21", start: "16:00", reminder: "aus", repeat: null, doneDates: [], skipDates: [], ...extra } : { title, date: "2026-10-21", reminder: "aus", repeat: null, doneOn: null, doneDates: [], skipDates: [], ...extra },
});

export const raumChipsPlus = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);

  // Aufgabe: Chips „Familie · Ich · Arbeit“, Standard Ich, einmal der kleine Satz
  const aufgabe = await oeffne(page, "Neue Aufgabe");
  const chipsA = aufgabe.getByRole("radiogroup", { name: "Wer sieht es?" });
  check((await chipsText(chipsA)) === "Familie|Ich|Arbeit", `Aufgabe: Chips „Familie · Ich · Arbeit“ (${await chipsText(chipsA)})`);
  const feldA = aufgabe.getByRole("textbox", { name: "Neue Aufgabe" });
  await feldA.fill("Tim antworten");
  check(await aktiv(chipsA, "Ich"), "Aufgabe ohne Hinweis: Ich ist vorgewählt");
  check(await aufgabe.getByText("Nur für dich gewählt. Tippen zum Ändern.").isVisible(), "beim allerersten Mal: „… gewählt. Tippen zum Ändern.“");
  await chipsA.getByRole("radio", { name: "Arbeit" }).click();
  check(!(await aufgabe.locator("[data-raum-hinweis]").count()), "nach dem Tippen ist der Satz weg");
  await feldA.press("Enter");
  await page.waitForTimeout(400);
  check((await finde(page, "Tim antworten"))?.raum === "arbeit", "von Hand korrigiert: gespeichert als Arbeit");
  const gemerkt = await store(page, "wasgibts.raumgedaechtnis");
  check(gemerkt?.worte?.some((w) => w.wort === "tim" && w.raum === "arbeit"), "Mia merkt sich „tim“ → Arbeit");
  await feldA.fill("Tim zurückrufen");
  check(await aktiv(chipsA, "Arbeit"), "beim nächsten Mal wählt Mia gleich Arbeit");
  await feldA.fill("Elternabend vorbereiten");
  check(await aktiv(chipsA, "Familie"), "„Elternabend“ → Familie");
  check(!(await aufgabe.locator("[data-raum-hinweis]").count()), "der Satz kommt nie wieder");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Termin: dieselben Chips, Standard Familie, Mia rät aus dem Satz
  const sheet = await oeffne(page, "Neuer Termin");
  const chipsT = sheet.getByRole("radiogroup", { name: "Wer sieht es?" });
  check((await chipsText(chipsT)) === "Familie|Ich|Arbeit", "Termin: dieselben Chips in derselben Reihenfolge");
  const feldT = sheet.getByRole("textbox", { name: "Neuer Termin" });
  for (const [satz, raum, title] of [
    ["Kino Samstag 20 Uhr", "Familie", "Kino"],
    ["Lieferant Tohuus Freitag 9 Uhr", "Arbeit", "Lieferant Tohuus"],
    ["Zahnarzt Freitag 13 Uhr", "Ich", "Zahnarzt"],
    ["Kita-Fest Samstag 11 Uhr", "Familie", "Kita-Fest"],
  ]) {
    await feldT.fill(satz);
    check(await aktiv(chipsT, raum), `„${satz}“ → ${raum}`);
    await feldT.press("Enter");
    await page.waitForTimeout(400);
    check(Boolean(await finde(page, title)), `${title} eingetragen`);
  }
  const raeume = Object.fromEntries((await entries(page)).map((e) => [e.data.title, e.raum]));
  check(raeume["Kino"] === "familie" && raeume["Lieferant Tohuus"] === "arbeit" && raeume.Zahnarzt === "ich", `gespeichert: ${JSON.stringify(raeume)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // Kalender: Filter „Alle · Familie · Ich · Arbeit“, Kennzeichen wie in den Listen
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  const panel = page.locator("[role=tabpanel]:not([inert])");
  const filter = panel.getByRole("radiogroup", { name: "Filter" });
  check((await chipsText(filter)) === "Alle|Familie|Ich|Arbeit", `Kalender-Filter (${await chipsText(filter)})`);
  await panel.getByRole("radio", { name: "Liste" }).click();
  await filter.getByRole("radio", { name: "Ich" }).click();
  await page.waitForTimeout(400);
  check((await panel.getByText("Zahnarzt").count()) > 0 && !(await panel.getByText("Kino").count()), "Filter Ich: nur Zahnarzt");
  await filter.getByRole("radio", { name: "Alle" }).click();
};

export const raumAendern = async (page, check) => {
  await hello(page);
  await seedFamily(page, {
    "wasgibts.eintraege": { version: 5, migratedTermine: true, seenReminders: [], entries: [eintrag("t1", "termin", "Zahnarzt", "ich"), eintrag("t2", "termin", "Kundentermin", "arbeit"), eintrag("t3", "termin", "Elternabend", "familie"), eintrag("a1", "aufgabe", "Rechnung zahlen", "ich")] },
  });
  await page.goto(BASE + "/tag?datum=2026-10-21");
  await page.waitForTimeout(900);

  // Gleiche Anzeige: Ich = graues Schloss, Arbeit = blaues Schild, Familie nichts
  const zeile = (t) => page.getByRole("button", { name: new RegExp(`${t} – Möglichkeiten`) }).first();
  check((await zeile("Zahnarzt").locator('[data-schild="ich"]').count()) === 1, "Zahnarzt: kleines Schloss");
  check(await zeile("Kundentermin").locator('[data-schild="arbeit"]').getByText("Arbeit").isVisible(), "Kundentermin: Schild „Arbeit“");
  check(!(await zeile("Elternabend").locator("[data-schild]").count()), "Elternabend: kein Kennzeichen");

  // Detail-Fenster: dieselben Chips, ein Tipp ändert – mit Rückgängig
  await zeile("Zahnarzt").click();
  const detail = page.getByRole("dialog", { name: "Zahnarzt" });
  await detail.waitFor({ timeout: 5000 });
  const chips = detail.getByRole("radiogroup", { name: "Wer sieht es?" });
  check(await aktiv(chips, "Ich"), "Detail-Fenster zeigt Ich");
  await chips.getByRole("radio", { name: "Familie" }).click();
  await page.waitForTimeout(400);
  check((await finde(page, "Zahnarzt"))?.raum === "familie", "Zahnarzt jetzt Familie");
  const rueck = page.getByRole("button", { name: "Rückgängig" });
  check(await rueck.isVisible(), "Meldung „Für Familie · Rückgängig“");
  await rueck.click();
  await page.waitForTimeout(400);
  check((await finde(page, "Zahnarzt"))?.raum === "ich", "Rückgängig: wieder Ich");

  // Lange drücken auf die Zeile → „Für Familie / Nur ich / Arbeit“
  await langDruecken(page, zeile("Elternabend"));
  const menue = page.locator("[data-raum-menue]");
  check(await menue.waitFor({ timeout: 5000 }).then(() => true, () => false), "lange drücken öffnet die Raum-Wahl");
  check((await menue.getByRole("radio").allInnerTexts()).map((t) => t.trim()).join("|") === "Für Familie|Nur ich|Arbeit", "„Für Familie / Nur ich / Arbeit“");
  await menue.getByRole("radio", { name: "Arbeit" }).click();
  await page.waitForTimeout(400);
  check((await finde(page, "Elternabend"))?.raum === "arbeit", "Elternabend jetzt Arbeit");
  check(await zeile("Elternabend").locator('[data-schild="arbeit"]').isVisible(), "Schild erscheint sofort");

  // Aufgaben-Seite: dasselbe Schloss, lange drücken geht auch dort
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(900);
  const aufgabe = page.locator('[data-item]:has-text("Rechnung zahlen")');
  check((await aufgabe.locator('[data-schild="ich"]').count()) === 1, "Aufgabe „Ich“: Schloss");
  await langDruecken(page, aufgabe.getByRole("button", { name: /Rechnung zahlen – Möglichkeiten/ }));
  await page.locator("[data-raum-menue]").getByRole("radio", { name: "Für Familie" }).click();
  await page.waitForTimeout(400);
  check((await finde(page, "Rechnung zahlen"))?.raum === "familie", "Aufgabe jetzt für die Familie");

  // Mia hat gelernt – und man kann es vergessen
  await page.goto(BASE + "/profil/mia-merkt");
  await page.waitForTimeout(700);
  check(await page.getByRole("heading", { name: "Was ich mir gemerkt hab" }).isVisible(), "Einstellungen → Mia → „Was ich mir gemerkt hab“");
  const raumListe = page.getByRole("region", { name: "Wer was sieht" });
  check(await raumListe.getByText("Elternabend").isVisible(), "gelernt: „Elternabend“ → Arbeit");
  await raumListe.getByRole("button", { name: "Elternabend vergessen" }).click();
  await page.waitForTimeout(300);
  check(!(await store(page, "wasgibts.raumgedaechtnis")).worte.some((w) => w.wort === "elternabend"), "einzeln gelöscht");
};

export const raumSprache = async (page, check) => {
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
    return finde(page, title);
  };
  const lieferant = await sprich("Morgen um 9 Lieferant im Tohuus", "Lieferant");
  check(lieferant?.raum === "arbeit", `Tohuus → Arbeit (${lieferant?.raum})`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  const arzt = await sprich("Kinderarzt Freitag 15 Uhr", "Kinderarzt");
  check(arzt?.raum === "familie", `Kinderarzt → Familie (${arzt?.raum})`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  // Mias Bestätigung trägt den Raum-Chip „Ich ⌄“ – ein Tipp, dieselben Chips
  const friseur = await sprich("Friseur Freitag 10 Uhr", "Friseur");
  check(friseur?.raum === "ich", `Friseur → Ich (${friseur?.raum})`);
  const chip = page.locator("[data-raum-bestaetigung]").last();
  check(await chip.getByRole("button", { name: /Wer sieht es: Ich – ändern/ }).isVisible(), "unter „Steht drin.“ der Chip „Ich ⌄“");
  await chip.getByRole("button", { name: /Wer sieht es/ }).click();
  await chip.getByRole("radiogroup", { name: "Wer sieht es?" }).getByRole("radio", { name: "Familie" }).click();
  await page.waitForTimeout(400);
  check((await finde(page, "Friseur"))?.raum === "familie", "per Chip auf Familie geändert");
  await page.keyboard.press("Escape");
};

export const raumMigration = async (page, check) => {
  await hello(page);
  // Alter Stand (v4): Aufgaben gehörten dem Ersteller (Raum „familie“), Wochencheck-„Privat“ mit Etikett
  await seedFamily(page, {
    "wasgibts.eintraege": { version: 4, migratedTermine: true, seenReminders: [], entries: [eintrag("a1", "aufgabe", "Steuer machen", "familie"), eintrag("p1", "termin", "Physio", "familie", { label: "Privat" }), eintrag("f1", "termin", "Elternabend", "familie"), eintrag("w1", "termin", "Kundentermin", "arbeit")] },
  });
  await page.goto(BASE + "/tag?datum=2026-10-21");
  await page.waitForTimeout(900);
  check(await page.getByText("Physio").first().isVisible(), "alter Termin ist da");
  check(!(await page.getByText("Privat").count()), "Etikett „Privat“ wird nicht gezeigt");
  // gespeichert wird beim nächsten Ändern: einmal etwas eintragen
  await page.getByRole("button", { name: "Neuer Termin an diesem Tag" }).click();
  const fenster = eintragFenster(page, "termin");
  await fenster.waitFor({ timeout: 5000 });
  await fenster.getByRole("textbox").fill("Kino 20 Uhr");
  await fenster.getByRole("textbox").press("Enter");
  await page.waitForTimeout(500);
  const s = await store(page, "wasgibts.eintraege");
  const raum = (id) => s.entries.find((x) => x.id === id);
  check(s.version === 5, `Speicher v5 (${s.version})`);
  check(raum("a1")?.raum === "ich", "bestehende Aufgabe → Ich (wie bisher nur für den Ersteller)");
  check(raum("p1")?.raum === "ich" && raum("p1")?.data.label === "Privat", "„Privat“ → Ich, Etikett bleibt gespeichert");
  check(raum("f1")?.raum === "familie" && raum("w1")?.raum === "arbeit", "Termine bleiben Familie bzw. Arbeit");
  check(s.entries.length === 5, "nichts verloren");
};

// Zwei Konten (KONTEN_TEST=1): Familie-Termin und Familie-Aufgabe kommen beim
// Partner an, Ich und Arbeit nie; Lisa hakt die Familien-Aufgabe ab, Felix
// sieht „erledigt von Lisa“.
export const raeumeZweiKonten = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await seedFamily(page, {
    "wasgibts.eintraege": {
      version: 5,
      migratedTermine: true,
      seenReminders: [],
      entries: [
        eintrag("r-tf", "termin", "Laternenumzug", "familie"),
        eintrag("r-ti", "termin", "Zahnarzt Felix", "ich"),
        eintrag("r-ta", "termin", "Lieferant Felix", "arbeit"),
        eintrag("r-af", "aufgabe", "Müll rausbringen", "familie"),
        eintrag("r-ai", "aufgabe", "Geschenk für Lisa", "ich"),
        eintrag("r-aa", "aufgabe", "Angebot schreiben", "arbeit"),
      ],
    },
  });
  await kontoAnmelden(page, `felix-raeume-${tag}@example.com`);
  await page.getByRole("button", { name: "Mitnehmen" }).click();
  const link = await familieEinladen(page);
  const profile = await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"));
  const besucht = await page.evaluate(() => localStorage.getItem("wasgibts.miadenkt"));
  const hat = (p, text) => p.evaluate((t) => (localStorage.getItem("wasgibts.eintraege") ?? "").includes(t), text);
  const warte = (p, text) => p.waitForFunction((t) => (localStorage.getItem("wasgibts.eintraege") ?? "").includes(t), text, { timeout: 20000, polling: 250 }).then(() => true, () => false);

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await pageB.evaluate(([p, m]) => {
      localStorage.setItem("familienkueche.haushaltsprofil", p);
      if (m) localStorage.setItem("wasgibts.miadenkt", m);
    }, [profile, besucht]);
    await perLinkBeitreten(pageB, link, `lisa-raeume-${tag}@example.com`);

    check(await warte(pageB, "Laternenumzug"), "Lisa: Familie-Termin von Felix kommt an");
    check(await warte(pageB, "Müll rausbringen"), "Lisa: Familie-Aufgabe von Felix kommt an");
    await pageB.waitForTimeout(4000);
    for (const t of ["Zahnarzt Felix", "Lieferant Felix", "Geschenk für Lisa", "Angebot schreiben"]) check(!(await hat(pageB, t)), `Lisa sieht „${t}“ nie (Ich/Arbeit)`);

    // Lisa sieht die Familien-Aufgabe in ihrer Liste („von Felix“) und hakt sie ab
    await pageB.goto(BASE + "/aufgaben");
    const zeile = pageB.locator('[data-item]:has-text("Müll rausbringen")');
    check(await zeile.getByText("von Felix").waitFor({ timeout: 8000 }).then(() => true, () => false), "Lisa: „von Felix“ an der Familien-Aufgabe");
    check(!(await pageB.getByText("Geschenk für Lisa").count()), "Lisa: Felix’ Ich-Aufgabe nicht in der Liste");
    await zeile.getByRole("checkbox").first().click();
    const erledigt = await page
      .waitForFunction(() => JSON.parse(localStorage.getItem("wasgibts.eintraege") ?? "null")?.entries?.some((e) => e.data.title === "Müll rausbringen" && e.data.doneOn && e.data.doneBy), null, { timeout: 20000, polling: 250 })
      .then(() => true, () => false);
    check(erledigt, "Felix: Aufgabe ist erledigt, mit „erledigt von“");
    await page.goto(BASE + "/aufgaben");
    await page.getByRole("button", { name: /Erledigte anzeigen/ }).click();
    check(await page.getByText("erledigt von Lisa").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "Felix: „erledigt von Lisa“");

    check((await hat(page, "Zahnarzt Felix")) && (await hat(page, "Angebot schreiben")), "Ich und Arbeit bleiben bei Felix");
  } finally {
    await pageB.close();
  }
};
