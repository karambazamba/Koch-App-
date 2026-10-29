// Mini-Kreise oben (A-050, Tafel 143 + Nachtrag „kein Schild“) und ihre
// Fenster (Tafel 137/2–4), mit echten Touch-Gesten:
// `kreiseOben`: Familie-Beispiel auf iPhone SE, 15 Pro, Pixel 7 – 5 Kreise à
// 56 px (mit „Was los?“, A-055: Eutin + Testdaten) gleich verteilt, Wörter ganz, keine Schilder/Zahlen; Wischen über die
// Reihe wechselt die Seite. `kreisFenster`: Sport plant „Sa 10:00 Volleyball“
// (Termin im Raum „Ich“), Timer startet mit einem Tipp und steht dann mit
// Restzeit vorn, Pause öffnet Durchatmen, Rätsel das Rätsel-Fenster, Was los? „Was ist los
// in Eutin?“ – man bleibt
// auf der Startseite. `kreiseBearbeiten`: an/aus und Reihenfolge in „Kreise
// oben“, gespeichert, nichts gelöscht. `kreiseMigration`:
// Startseite v9 mit Sport/Timer XS und Im Haus → Kreise, Im Haus weg und unter
// Essen erreichbar.
import { BASE, hello, losGehts, newPage, store, swipe } from "../lib.mjs";

const panel = (page) => page.locator("[role=tabpanel]:not([inert])");
const reihe = (page) => panel(page).locator("nav[data-kreise]");

/** Die Reihe messen: Größe, Wörter ganz, Abstände, Text je Kreis */
function messen() {
  const nav = document.querySelector("[role=tabpanel]:not([inert]) nav[data-kreise]");
  if (!nav) return null;
  const vw = window.innerWidth;
  return [...nav.querySelectorAll("[data-kreis]")].map((b) => {
    const kreis = b.querySelector(".kreis").getBoundingClientRect();
    const wort = b.querySelector("[data-kreis-wort]");
    const w = wort.getBoundingClientRect();
    return {
      id: b.dataset.kreis,
      groesse: Math.round(kreis.width),
      hoch: Math.round(kreis.height),
      wortGanz: wort.scrollWidth <= wort.clientWidth + 1 && w.left >= 0 && w.right <= vw && !/…/.test(wort.textContent),
      zeilen: Math.round(w.height / parseFloat(getComputedStyle(wort).lineHeight || "14")),
      text: b.innerText.replace(/\s+/g, " ").trim(),
      links: Math.round(kreis.left),
      rechts: Math.round(vw - kreis.right),
    };
  });
}

export const kreiseOben = async (page, check, device) => {
  const browser = page.context().browser();
  for (const geraet of ["iPhone SE", device]) {
    const p = await newPage(browser, geraet);
    try {
      await p.goto(BASE);
      await losGehts(p, "Für die Familie");
      await reihe(p).waitFor();
      await p.waitForTimeout(800);
      const m = await p.evaluate(messen);
      const wo = `${geraet}`;
      // „Was los?“ (A-055) steht da: Wohnort Eutin, Testdaten im Testserver
      check(m && m.map((k) => k.id).join() === "sport,pause,waslos,raetsel,timer", `${wo}: Kreise Sport · Pause · Was los? · Rätsel · Timer (${m?.map((k) => k.id).join(", ")})`);
      check(m?.every((k) => k.groesse === 56 && k.hoch === 56), `${wo}: 5 Kreise à 56 px (${m?.map((k) => k.groesse).join("/")})`);
      check(m?.every((k) => k.wortGanz), `${wo}: jedes Wort ganz`);
      check(m?.every((k) => ["Sport", "Pause", "Was los?", "Rätsel", "Timer"].includes(k.text)), `${wo}: unter jedem Kreis genau EIN Wort, kein Schild, keine Zahl (${m?.map((k) => `„${k.text}“`).join(" ")})`);
      check(m && Math.abs(m[0].links - m.at(-1).rechts) <= 3 && m[0].links >= 12 && m[0].links <= 18, `${wo}: gleich verteilt über die ganze Breite (Rand ${m?.[0].links}/${m?.at(-1).rechts} px)`);
      check((await p.locator("[data-sport-ring]").count()) === 1, `${wo}: nur Sport hat einen Ring`);
      // Nicht wischbar: Wischen über die Reihe wechselt die Seite
      const box = await reihe(p).boundingBox();
      await swipe(p, { x: box.x + box.width * 0.8, y: box.y + 30, dx: -180, dy: 6 });
      await p.waitForTimeout(900);
      const tab = await p.getByRole("tab", { selected: true }).innerText();
      check(/Essen/.test(tab), `${wo}: Wischen über die Kreise wechselt die Seite (${tab})`);
    } finally {
      await p.context().close();
    }
  }
};

export const kreisFenster = async (page, check) => {
  await hello(page);
  await reihe(page).waitFor();
  // Sport: Woche planen → Sa 10:00 Volleyball, Termin im Raum „Ich“
  await reihe(page).locator('[data-kreis="sport"]').click();
  const sport = page.getByRole("dialog", { name: "Sport" });
  await sport.waitFor();
  check(await sport.getByText("Sport · diese Woche").isVisible(), "Sport: Fenster „Sport · diese Woche“");
  check(await reihe(page).locator('[data-kreis="sport"][data-aktiv]').count() === 1, "Sport: der angetippte Kreis hat einen orangen Rand");
  await sport.getByRole("button", { name: /^Sa: / }).click();
  await sport.getByRole("group", { name: "Sportart" }).getByRole("button").nth(1).click();
  await sport.getByRole("button", { name: "10:00", exact: true }).click();
  const knopf = sport.locator("[data-sport-planen-knopf]");
  const satz = (await knopf.innerText()).trim();
  check(/^Sa 10:00 \S+ planen$/.test(satz), `Sport: Knopf „${satz}“`);
  await knopf.click();
  await page.waitForTimeout(400);
  const eintraege = (await store(page, "wasgibts.eintraege"))?.entries ?? [];
  const neu = eintraege.find((e) => e.typ === "termin" && e.data.date === "2026-10-24" && e.data.start === "10:00");
  check(neu?.raum === "ich" && neu?.data.label === "Sport", `Sport: Termin im Raum „Ich“ angelegt (${neu ? `${neu.data.title}, ${neu.raum}` : "fehlt"})`);
  check(await sport.locator('[data-tag="geplant"]').count() >= 1, "Sport: der Tag steht danach gestrichelt als geplant da");
  await page.keyboard.press("Escape");
  await sport.waitFor({ state: "hidden" });
  check(/Heute/.test(await page.getByRole("tab", { selected: true }).innerText()), "Sport: man bleibt auf der Startseite");

  // Timer: ein Tipp startet, der Kreis zeigt die Restzeit vorn
  await reihe(page).locator('[data-kreis="timer"]').click();
  const timer = page.getByRole("dialog", { name: "Timer" });
  await timer.waitFor();
  check(await timer.getByText("Läuft weiter, auch wenn du die App schließt").isVisible(), "Timer: Unterzeile");
  check((await timer.locator("[data-timer-feld]").count()) === 6, "Timer: 6 Felder");
  await timer.locator('[data-timer-feld="5"]').click();
  await page.waitForTimeout(400);
  check((await timer.locator("[data-timer-karte]").count()) === 1, "Timer: ein Tipp startet sofort, er steht oben im Fenster");
  await page.keyboard.press("Escape");
  await timer.waitFor({ state: "hidden" });
  await page.waitForTimeout(500);
  const m = await page.evaluate(messen);
  check(m?.[0].id === "timer" && /^\d+:\d\d Timer$/.test(m[0].text), `Timer: läuft → Restzeit im Kreis, Position 1 (${m?.map((k) => `${k.id} „${k.text}“`).join(", ")})`);

  // Pause: Durchatmen-Fenster, Rätsel: Rätsel-Fenster
  await reihe(page).locator('[data-kreis="pause"]').click();
  const atem = page.getByRole("dialog", { name: "Durchatmen" });
  await atem.waitFor();
  check(await atem.isVisible(), "Pause: öffnet Durchatmen");
  await page.keyboard.press("Escape");
  await atem.waitFor({ state: "hidden" });
  await reihe(page).locator('[data-kreis="raetsel"]').click();
  const raetsel = page.getByRole("dialog", { name: "Rätsel" });
  await raetsel.waitFor();
  check(await raetsel.getByText("Kinder raten zuerst").isVisible(), "Rätsel: öffnet das Rätsel-Fenster");
  await page.keyboard.press("Escape");
  await raetsel.waitFor({ state: "hidden" });
  // Was los? (A-055): öffnet „Was ist los in Eutin?“
  await reihe(page).locator('[data-kreis="waslos"]').click();
  const waslos = page.locator("[role=dialog]:has([data-was-los-fenster])");
  await waslos.waitFor({ timeout: 6000 });
  check(await waslos.getByRole("heading", { name: "Was ist los in Eutin?" }).isVisible(), "Was los?: öffnet das Fenster");
  await page.keyboard.press("Escape");
  await waslos.waitFor({ state: "hidden" });
  check(/Heute/.test(await page.getByRole("tab", { selected: true }).innerText()), "nach allen Fenstern: noch auf der Startseite");
};

export const kreiseBearbeiten = async (page, check) => {
  await hello(page);
  await reihe(page).waitFor();
  await page.getByRole("button", { name: "Startseite bearbeiten" }).last().click();
  const abschnitt = page.locator("[data-kreise-bearbeiten]");
  await abschnitt.waitFor();
  // Einmal-Tipp „Neue Kacheln holen“ weg
  const verstanden = page.getByRole("button", { name: "Verstanden" });
  if (await verstanden.isVisible().catch(() => false)) await verstanden.click();
  check(await abschnitt.getByText("Höchstens 5 Kreise").isVisible(), "Bearbeiten: „Kreise oben“ mit Hinweis „Höchstens 5 Kreise“");
  await abschnitt.locator('[data-kreis-schalter="raetsel"]').click();
  // Nach unten schieben (Knopf für Screenreader/Tastatur)
  await abschnitt.getByRole("button", { name: "Sport nach unten" }).dispatchEvent("click");
  await page.getByRole("button", { name: "Fertig" }).click();
  await reihe(page).waitFor();
  await page.waitForTimeout(400);
  let ids = (await page.evaluate(messen)).map((k) => k.id);
  check(ids.join() === "pause,sport,waslos,timer", `Bearbeiten: Rätsel aus, Sport eins weiter (${ids.join(", ")})`);
  const kreise = (await store(page, "wasgibts.startseite"))?.kreise ?? [];
  check(kreise.find((k) => k.id === "raetsel")?.an === false, "Bearbeiten: gespeichert (Rätsel aus, nicht gelöscht)");
  // Wieder an (wie „Hol das Rätsel wieder nach oben“)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("wasgibts.startseite"));
    s.kreise = s.kreise.map((k) => ({ ...k, an: true }));
    localStorage.setItem("wasgibts.startseite", JSON.stringify(s));
  });
  await page.reload();
  await reihe(page).waitFor();
  ids = (await page.evaluate(messen)).map((k) => k.id);
  check(ids.includes("raetsel"), `wieder an: Rätsel steht oben (${ids.join(", ")})`);
};

export const kreiseMigration = async (page, check) => {
  await hello(page);
  await page.evaluate(() => {
    const tiles = [
      { id: "wetter", visible: true, size: "XS" },
      { id: "sport", visible: true, size: "XS" },
      { id: "termine", visible: true, size: "M" },
      { id: "timer", visible: true, size: "XS" },
      { id: "vorrat", visible: true, size: "XS" },
      { id: "essen", visible: true, size: "S" },
      { id: "einkauf", visible: true, size: "S" },
    ];
    localStorage.setItem("wasgibts.startseite", JSON.stringify({ version: 9, tiles, tipSeen: true }));
    const f = JSON.parse(localStorage.getItem("wasgibts.funktionen"));
    f.on = [...new Set([...f.on, "sport", "vorrat"])];
    localStorage.setItem("wasgibts.funktionen", JSON.stringify(f));
  });
  await page.reload();
  await reihe(page).waitFor();
  await page.waitForTimeout(600);
  const kacheln = await panel(page).locator("[data-raster] > [data-unit]").evaluateAll((els) => els.map((e) => e.dataset.unit));
  check(!kacheln.some((k) => /sport|timer|vorrat/.test(k)), `Migration: keine Kachel Sport/Timer XS, kein Im Haus (${kacheln.join(", ")})`);
  check(kacheln.includes("essen+einkauf") && kacheln.includes("termine"), "Migration: eigene Anordnung bleibt (Essen + Einkauf, Termine)");
  const ids = (await page.evaluate(messen)).map((k) => k.id);
  check(ids.includes("sport") && ids.includes("timer"), `Migration: Sport und Timer sind Kreise (${ids.join(", ")})`);
  const s = await store(page, "wasgibts.startseite");
  check(s.version === 10 && s.tiles.find((t) => t.id === "vorrat")?.visible === false, "Migration: v10, Im Haus nur ausgeblendet");
  // Im Haus bleibt unter Essen erreichbar
  await page.getByRole("tab", { name: "Essen" }).click();
  await page.waitForTimeout(800);
  const link = panel(page).locator('a[href="/vorrat"]').first();
  check((await link.count()) > 0, "Im Haus unter Essen erreichbar");
};
