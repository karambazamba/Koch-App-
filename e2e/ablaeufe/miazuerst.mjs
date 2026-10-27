// Mia zuerst – erzählen statt ausfüllen (Tafel 53): runder Knopf statt
// Leiste, Mia fliegt in die Mitte, Kleines sofort mit „Rückgängig“ (v0.78); „＋“ holt nie Mia (Schnelleingabe);
// Schließen per ✕ und Zurück. Zeit: Mi 21.10. 10:30.
import { hello, miaTippen, seedFamily, store } from "../lib.mjs";

export const miaZuerst = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const knopf = page.getByRole("button", { name: /^Sag .*was ansteht/ });
  check(await knopf.isVisible(), "runder Mia-Knopf unten");
  const box0 = await knopf.boundingBox();
  const vp = page.viewportSize();
  // Seit „Navigation neu“ (Tafel 96) sitzt Mia rechts in der Leiste (60 px)
  check(box0.x + box0.width > vp.width - 40 && box0.width >= 56, "rechts unten in der Leiste, ca. 60 px");
  check(!(await page.getByRole("textbox", { name: "Nachricht schreiben" }).count()), "keine Schreib-Leiste");

  // Tippen → Mia in der Mitte, erzählen (hier getippt)
  const box = await miaTippen(page);
  const mia = page.getByRole("dialog").last();
  check(await mia.getByRole("button", { name: "Verlauf" }).isVisible(), "oben „Verlauf“");
  const before = (await store(page, "wasgibts.eintraege")).entries.length;
  await box.fill("Morgen um 9 Steuerberater");
  await box.press("Enter");
  // Kleines macht Mia sofort (seit v0.78): eingetragen, 10 s „Rückgängig“ im Gespräch
  const undo = mia.getByRole("button", { name: "Rückgängig" });
  check(await undo.waitFor({ timeout: 8000 }).then(() => true, () => false), "sofort eingetragen, mit „Rückgängig“");
  check((await store(page, "wasgibts.eintraege")).entries.length === before + 1, "Termin eingetragen");
  check(!(await mia.getByRole("button", { name: /^Passt/ }).count()), "keine Vorschau für Kleines");
  await undo.click();
  await page.waitForTimeout(300);
  check((await store(page, "wasgibts.eintraege")).entries.length === before, "„Rückgängig“ nimmt ihn wieder raus");
  await mia.getByRole("button", { name: "Schließen" }).click();
  await page.waitForTimeout(500);

  // „＋“ auf der Termine-Kachel → Schnelleingabe, nicht Mia
  const plus = page.getByRole("button", { name: "Neuer Termin" }).first();
  await plus.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await plus.click();
  check(await page.getByRole("dialog", { name: "Schnelleingabe" }).waitFor({ timeout: 4000 }).then(() => true, () => false), "„＋“ → Schnelleingabe (nicht Mia)");
  check(!(await page.getByRole("button", { name: "Verlauf" }).count()), "keine Mia-Bühne");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Schließen per ✕ und per Zurück
  await knopf.click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Schließen" }).click();
  await page.waitForTimeout(500);
  check(!(await page.getByRole("button", { name: "Verlauf" }).count()), "✕ schließt");
  await knopf.click();
  await page.waitForTimeout(500);
  await page.goBack();
  await page.waitForTimeout(600);
  check(!(await page.getByRole("button", { name: "Verlauf" }).count()) && page.url().endsWith("/"), "Zurück schließt (Seite bleibt)");
};

/**
 * Eine Bühne: Mia-Knopf → Mia groß unten in der Mitte (~64 % der Höhe), die
 * Startseite verschwommen dahinter → Satz → Blasen oben, nie hinter Mia →
 * sofort erledigt mit „Rückgängig“ → ✕ → Mia wieder als Knopf unten rechts.
 */
export const buehne = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  const stage = page.getByRole("dialog").last();
  await stage.waitFor({ timeout: 5000 });
  const vp = page.viewportSize();
  const mia = stage.getByRole("button", { name: /^(Frage einsprechen|Zuhören beenden)$/ });
  await page.waitForTimeout(400);
  const box = await mia.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  check(Math.abs(cx - vp.width / 2) < 4 && box.width >= 110 && box.width <= 130, `Mia groß, waagrecht in der Mitte (${Math.round(box.width)} px)`);
  check(cy / vp.height > 0.56 && cy / vp.height < 0.72, `Mia im unteren Drittel (${Math.round((cy / vp.height) * 100)} %)`);
  const veil = await page.evaluate(() => {
    const el = document.querySelector(".mia-buehne-hintergrund");
    const st = el && getComputedStyle(el);
    return { blur: st?.backdropFilter ?? st?.webkitBackdropFilter ?? "", home: Boolean(document.querySelector("main [aria-label^='Mia: Jetzt']")) };
  });
  check(/blur\(14px\)/.test(veil.blur) && veil.home, "Startseite verschwommen dahinter");
  check(!(await stage.getByRole("textbox", { name: "Nachricht schreiben" }).count()), "keine Schreib-Leiste");

  await stage.getByRole("button", { name: "Lieber schreiben" }).click();
  const field = stage.getByRole("textbox", { name: "Nachricht schreiben" });
  await field.fill("Morgen um 9 Steuerberater");
  await field.press("Enter");
  const undo = stage.getByRole("button", { name: "Rückgängig" });
  check(await undo.waitFor({ timeout: 8000 }).then(() => true, () => false), "sofort erledigt mit „Rückgängig“ im Gespräch");
  const own = stage.getByText("Morgen um 9 Steuerberater", { exact: true }).first();
  const small = stage.getByRole("button", { name: /^(Frage einsprechen|Zuhören beenden|Schreiben statt sprechen)$/ });
  const [o, m] = [await own.boundingBox(), await small.boundingBox()];
  check(o && m && o.y + o.height <= m.y, "eigene Blase oben, nie hinter Mia");
  const list = await page.evaluate(() => document.querySelector("[role=dialog] .mia-gespraech[aria-live]")?.getBoundingClientRect().bottom ?? 0);
  check(list <= m.y + 1, "Gespräch endet über Mia");

  await stage.getByRole("button", { name: "Schließen" }).click();
  check(await stage.waitFor({ state: "detached", timeout: 3000 }).then(() => true, () => false), "✕ schließt die Bühne");
  const knopf = page.getByRole("button", { name: /^Sag .*was ansteht/ }).first();
  const k = await knopf.boundingBox();
  check(Boolean(k) && k.x + k.width > vp.width - 40, "Mia wieder als Knopf unten rechts");
};
