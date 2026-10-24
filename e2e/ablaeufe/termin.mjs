// Termin eintragen – ein Weg (Launch 1.0): ＋ → Schnelleingabe (ein Satz
// genügt) → ➤ speichert; „Mehr Details“ öffnet das EINE Formular (Titel + ✕,
// oranges „Speichern“), vorbefüllt aus dem Satz. Kein langes Drücken auf
// einen Tag, keine Zeile „Termin am …“, Tag antippen ist in Monat/Woche/Liste
// gleich (der Tag steht darunter). Termine ohne „Erledigt“. Zeit: Mi 21.10. 10:30.
import { BASE, hello, mehrDetails, seedFamily, store } from "../lib.mjs";

const panel = (page) => page.locator("[role=tabpanel]:not([inert])");

async function plus(page) {
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  await panel(page).getByRole("button", { name: "Neuer Termin" }).click();
  const quick = page.getByRole("dialog", { name: "Schnelleingabe" });
  await quick.waitFor({ timeout: 5000 });
  return quick;
}

const termine = async (page) => (await store(page, "wasgibts.eintraege")).entries.filter((e) => e.typ === "termin");

export const terminSatz = async (page, check) => {
  await hello(page);
  await seedFamily(page);

  // Ein Satz genügt: „Mittwoch 12.30 Physio“ → ➤ → Mi 12:30 „Physio“
  let quick = await plus(page);
  await quick.getByRole("textbox").fill("Mittwoch 12.30 Physio");
  await quick.getByRole("textbox").press("Enter");
  await page.waitForTimeout(500);
  let saved = (await termine(page)).find((e) => e.data.title === "Physio");
  check(saved?.data.date === "2026-10-21" && saved?.data.start === "12:30", `➤ speichert Mi 12:30 „Physio“ (${saved?.data.date} ${saved?.data.start})`);
  await quick.getByRole("button", { name: "Schließen" }).last().click();
  await page.waitForTimeout(400);

  // „Mehr Details“ = das eine Formular, vorbefüllt; Titel + ✕, oranges „Speichern“
  quick = await plus(page);
  await quick.getByRole("textbox").fill("28.10. um 15 Uhr Kieferorthopäde");
  await mehrDetails(page);
  const form = page.getByRole("dialog", { name: "Neuer Termin" });
  await form.waitFor({ timeout: 5000 });
  check((await form.getByRole("textbox", { name: "Titel" }).inputValue()) === "Kieferorthopäde", "Titel aus dem Satz");
  check((await form.locator('input[type="date"]').first().inputValue()) === "2026-10-28", "Tag aus dem Satz");
  check((await form.locator('input[type="time"]').first().inputValue()) === "15:00", "Uhrzeit aus dem Satz");
  check(await form.getByRole("button", { name: "Schließen" }).first().isVisible(), "oben ✕");
  check(!(await form.getByRole("button", { name: /^(Abbrechen|Sichern)$/ }).count()), "kein „Abbrechen | Sichern“ mehr");
  await form.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(500);
  saved = (await termine(page)).find((e) => e.data.title === "Kieferorthopäde");
  check(saved?.data.date === "2026-10-28" && saved?.data.start === "15:00", `Speichern: 28.10. 15:00 (${saved?.data.date} ${saved?.data.start})`);

  // Zeit schon vorbei → Hinweis, nichts gespeichert
  quick = await plus(page);
  await quick.getByRole("textbox").fill("Bäcker heute 9:00");
  await mehrDetails(page);
  await form.getByRole("button", { name: "Speichern" }).click();
  await page.waitForTimeout(300);
  check(await form.getByText("9:00 ist heute schon vorbei.").isVisible(), "Hinweis „schon vorbei“");
  check(!(await termine(page)).some((e) => e.data.title === "Bäcker"), "nie still in der Vergangenheit speichern");
  await form.getByRole("button", { name: "Schließen" }).first().click();
  await page.waitForTimeout(400);

  // Kein langes Drücken auf einen Tag, keine Zeile „Termin am …“
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  const tag = panel(page).getByRole("gridcell", { name: /23\. Oktober/ });
  const b = await tag.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check(!(await page.getByRole("dialog", { name: "Schnelleingabe" }).count()), "langes Drücken öffnet nichts");
  check((await tag.getAttribute("aria-selected")) === "true", "… es wählt nur den Tag");
  check(!(await panel(page).getByText(/^Termin am /).count()), "keine Zeile „Termin am …“");

  // Woche und Liste: Tag antippen → der Tag steht direkt darunter (wie im Monat)
  for (const ansicht of ["Woche", "Liste"]) {
    await panel(page).getByRole("radio", { name: ansicht }).click();
    await page.waitForTimeout(400);
    const karte = panel(page).getByRole("button", { name: /^Mi 28\./ });
    await karte.click();
    await page.waitForTimeout(400);
    check((await karte.getAttribute("aria-pressed")) === "true" && (await panel(page).getByRole("button", { name: /^Kieferorthopäde – Möglichkeiten/ }).isVisible()), `${ansicht}: Tag antippen zeigt ihn darunter`);
  }

  // Termin antippen: kein „Erledigt“
  await panel(page).getByRole("button", { name: /^Kieferorthopäde – Möglichkeiten/ }).click();
  const menu = page.getByRole("dialog", { name: "Kieferorthopäde" });
  await menu.waitFor({ timeout: 4000 });
  check(!(await menu.getByRole("button", { name: "Erledigt" }).count()) && (await menu.getByRole("button", { name: "Bearbeiten" }).isVisible()), "Termin ohne „Erledigt“");
};
