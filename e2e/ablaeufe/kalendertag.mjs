// Kalender = nur Termine (Tafel 74/76, Launch 1.0 „ein Weg“): 30. antippen →
// Tag darunter → ＋ oben → Schnelleingabe mit dem gewählten Tag → Satz → ➤ →
// Punkt am 30.; „Mehr Details“ → das eine Formular mit dem Datum; lange
// drücken auf den 31. wählt nur; Liste runterscrollen → „⌂ Heute“ → Startseite.
// Zeit: Mi 21.10. 10:30.
import { BASE, hello, seedFamily, store } from "../lib.mjs";

async function hold(page, x, y, ms = 650) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: Math.round(x), y: Math.round(y), id: 1 }] });
  await page.waitForTimeout(ms);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export const kalenderTag = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/?seite=kalender");
  await page.waitForTimeout(900);
  const panel = page.locator("[role=tabpanel]:not([inert])");
  check(!(await panel.getByText(/Noch frei|Ein freier Tag/).count()), "kein Essen, kein „freier Tag“ im Kalender");

  // 30. antippen → Tag darunter
  await panel.locator('button[aria-label^="Freitag, 30. Oktober"]').click();
  await page.waitForTimeout(400);
  const day = panel.getByRole("region", { name: "Gewählter Tag" });
  check(await day.getByText("Freitag, 30. Oktober").isVisible(), "Kopf „Freitag, 30. Oktober“");
  check(await day.getByText("in 9 Tagen").isVisible(), "rechts „in 9 Tagen“");
  check(!(await day.getByText(/^Termin am /).count()), "keine Zeile „Termin am …“");
  await panel.getByRole("button", { name: "Neuer Termin" }).click();
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), "＋ → Schnelleingabe");
  check(await sheet.getByRole("button", { name: /^Fr, 30\. Okt/ }).isVisible(), "Tag schon drin: „Fr, 30. Okt“");
  const box = sheet.getByRole("textbox", { name: "Neuer Termin" });
  await box.fill("Zahnarzt Jonne 16 Uhr");
  await box.press("Enter");
  await page.waitForTimeout(400);
  const t = (await store(page, "wasgibts.eintraege")).entries.find((e) => e.data.title === "Zahnarzt Jonne");
  check(t?.data.date === "2026-10-30" && t?.data.start === "16:00", `gespeichert am 30. um 16:00 (${t?.data.date} ${t?.data.start})`);

  // „Mehr Details“ → das eine Formular mit dem Datum
  await sheet.getByRole("button", { name: "Mehr Details" }).click();
  const form = page.getByRole("dialog", { name: "Neuer Termin" });
  check(await form.waitFor({ timeout: 5000 }).then(() => true, () => false), "„Mehr Details“ → Formular");
  check((await form.locator('input[type="date"]').first().inputValue()) === "2026-10-30", "Formular mit dem Datum");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  check(await day.getByRole("button", { name: /^Zahnarzt Jonne – Möglichkeiten/ }).isVisible(), "Termin am 30. im Tag");
  check((await panel.locator('button[aria-label^="Freitag, 30. Oktober"] span[aria-hidden] > span').count()) >= 1, "Punkt am 30.");

  // Lange drücken auf den 31. → wählt nur (kein Fenster)
  const b31 = await panel.locator('button[aria-label^="Samstag, 31. Oktober"]').boundingBox();
  await hold(page, b31.x + b31.width / 2, b31.y + b31.height / 2);
  await page.waitForTimeout(600);
  check(!(await sheet.isVisible().catch(() => false)), "lange drücken öffnet kein Fenster");

  // Liste runterscrollen → Reiter „Heute“ in der Leiste → Startseite
  await panel.getByRole("radio", { name: "Liste" }).click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  const home = page.locator("[data-leiste]").getByRole("tab", { name: "Heute" });
  check(await home.isVisible(), "Leiste bleibt unten sichtbar");
  await home.tap();
  await page.waitForTimeout(1300);
  check((await page.getByRole("tab", { name: "Heute", selected: true }).count()) > 0, "→ Startseite");
};
