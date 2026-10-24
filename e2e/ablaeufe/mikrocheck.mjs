// Mikro-Check und Stimme (Tafel 86): Einstellungen → Mia → „Mikrofon prüfen“,
// jede Fehlerart zeigt nur ihre Schritte (Spracherkennung aus bei erlaubtem
// Mikro = Felix’ Fall, kein Ton, hängt, privater Tab), alles grün,
// „Details“ mit Protokoll; Stimme: „Probe hören“, „Mia kann schöner klingen“,
// Vorschlag einer neuen Stimme nach der Rückkehr in die App.
import { BASE, FAKE_MIC_CHECK, FAKE_VOICES, hello, newPage } from "../lib.mjs";

/** Neue Seite mit Schein-Mikro in einem bestimmten Zustand, direkt auf der Mia-Seite */
async function miaSeite(page, device, setup) {
  const p = await newPage(page.context().browser(), device);
  await p.addInitScript(setup);
  await p.addInitScript(FAKE_MIC_CHECK);
  await hello(p);
  await p.goto(BASE + "/profil/kuechenhelfer");
  await p.getByRole("button", { name: /Mikrofon prüfen/ }).waitFor();
  return p;
}

/** „Mikrofon prüfen“ → „Jetzt prüfen“ → warten, bis fertig */
async function pruefen(p, timeout = 15000) {
  await p.getByRole("button", { name: /Mikrofon prüfen/ }).click();
  const sheet = p.getByRole("dialog", { name: "Mikrofon prüfen" });
  await sheet.getByRole("button", { name: /Jetzt prüfen|Nochmal testen/ }).click();
  await sheet.getByRole("button", { name: /^(Fertig|Nochmal testen)$/ }).waitFor({ timeout });
  return sheet;
}

const stand = async (sheet, id) => sheet.locator(`[data-pruef=${id}]`).getAttribute("data-stand");

export const mikroCheck = async (page, check, device) => {
  const ios = device !== "Pixel 7";

  // Alles grün
  let p = await miaSeite(page, device, () => {});
  try {
    const sheet = await pruefen(p);
    check((await stand(sheet, "mikro")) === "ok" && (await stand(sheet, "erkennung")) === "ok" && (await stand(sheet, "ton")) === "ok", "alles grün: drei Häkchen");
    check(await sheet.getByText("Alles bereit. Ich hör dich.").isVisible(), "„Alles bereit. Ich hör dich.“");
    // Details: Protokoll mit Kopieren
    await sheet.getByRole("button", { name: /^Details/ }).click();
    check((await sheet.locator("[data-mikro-protokoll] pre").innerText()).includes("Mikro-Check"), "Details zeigt das Mikro-Protokoll");
    check(await sheet.getByRole("button", { name: /Kopieren/ }).isVisible(), "Protokoll kopieren");
  } finally {
    await p.context().close();
  }

  // Felix’ Fall: Mikrofon erlaubt, Spracherkennung aus → nur Schalter 2 und 3
  p = await miaSeite(page, device, () => (window.__erkennung = "not-allowed"));
  try {
    const sheet = await pruefen(p);
    check((await stand(sheet, "mikro")) === "ok" && (await stand(sheet, "erkennung")) === "fehler", "Spracherkennung aus: Mikro ✓, Erkennung ✗");
    if (ios) {
      check(await sheet.getByText("„Datenschutz & Sicherheit“ → „Spracherkennung“ → „Safari“ an", { exact: false }).isVisible(), "Schalter Spracherkennung → Safari");
      check(!(await sheet.getByText("„Safari“ → „Mikrofon“", { exact: false }).count()), "kein Mikrofon-Schalter");
      check(!(await sheet.locator("[data-seiten-kasten]").count()), "kein Kasten zur Seiten-Sperre");
    } else check(await sheet.getByText("Öffne Chrome").isVisible(), "Android: Chrome-Schritte");
  } finally {
    await p.context().close();
  }

  // Kein Ton → alle drei Schalter (iPhone)
  p = await miaSeite(page, device, () => (window.__gum = "still"));
  try {
    const sheet = await pruefen(p);
    check((await stand(sheet, "ton")) === "fehler", "kein Ton: Ton ✗");
    if (ios) {
      for (const n of [1, 2, 3]) check(await sheet.getByText(`Schalter ${n}:`, { exact: false }).isVisible(), `kein Ton: Schalter ${n}`);
    }
  } finally {
    await p.context().close();
  }

  // Seiten-Sperre (getUserMedia verweigert) → Schalter 1 + Kasten
  p = await miaSeite(page, device, () => ((window.__gum = "NotAllowedError"), (window.__erkennung = "not-allowed")));
  try {
    const sheet = await pruefen(p);
    check((await stand(sheet, "mikro")) === "fehler", "gesperrt: Mikro ✗");
    if (ios) {
      check(await sheet.locator("[data-seiten-kasten]").isVisible(), "Kasten „Immer noch durchgestrichen?“");
      check(!(await sheet.getByText("„Diktierfunktion“ an", { exact: false }).count()), "gesperrt: keine Diktierfunktion");
    }
  } finally {
    await p.context().close();
  }

  // Privater Tab
  p = await miaSeite(page, device, () => ((window.__privat = true), (window.__gum = "NotAllowedError")));
  try {
    const sheet = await pruefen(p);
    check(await sheet.getByText("Du bist in einem privaten Tab.", { exact: false }).isVisible(), "privater Tab erkannt");
  } finally {
    await p.context().close();
  }

  // Hängt (nur einmal, dauert)
  if (ios) {
    p = await miaSeite(page, device, () => (window.__gum = "haengt"));
    try {
      const sheet = await pruefen(p, 25000);
      check(await sheet.getByText("Das Mikrofon antwortet gerade nicht.", { exact: false }).isVisible(), "hängt: eigener Satz");
    } finally {
      await p.context().close();
    }
  }
};

export const stimmeLaden = async (page, check) => {
  await page.addInitScript(FAKE_VOICES);
  await hello(page);
  await page.goto(BASE + "/profil/kuechenhelfer");
  await page.getByRole("button", { name: "Probe hören" }).waitFor();
  check(await page.getByRole("button", { name: "Probe hören" }).isVisible(), "Stimme: „Probe hören“ oben");
  const card = page.locator("[data-schoener-klingen]");
  check(await card.isVisible(), "ohne gute Stimme: Karte „… kann schöner klingen“");
  await card.click();
  const guide = page.locator("[data-stimmen-anleitung]");
  check(await guide.getByText("Laden allein reicht nicht. Danach die Stimme antippen.").isVisible(), "Hinweis: danach antippen");
  await page.getByRole("dialog").last().getByRole("button", { name: "Später" }).click();
  // Nach der Rückkehr: neue Stimme gefunden → Nehmen?
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    window.__voices.push(window.__mk("Anna (Premium)"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const ask = page.locator("[data-stimmen-vorschlag]");
  check(await ask.waitFor({ timeout: 6000 }).then(() => true, () => false), "„Neue Stimme gefunden: … Nehmen?“");
  check(await ask.getByText("Neue Stimme gefunden: Anna (Premium). Nehmen?").isVisible(), "mit dem Namen der Stimme");
  await ask.getByRole("button", { name: "Ja" }).click();
  const saved = await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.includes("vorlesen") || k.includes("sprache"))?.[1] ?? "");
  check(saved.includes("Anna (Premium)"), "Ja: ab jetzt diese Stimme");
  // Kein zweites Mal
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(3600);
  check(!(await page.locator("[data-stimmen-vorschlag]").count()), "nur einmal gefragt");
};
