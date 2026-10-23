// Kalender = nur Termine (Tafel 74/76): 30. antippen → Tag darunter →
// „Termin am Fr, 30. Okt“ → Schnelleingabe mit dem Tag → Satz → ➤ → Punkt am
// 30.; „Mehr Details“ → Formular mit dem Datum; lange drücken auf den 31. →
// Schnelleingabe „Sa, 31. Okt“; Liste runterscrollen → „⌂ Heute“ → Startseite.
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
  await day.getByRole("button", { name: /^Termin am Fr, 30\. Okt/ }).click();
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  check(await sheet.waitFor({ timeout: 5000 }).then(() => true, () => false), "„Termin am …“ → Schnelleingabe");
  check(await sheet.getByRole("button", { name: /^Fr, 30\. Okt/ }).isVisible(), "Tag schon drin: „Fr, 30. Okt“");
  const box = sheet.getByRole("textbox", { name: "Neuer Termin" });
  await box.fill("Zahnarzt Jonne 16 Uhr");
  await box.press("Enter");
  await page.waitForTimeout(400);
  const t = (await store(page, "wasgibts.eintraege")).entries.find((e) => e.data.title === "Zahnarzt Jonne");
  check(t?.data.date === "2026-10-30" && t?.data.start === "16:00", `gespeichert am 30. um 16:00 (${t?.data.date} ${t?.data.start})`);

  // „Mehr Details“ → Formular mit dem Datum
  await sheet.getByRole("button", { name: "Mehr Details" }).click();
  const form = page.getByRole("dialog", { name: "Neuer Termin" });
  check(await form.waitFor({ timeout: 5000 }).then(() => true, () => false), "„Mehr Details“ → Formular");
  check(await form.getByRole("button", { name: /^Tag: Fr 30\.10\./ }).isVisible(), "Formular mit dem Datum");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  check(await day.getByRole("button", { name: /^Zahnarzt Jonne – Möglichkeiten/ }).isVisible(), "Termin am 30. im Tag");
  check((await panel.locator('button[aria-label^="Freitag, 30. Oktober"] span[aria-hidden] > span').count()) >= 1, "Punkt am 30.");

  // Lange drücken auf den 31. → Schnelleingabe für diesen Tag
  const b31 = await panel.locator('button[aria-label^="Samstag, 31. Oktober"]').boundingBox();
  await hold(page, b31.x + b31.width / 2, b31.y + b31.height / 2);
  check(await sheet.waitFor({ timeout: 4000 }).then(() => true, () => false), "lange drücken → Schnelleingabe");
  check(await sheet.getByRole("button", { name: /^Sa, 31\. Okt/ }).isVisible(), "mit „Sa, 31. Okt“");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Liste runterscrollen → „⌂ Heute“ → Startseite
  await panel.getByRole("radio", { name: "Liste" }).click();
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, 1200);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  const home = page.getByRole("tab", { name: "Zur Startseite" });
  check(await home.isVisible(), "„⌂ Heute“ bleibt oben sichtbar");
  check(await page.locator("nav[data-schmal]").count() === 1, "Leiste schmal beim Scrollen");
  await home.click();
  await page.waitForTimeout(900);
  check((await page.getByRole("tab", { name: "Heute", selected: true }).count()) > 0, "→ Startseite");
};
