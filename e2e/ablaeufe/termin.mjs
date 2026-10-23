// Termin eintragen – ein Satz genügt (Tafel 26): erkennen beim Tippen,
// Pillen zum Korrigieren, ganztägig ohne Uhrzeit, Zeit schon vorbei, Hand
// schlägt Automatik, alles sichtbar mit offener Tastatur (SE). Zeit: Mi 21.10. 10:30.
import { BASE, hello, lieberFormular, seedFamily, store } from "../lib.mjs";

async function open(page) {
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  await page.locator("[role=tabpanel]:not([inert])").getByRole("button", { name: "Neu eintragen" }).click();
  await lieberFormular(page);
  await page.getByRole("button", { name: /^Termin/ }).first().click();
  const sheet = page.getByRole("dialog", { name: "Neuer Termin" });
  await sheet.waitFor();
  return sheet;
}

const type = async (sheet, text) => {
  await sheet.getByRole("textbox", { name: "Termin" }).fill(text);
  await sheet.page().waitForTimeout(450);
};
const termine = async (page) => (await store(page, "wasgibts.eintraege")).entries.filter((e) => e.typ === "termin");

export const terminSatz = async (page, check) => {
  await hello(page);
  await seedFamily(page);

  // „Mittwoch 12.30 Physio“ → Mi 12:30, gespeichert als „Physio“
  let sheet = await open(page);
  await type(sheet, "Mittwoch 12.30 Physio");
  check(await sheet.getByRole("button", { name: /^Uhrzeit: 12:30/ }).isVisible(), "Uhrzeit-Pille zeigt 12:30");
  check(await sheet.getByText("Erkannt aus deinem Text").isVisible(), "„✓ Erkannt aus deinem Text“");
  check((await sheet.locator("mark").count()) === 2, "erkannte Wörter hinterlegt");
  await sheet.getByRole("button", { name: "Eintragen" }).click();
  await page.waitForTimeout(500);
  let saved = (await termine(page)).find((e) => e.data.title === "Physio");
  check(saved?.data.date === "2026-10-21" && saved?.data.start === "12:30", `gespeichert Mi 12:30 „Physio“ (${saved?.data.date} ${saved?.data.start})`);

  // „28.10. Zahnarzt“ → 28. Okt, ganztägig
  sheet = await open(page);
  await type(sheet, "28.10. Kieferorthopäde");
  check(await sheet.getByRole("button", { name: /^Uhrzeit: ganztägig/ }).isVisible(), "ohne Uhrzeit: „ganztägig“");
  await sheet.getByRole("button", { name: "Eintragen" }).click();
  await page.waitForTimeout(500);
  saved = (await termine(page)).find((e) => e.data.title === "Kieferorthopäde");
  check(saved?.data.date === "2026-10-28" && saved?.data.start === "", `28.10. ganztägig (${saved?.data.date} „${saved?.data.start}“)`);

  // „Hallo“ → Heute, ganztägig, nur Zeiten, die noch kommen
  sheet = await open(page);
  await type(sheet, "Hallo");
  check(await sheet.getByRole("button", { name: /^Tag: Heute/ }).isVisible(), "„Hallo“ → Heute");
  check(await sheet.getByText("Heute noch frei").isVisible(), "„Heute noch frei“");
  const chips = await sheet.getByRole("group", { name: "Zeit-Vorschläge" }).getByRole("button").allInnerTexts();
  check(chips.filter((c) => /\d/.test(c)).every((c) => Number(c.split(":")[0]) * 60 + Number(c.split(":")[1]) > 10 * 60 + 30), `nur spätere Zeiten (${chips.join(", ")})`);

  // Zeit schon vorbei → Hinweis
  await type(sheet, "Bäcker 9 Uhr");
  check(await sheet.getByText("9:00 ist heute schon vorbei.").isVisible(), "Hinweis „schon vorbei“");
  check(await sheet.getByRole("button", { name: "Eintragen" }).isDisabled(), "nie still in der Vergangenheit speichern");
  await sheet.getByRole("button", { name: "Morgen 9:00" }).click();
  check(await sheet.getByRole("button", { name: /^Tag: Morgen/ }).isVisible(), "„Morgen 9:00“ setzt morgen");

  // Hand schlägt Automatik
  await type(sheet, "Bäcker Freitag 9 Uhr");
  check(await sheet.getByRole("button", { name: /^Tag: Morgen/ }).isVisible(), "von Hand gewählter Tag bleibt beim Weitertippen");
  await sheet.getByRole("button", { name: "Tag wieder automatisch" }).click();
  check(await sheet.getByRole("button", { name: /^Tag: Fr/ }).isVisible(), "„×“ = wieder automatisch (Freitag)");
  await sheet.getByRole("button", { name: "Schließen" }).first().click();
  await page.waitForTimeout(300);

  // iPhone SE mit offener Tastatur (sichtbare Höhe ~380 px): alles ohne Scrollen
  await page.setViewportSize({ width: 375, height: 380 });
  sheet = await open(page);
  await type(sheet, "Elternabend");
  const h = 380;
  const inView = async (loc) => {
    const b = await loc.boundingBox();
    return Boolean(b) && b.y >= 0 && b.y + b.height <= h + 1;
  };
  check(await inView(sheet.getByRole("textbox", { name: "Termin" })), "SE + Tastatur: Titel sichtbar");
  check(await inView(sheet.getByRole("button", { name: /^Tag:/ })), "SE + Tastatur: Tag-Pille sichtbar");
  check(await inView(sheet.getByRole("button", { name: /^Uhrzeit:/ })), "SE + Tastatur: Uhrzeit-Pille sichtbar");
  check(await inView(sheet.getByRole("button", { name: "Eintragen" })), "SE + Tastatur: „Eintragen“ sichtbar");
};
