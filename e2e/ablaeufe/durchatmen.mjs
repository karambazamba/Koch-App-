// Durchatmen (A-051, A-061, Tafel 138/139/146): Einstellungen → Durchatmen → Fenster
// („Passt gerade“, Sorten, 12 Übungen, Herz = Liebling), Übung antippen =
// startet sofort (Vollbild), nach 3 s dunkel, Antippen = hell, Art der
// Anleitung wählbar (gemerkt), Stumm-Schalter-Hinweis einmal, Ende „Gut
// gemacht.“ mit „Noch eine“ / „Fertig“ ohne Zähler, Handy-Pause sofort
// dunkel, „Eine Sache“ legt die Aufgabe ganz oben an, Mia startet die Übung
// („Handy-Pause“, Testmodus). Zeit: Übungen laufen per
// `window.__DURCHATMEN_TEMPO__` schneller (1 Min. in 2–3 s).
import { BASE, hello, miaTippen, seedFamily, store } from "../lib.mjs";

const fenster = (page) => page.locator("[data-durchatmen-fenster]");
const vollbild = (page) => page.locator("[data-uebung-vollbild]");
const tempo = (page, t) => page.evaluate((t) => (window.__DURCHATMEN_TEMPO__ = t), t);

async function fensterAuf(page) {
  await page.goto(BASE + "/profil/durchatmen");
  await page.getByRole("button", { name: "Übung aussuchen" }).click();
  await fenster(page).waitFor({ timeout: 5000 });
}

const starte = (page, id) => fenster(page).locator(`[data-uebung="${id}"] button`).first().click();
const startBild = (page) => page.locator("[data-uebung-start]");
/** Start-Bildschirm (A-061, Tafel 146): 3 Schritte, „Wofür?“, dann „Los“ */
async function los(page, check, wo) {
  await startBild(page).waitFor({ timeout: 5000 });
  if (check) {
    check((await startBild(page).locator("[data-schritte] li").count()) === 3, `${wo}: vorher 3 Schritte`);
    check(await startBild(page).locator("[data-wofuer]").getByText("Wofür?").isVisible(), `${wo}: „Wofür?“`);
  }
  await startBild(page).getByRole("button", { name: "Los", exact: true }).click();
}

export const durchatmen = async (page, check) => {
  await hello(page);
  await seedFamily(page);

  // Fenster: Vorschlag, Sorten, alle 12
  await fensterAuf(page);
  check(await fenster(page).getByText("Passt gerade").isVisible(), "Fenster: „Passt gerade“ mit einer Übung");
  check((await page.getByText("Kurz raus, wieder bei dir. Ganz ohne Muss.").count()) === 1, "Kopf: „Kurz raus, wieder bei dir. Ganz ohne Muss.“");
  check((await fenster(page).locator("[data-uebung]").count()) === 12, "12 Übungen in der Liste");
  await fenster(page).getByRole("button", { name: "Augen", exact: true }).click();
  check((await fenster(page).locator("[data-uebung]").count()) === 3, "Sorte „Augen“: 3 Übungen");
  await fenster(page).getByRole("button", { name: "Alle", exact: true }).click();
  const breite = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(breite, "Fenster: nichts ragt seitlich heraus");

  // Herz = Liebling, Lieblinge oben
  await fenster(page).getByRole("button", { name: "Seufzer als Liebling" }).click();
  await page.waitForTimeout(300);
  check((await store(page, "wasgibts.durchatmen"))?.lieblinge?.includes("seufzer"), "Herz: Seufzer ist Liebling (gemerkt)");
  check((await fenster(page).locator("[data-uebung]").first().getAttribute("data-uebung")) === "seufzer", "Lieblinge stehen oben");

  // Alle 12 erklären sich vorher (3 Schritte + „Wofür?“), nichts ragt heraus
  const ids = await fenster(page).locator("[data-uebung]").evaluateAll((els) => els.map((e) => e.dataset.uebung));
  let erklaert = 0;
  for (const id of ids) {
    if (!(await fenster(page).count())) {
      await page.getByRole("button", { name: "Übung aussuchen" }).click();
      await fenster(page).waitFor({ timeout: 5000 });
    }
    await starte(page, id);
    await startBild(page).waitFor({ timeout: 5000 });
    if (!erklaert) check(await page.getByText("Für Ton bitte Stumm-Schalter aus.").isVisible(), "Stumm-Schalter-Hinweis beim ersten Start mit Ton");
    const ok = (await startBild(page).locator("[data-schritte] li").count()) === 3 && (await startBild(page).locator("[data-wofuer]").isVisible());
    const passt = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    const losDa = await startBild(page).getByRole("button", { name: "Los", exact: true }).isVisible();
    if (ok && passt && losDa) erklaert++;
    else check(false, `${id}: Start-Bildschirm unvollständig`);
    await startBild(page).getByRole("button", { name: "Schließen" }).click();
    // Zurück-Eintrag des Vollbilds ist weg (fensterVerlauf), dann das nächste Fenster
    await page.waitForTimeout(900);
  }
  check(erklaert === 12, `alle 12 Übungen zeigen vorher 3 Schritte, „Wofür?“ und „Los“ (${erklaert})`);
  await fensterAuf(page);

  // Kästchen-Atmen in echter Zeit: erst der helle Start-Bildschirm, nach „Los“ und 3 s dunkel, Antippen = hell
  await tempo(page, 1);
  await starte(page, "kaestchen");
  await startBild(page).waitFor({ timeout: 5000 });
  check(!(await fenster(page).count()), "Antippen öffnet den Start-Bildschirm (Fenster zu)");
  check((await startBild(page).locator("[data-startzeile]").innerText()) === "ATMEN · 2 MIN", "Start: „ATMEN · 2 MIN“ und Titel");
  await startBild(page).getByRole("radio", { name: "Nur Klang" }).click();
  check((await store(page, "wasgibts.durchatmen"))?.art === "klang", "Art „Nur Klang“ gemerkt");
  await startBild(page).getByRole("radio", { name: /Stimme \+ Klang/ }).click();
  await page.waitForTimeout(3600);
  check((await startBild(page).count()) === 1 && (await vollbild(page).getAttribute("data-dunkel")) === null, "vor „Los“ bleibt es hell (kein Sofort-Start)");
  await los(page, check, "Kästchen-Atmen");
  await vollbild(page).locator("[data-phase]").waitFor({ timeout: 5000 });
  check((await vollbild(page).locator("[data-phase]").getAttribute("data-phase")) === "ein", "nach „Los“: groß „Ein“");
  check(await vollbild(page).getByRole("button", { name: /zählt mit/ }).isVisible(), "„Mia zählt mit“ und „Pause“");
  check((await vollbild(page).getAttribute("data-dunkel")) === null, "am Anfang hell");
  await page.waitForTimeout(3600);
  check((await vollbild(page).getAttribute("data-dunkel")) !== null, "nach 3 s dunkel (Handy kann weg)");
  check(await page.getByText("Antippen zum Hellmachen").isVisible(), "dunkel: „Antippen zum Hellmachen“");
  const groesse = await vollbild(page).locator("[data-anweisung]").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check(groesse >= 24 && groesse <= 28, `dunkel: Anweisung groß in der Mitte (${groesse} px)`);
  check((await vollbild(page).locator("[data-restzeit]").count()) === 1, "dunkel: Ring mit Restzeit darüber");
  await vollbild(page).click({ position: { x: 40, y: 200 } });
  await page.waitForTimeout(300);
  check((await vollbild(page).getAttribute("data-dunkel")) === null, "Antippen macht hell");
  await vollbild(page).getByRole("button", { name: "Schließen" }).first().click();
  await page.waitForTimeout(500);
  check(!(await vollbild(page).count()), "✕ schließt die Übung");

  // Seufzer schnell durchlaufen: Ende ohne Zähler, „Noch eine“
  await fensterAuf(page);
  await tempo(page, 15);
  await starte(page, "seufzer");
  await los(page, check, "Seufzer");
  const ende = page.locator("[data-uebung-ende]");
  await ende.waitFor({ timeout: 8000 });
  const text = await ende.innerText();
  check(/Gut gemacht\./.test(text) && /Eine halbe Minute nur für dich\./.test(text), "Ende: „Gut gemacht.“ passend zur Dauer");
  check(!/\d/.test(text) && !/Serie|Rekord|mal/i.test(text), `Ende ohne Zähler, ohne Serie (${text.replace(/\s+/g, " ")})`);
  check(!(await page.getByText("Für Ton bitte Stumm-Schalter aus.").count()), "Stumm-Hinweis nur einmal je Gerät");
  await ende.getByRole("button", { name: "Noch eine" }).click();
  await fenster(page).waitFor({ timeout: 5000 });
  check(true, "„Noch eine“ öffnet wieder das Fenster");

  // Handy-Pause (Tafel 146): Schritte wie auf der Tafel, nach „Los“ große Anweisung, läuft durch, „Fertig“ schließt
  await tempo(page, 1);
  await starte(page, "handy-pause");
  await startBild(page).waitFor({ timeout: 5000 });
  check((await startBild(page).locator("[data-schritte]").innerText()).includes("Schau aus dem Fenster, so weit weg wie es geht."), "Handy-Pause: Schritte wie auf der Tafel");
  check((await startBild(page).locator("[data-wofuer]").innerText()).includes("Entspannt die Augen nach viel Bildschirm."), "Handy-Pause: „Wofür?“");
  await los(page, null, "Handy-Pause");
  await page.waitForTimeout(3500);
  check((await vollbild(page).getAttribute("data-dunkel")) !== null, "Handy-Pause: nach „Los“ und 3 s dunkel");
  check((await vollbild(page).locator("[data-anweisung]").innerText()) === "Schau so weit weg, wie es geht.", "Handy-Pause: Anweisung groß");
  check(/sagt dir, wenn die Minute um ist\./.test(await vollbild(page).innerText()), "darunter klein: „… sagt dir, wenn die Minute um ist.“");
  await tempo(page, 30);
  await ende.waitFor({ timeout: 70000 });
  check((await ende.innerText()).includes("Eine Minute nur für deine Augen."), "Ende hell: „Eine Minute nur für deine Augen.“");
  await ende.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  check(!(await ende.count()) && !(await vollbild(page).count()), "„Fertig“ schließt");

  // Eine Sache: Aufgabe ganz oben, dann eine Minute atmen
  await fensterAuf(page);
  await tempo(page, 30);
  await starte(page, "eine-sache");
  await los(page, check, "Eine Sache");
  await page.getByText("Was ist jetzt das Wichtigste? Nur eine Sache.").first().waitFor({ timeout: 5000 });
  await page.getByRole("textbox", { name: "Die eine Sache" }).fill("Das Angebot für Edeka fertig machen");
  await page.getByRole("button", { name: "Sichern" }).click();
  await page.locator("[data-steht-oben]").waitFor({ timeout: 4000 });
  check(await page.locator("[data-steht-oben]").getByText("Steht oben").isVisible(), "„Eine Sache“: Karte „Steht oben“");
  const eintraege = await store(page, "wasgibts.eintraege");
  const neu = eintraege.entries[0];
  check(neu?.typ === "aufgabe" && neu.data.title === "Angebot für Edeka fertig machen" && neu.data.dringend === true && neu.data.date === "2026-10-21", "Aufgabe heute, dringend = ganz oben");
  await ende.waitFor({ timeout: 10000 });
  check(true, "danach eine Minute atmen bis zum Ende");
  await ende.getByRole("button", { name: "Fertig" }).click();
  await page.goto(BASE + "/aufgaben");
  await page.waitForTimeout(800);
  const erste = await page.locator("main li").first().innerText().catch(() => "");
  check(erste.includes("Angebot für Edeka"), `Aufgaben: steht ganz oben (${erste.split("\n")[0]})`);

  // Mia startet die Übung (Testmodus)
  await page.goto(BASE + "/");
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  await tempo(page, 30);
  const box = await miaTippen(page);
  await box.fill("Handy-Pause");
  await box.press("Enter");
  await vollbild(page).waitFor({ timeout: 6000 });
  check((await vollbild(page).getAttribute("data-uebung-vollbild")) === "handy-pause" && (await startBild(page).count()) === 1, "Mia: „Handy-Pause“ öffnet die Übung (Start-Bildschirm)");
  await page.waitForTimeout(800);
  check(!(await page.locator("[data-begleitung-buehne], [role=dialog]").count()), "die Bühne ist zu");
};
