// Mias Ergebnis-Karten wie im Clip + Aufleuchten in der Kachel (A-037,
// Tafel 126), Testmodus, Mi 21.10. 10:30: „Freitag 16 Uhr Zahnarzt mit
// Jonne. Und wir brauchen Milch.“ → zwei weiße Karten (Termin · Familie,
// Einkauf · für alle) mit grüner Pille, EIN „Rückgängig“ nimmt beide; sechs
// Sachen → 4 Karten + „und 2 weitere ⌄“; lange Titel nie abgeschnitten
// (iPhone SE, iPhone 15 Pro, Pixel 7); nach dem Schließen der Bühne leuchtet
// der neue Eintrag einmal in der Termine- und der Einkauf-Kachel.
import { BASE, hello, miaTippen, newPage, seedFamily, store, tippenFeld } from "../lib.mjs";

const SATZ = "Freitag 16 Uhr Zahnarzt mit Jonne. Und wir brauchen Milch.";

/** Familie wie im Clip: mit Jonne (6) */
async function mitJonne(page) {
  await hello(page);
  await seedFamily(page);
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil"));
    p.persons.push({ id: "k2", role: "kind", name: "Jonne", allergies: [], dislikes: [], ageGroup: "kita", age: 6, weekdayLunch: "auswaerts" });
    p.kids = 2;
    localStorage.setItem("familienkueche.haushaltsprofil", JSON.stringify(p));
  });
  await page.goto(BASE + "/");
  await page.waitForTimeout(1200);
}

async function sagen(page, text) {
  // Bühne schon offen (auf der Bühne ist der Mia-Knopf der Leiste verdeckt): gleich ins Feld tippen
  const offen = await page.getByRole("textbox", { name: "Nachricht schreiben" }).isVisible();
  const box = offen ? await tippenFeld(page) : await miaTippen(page);
  const vorher = await page.locator("[data-ergebnis-karten]").count();
  await box.fill(text);
  await box.press("Enter");
  // Auf die NEUEN Karten warten (ältere Antworten stehen noch im Verlauf)
  await page.waitForFunction((n) => document.querySelectorAll("[data-ergebnis-karten]").length > n, vorher, { timeout: 10000 });
  const karten = page.locator("[data-ergebnis-karten]").last();
  await page.waitForTimeout(900);
  return karten;
}

const liste = async (page) => {
  const list = await store(page, "wasgibts.einkaufsliste");
  return Object.values(list?.weeks ?? {}).flatMap((w) => (w.manual ?? []).map((i) => i.name));
};
const termine = async (page) => ((await store(page, "wasgibts.eintraege"))?.entries ?? []).map((e) => e.data.title);

export const miaErgebnisKarten = async (page, check) => {
  await mitJonne(page);
  const karten = await sagen(page, SATZ);
  const karte = karten.locator("[data-ergebnis]");
  check((await karte.count()) === 2, `zwei Karten (${await karte.count()})`);
  const termin = karten.locator('[data-ergebnis="termin"]');
  const einkauf = karten.locator('[data-ergebnis="einkauf"]');
  check(/Fr 16:00 Zahnarzt/.test(await termin.innerText()), `Termin-Karte „Fr 16:00 Zahnarzt …“ (${(await termin.innerText()).replace(/\s+/g, " ")})`);
  check(/Termin · Familie/.test((await termin.innerText()).replace(/\s+/g, " ")), "darunter „Termin · Familie“");
  check(/Eingetragen/.test(await termin.innerText()), "grüne Pille „Eingetragen“");
  check(/Milch/.test(await einkauf.innerText()) && /Einkauf · für alle/.test((await einkauf.innerText()).replace(/\s+/g, " ")), "Einkauf-Karte „Milch · Einkauf · für alle“");
  check(/Steht drauf/.test(await einkauf.innerText()), "grüne Pille „Steht drauf“");
  check(!(await einkauf.getByRole("button", { name: /Wer sieht es/ }).count()), "Einkauf ohne Raum-Wahl");
  // Raum direkt ändern: „Termin · Familie ⌄“ → dieselben Raum-Chips
  await termin.getByRole("button", { name: /Wer sieht es: Familie – ändern/ }).click();
  check(await termin.getByRole("radiogroup", { name: "Wer sieht es?" }).isVisible(), "Raum-Zeile klappt die Raum-Chips auf");
  await termin.getByRole("radiogroup", { name: "Wer sieht es?" }).getByRole("radio", { name: "Familie" }).click();
  // Farben über Tokens: Symbol in Kachelfarbe, Pille grün mit lesbarer Schrift
  const symbol = await termin.locator("span[aria-hidden]").first().evaluate((el) => el.getAttribute("style") ?? "");
  check(/--app-tile-termine/.test(symbol), "Symbol in der Farbe der Termine-Kachel");
  // EIN Rückgängig für beide
  check((await karten.getByRole("button", { name: "Rückgängig" }).count()) === 1, "einmal „Rückgängig“ unter allen Karten");
  check((await termine(page)).includes("Zahnarzt mit Jonne") && (await liste(page)).includes("Milch"), "beides eingetragen");
  await karten.getByRole("button", { name: "Rückgängig" }).click();
  await page.waitForTimeout(500);
  check(!(await termine(page)).includes("Zahnarzt mit Jonne") && !(await liste(page)).includes("Milch"), "„Rückgängig“ nimmt beide zurück");
};

export const miaErgebnisWeitere = async (page, check) => {
  await mitJonne(page);
  const karten = await sagen(page, "Wir brauchen Milch, Brot, Eier, Butter, Käse und Äpfel");
  check((await karten.locator("[data-ergebnis]").count()) === 4, `4 Karten (${await karten.locator("[data-ergebnis]").count()})`);
  const weitere = karten.getByRole("button", { name: /und 2 weitere/ });
  check(await weitere.isVisible(), "„und 2 weitere ⌄“");
  await weitere.click();
  check((await karten.locator("[data-ergebnis]").count()) === 6, "aufgeklappt alle 6");
  // Eine Sache → eine Karte
  const eins = await sagen(page, "Wir brauchen Zahnpasta");
  check((await eins.locator("[data-ergebnis]").count()) === 1, "eine Sache → eine Karte");
};

/** Lange Titel: nie abgeschnitten – Text ganz in der Karte, notfalls nur das Häkchen */
async function langeTitel(page, check, wo) {
  await mitJonne(page);
  const karten = await sagen(page, "Freitag 16 Uhr Elternabend in der Grundschule am Lindenweg mit Frau Schneider-Hoffmann. Und wir brauchen glutenfreie Dinkelvollkornbrötchen vom Biobäcker.");
  const texte = karten.locator("[data-ergebnis-text]");
  check((await texte.count()) === 2, `${wo}: zwei Karten`);
  for (const t of await texte.all()) {
    const m = await t.evaluate((el) => {
      const s = getComputedStyle(el);
      const karte = el.closest("[data-ergebnis]").getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { clamp: s.webkitLineClamp, overflow: s.overflow, ellipsis: s.textOverflow, voll: el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1, drin: r.right <= karte.right + 0.5 && r.bottom <= karte.bottom + 0.5 };
    });
    check(m.voll && m.drin && m.ellipsis !== "ellipsis" && (m.clamp === "none" || !m.clamp), `${wo}: Titel ganz zu sehen (${JSON.stringify(m)})`);
  }
  const pillen = await karten.locator("[data-pille]").evaluateAll((els) => els.map((el) => el.dataset.pille));
  check(pillen.length === 2, `${wo}: je Karte eine Pille (${pillen.join(", ")})`);
  const breit = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check(breit, `${wo}: kein seitliches Scrollen`);
}

export const miaErgebnisLang = async (page, check, device) => {
  await langeTitel(page, check, device ?? "Gerät");
  // dazu immer das kleinste: iPhone SE
  const se = await newPage(page.context().browser(), "iPhone SE");
  try {
    await langeTitel(se, check, "iPhone SE");
  } finally {
    await se.context().close();
  }
};

export const miaAufleuchten = async (page, check) => {
  await mitJonne(page);
  await sagen(page, SATZ);
  // Solange die Bühne offen ist, leuchtet nichts
  check(!(await page.locator("[data-leuchtet]").count()), "bei offener Bühne kein Leuchten");
  await page.keyboard.press("Escape");
  const termine = page.locator('[data-tone="termine"] [data-leuchtet]');
  const einkauf = page.locator('[data-tone="einkauf"] [data-leuchtet]');
  const an = await Promise.all([termine.first().waitFor({ timeout: 4000 }).then(() => true, () => false), einkauf.first().waitFor({ timeout: 4000 }).then(() => true, () => false)]);
  check(an[0], "Termine-Kachel leuchtet (Freitag steht nicht drin → Kachel als Ganzes)");
  check(an[1], "Einkauf-Kachel: die Zeile mit Milch leuchtet");
  check(/milch/.test((await einkauf.first().getAttribute("data-leuchte")) ?? ""), "genau die Zeile mit Milch");
  await page.waitForTimeout(1800);
  check(!(await page.locator("[data-leuchtet]").count()), "nach 1,5 s vorbei");
  // Nur einmal: Bühne auf und zu → kein zweites Leuchten
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1200);
  check(!(await page.locator("[data-leuchtet]").count()), "leuchtet nur einmal");
  // Zurück zur Startseite von einer anderen Seite: was Mia dort eingetragen hat, leuchtet beim Zurückkommen
  // in der App hin (Kachel antippen) – mit page.goto wäre „Zurück“ ein Neuladen und der Merker weg
  await page.locator('[data-tone="einkauf"] a[href^="/einkaufsliste"]').first().click();
  await page.waitForURL(/\/einkaufsliste/);
  await page.waitForTimeout(900);
  const ohneNeuladen = await page.evaluate(() => (window.__ohneNeuladen = true));
  await sagen(page, "Wir brauchen Butter");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // über die Leiste (ohne Neuladen – der Merker lebt nur im Arbeitsspeicher)
  await page.locator("[data-leiste-flaeche]").getByRole("tab", { name: "Heute" }).click();
  check(await page.locator('[data-tone="einkauf"] [data-leuchtet]').first().waitFor({ timeout: 4000 }).then(() => true, () => false), "bei der Rückkehr zur Startseite leuchtet die Einkauf-Kachel");
  check(ohneNeuladen && (await page.evaluate(() => window.__ohneNeuladen === true)), "Rückkehr ohne Neuladen");
};
