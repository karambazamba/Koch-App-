// Datenschutz & Sicherheit (Platz 23): Seiten erreichbar (von Begrüßung und
// Einstellungen), Sicherheits-Header, Anmelden erst mit Häkchen, KI erst mit
// „Erlauben“ (ohne OK keine Anfrage an die KI), Widerruf unter „Deine Daten“,
// „Auf diesem Gerät löschen“.
import { BASE, hello, newPage } from "../lib.mjs";
import { miaKnopfUeberText } from "../regeln.mjs";

export const datenschutz = async (page, check, device) => {
  // Seiten und Header
  const res = await page.goto(BASE + "/datenschutz");
  const h = res?.headers() ?? {};
  check(/max-age=/.test(h["strict-transport-security"] ?? "") && (h["content-security-policy"] ?? "").includes("frame-ancestors 'none'") && h["x-content-type-options"] === "nosniff", "Sicherheits-Header gesetzt");
  check(await page.getByRole("heading", { name: "Kurz gesagt" }).isVisible(), "Datenschutz: „Kurz gesagt“");
  check(await page.getByText(/juristisch prüfen/).isVisible(), "als Entwurf markiert");
  for (const [link, heading] of [["Impressum", "Impressum"], ["Nutzungsbedingungen", "Nutzungsbedingungen"]]) {
    await page.getByRole("navigation", { name: "Rechtliches" }).getByRole("link", { name: link }).click();
    check(await page.getByRole("heading", { level: 1, name: heading }).waitFor({ timeout: 5000 }).then(() => true, () => false), `Link zu ${heading}`);
  }

  // Ohne Einwilligungen: frische Seite
  const fresh = await newPage(page.context().browser(), device, { consent: false });
  try {
    await fresh.goto(BASE);
    await fresh.getByRole("button", { name: "Los geht’s" }).waitFor();
    check(await fresh.getByRole("navigation", { name: "Rechtliches" }).getByRole("link", { name: "Datenschutz" }).isVisible(), "Begrüßung: Link zum Datenschutz");

    // Anmelden erst mit Häkchen
    await fresh.goto(BASE + "/konto");
    await fresh.getByLabel("Deine E-Mail-Adresse").fill(`ds-${device.replace(/\W/g, "")}-${Date.now()}@example.com`);
    const send = fresh.getByRole("button", { name: "Code schicken" });
    check(await send.isDisabled(), "ohne Häkchen kein Code");
    await fresh.getByText(/Ich akzeptiere die/).click();
    check(await send.isEnabled(), "mit Häkchen geht’s");

    // KI erst mit OK
    let kiCalls = 0;
    fresh.on("request", (r) => r.url().includes("/api/lotte") && r.method() === "POST" && kiCalls++);
    await hello(fresh);
    await fresh.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
    const card = fresh.getByRole("region", { name: "Darf ich mitdenken?" });
    check(await card.waitFor({ timeout: 8000 }).then(() => true, () => false), "Bühne: „… braucht kurz dein OK“");
    check(kiCalls === 0, "ohne OK keine Anfrage an die KI");
    await card.getByRole("button", { name: "Erlauben" }).click();
    check(await card.waitFor({ state: "detached", timeout: 5000 }).then(() => true, () => false), "„Erlauben“ – Karte weg");

    // Widerruf unter „Deine Daten“
    await fresh.goto(BASE + "/profil");
    await fresh.getByRole("link", { name: /Deine Daten/ }).click();
    const ki = fresh.getByRole("switch", { name: /darf mitdenken/ });
    await ki.waitFor();
    check(await ki.isChecked(), "Deine Daten: KI erlaubt");
    await ki.click();
    check(!(await ki.isChecked()), "Widerruf wirkt sofort");
    const stand = await fresh.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.einwilligungen") ?? "null")?.arten?.ki?.ja);
    check(stand === false, "Widerruf gespeichert");

    // Auf diesem Gerät löschen
    await fresh.getByText("Auf diesem Gerät löschen", { exact: true }).click();
    await fresh.getByRole("button", { name: "Löschen", exact: true }).click();
    await fresh.getByRole("button", { name: "Los geht’s" }).waitFor({ timeout: 10000 });
    const left = await fresh.evaluate(() => ["familienkueche.haushaltsprofil", "wasgibts.einwilligungen", "wasgibts.startseite"].filter((k) => localStorage.getItem(k)));
    check(left.length === 0, `alles gelöscht, App startet wie neu (${left.join(", ") || "leer"})`);
  } finally {
    await fresh.context().close();
  }
};

/** Mia-Knopf verdeckt keinen Text: Regel „Knopf über Text“ findet es, Seiten haben genug Platz unten, Rechtsseiten ohne Knopf */
export const miaKnopfPlatz = async (page, check) => {
  await hello(page);
  for (const path of ["/datenschutz", "/impressum", "/nutzungsbedingungen"]) {
    await page.goto(BASE + path);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(400);
    check((await page.locator("[data-begleitung-leiste]").count()) === 0, `${path}: kein Mia-Knopf`);
  }
  for (const path of ["/aufgaben", "/notizen", "/profil", "/einkaufsliste"]) {
    await page.goto(BASE + path);
    await page.locator("[data-begleitung-leiste] .mia-knopf").waitFor();
    // erst wenn die Seite fertig aufgebaut ist, ganz nach unten (zweimal, falls sie noch wächst)
    await page.waitForTimeout(500);
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(400);
    }
    const found = await page.evaluate(miaKnopfUeberText);
    check(found.length === 0, `${path}: ganz unten nichts unter dem Mia-Knopf ${found.join(" | ")}`);
  }
  // Gegenprobe: Text direkt unter den Knopf gelegt → die Regel muss ihn finden
  await page.evaluate(() => {
    const leiste = document.querySelector("[data-begleitung-leiste] .mia-knopf").closest("[data-begleitung-leiste]");
    const box = leiste.getBoundingClientRect();
    const st = getComputedStyle(leiste);
    const k = { left: box.right - parseFloat(st.paddingRight) - 72, top: box.bottom - parseFloat(st.paddingBottom) - 72 };
    const main = document.querySelector("main");
    main.style.position = "relative";
    const m = main.getBoundingClientRect();
    const p = document.createElement("p");
    p.textContent = "Dieser Text liegt unter dem Knopf";
    // schmal und ganz im Bild (sonst wird die Seite breiter und der Knopf rutscht mit)
    Object.assign(p.style, { position: "absolute", left: `${k.left - m.left + 4}px`, top: `${k.top - m.top + 10}px`, width: "60px", fontSize: "11px" });
    main.append(p);
  });
  const caught = await page.evaluate(miaKnopfUeberText);
  check(caught.some((m) => m.includes("Dieser Text liegt")), "Regel „Knopf über Text“ findet Text unter dem Mia-Knopf");
};

/** „Bevor’s losgeht“: neue Nutzer kommen ohne Häkchen nicht weiter, bestehende sehen es genau einmal, Rechtstexte bleiben lesbar */
export const vorDemStart = async (page, check, device) => {
  const fresh = await newPage(page.context().browser(), device, { consent: false });
  try {
    await fresh.goto(BASE);
    await fresh.getByRole("button", { name: "Los geht’s" }).click();
    const titel = fresh.getByRole("heading", { name: "Bevor’s losgeht" });
    check(await titel.waitFor({ timeout: 5000 }).then(() => true, () => false), "neu: nach „Los geht’s“ kommt „Bevor’s losgeht“");
    const weiter = fresh.getByRole("button", { name: "Weiter" });
    check(await weiter.isDisabled(), "ohne Häkchen ist „Weiter“ aus");
    await weiter.click({ force: true }).catch(() => {});
    check(await titel.isVisible(), "ohne Häkchen kein Weiterkommen");
    check(await fresh.locator("[data-zustimmung]").getByRole("link", { name: "Datenschutz" }).isVisible(), "Link Datenschutz sichtbar");
    check(await fresh.locator("[data-zustimmung]").getByRole("link", { name: "Nutzungsbedingungen" }).isVisible(), "Link Nutzungsbedingungen sichtbar");
    await fresh.getByText(/^Ich akzeptiere die/).click();
    await weiter.click();
    check(await fresh.getByRole("button", { name: "Zeig mal" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "mit Häkchen weiter zu „Zeig mal“");
    const stand = await fresh.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.einwilligungen") ?? "null")?.arten?.bedingungen);
    check(stand?.ja === true && stand.version >= 1 && typeof stand.at === "string", "Fassung und Zeit gespeichert");
  } finally {
    await fresh.context().close();
  }

  // Bestehender Nutzer (Profil, aber keine Zustimmung): genau einmal, ohne Schließen, Daten bleiben
  const old = await newPage(page.context().browser(), device, { consent: false });
  try {
    await hello(old);
    // hello hat zugestimmt – für „bestehend“ (aus der Zeit vor v0.93) die Zustimmung wieder entfernen, Daten bleiben
    await old.evaluate(() => localStorage.setItem("wasgibts.einwilligungen", JSON.stringify({ version: 1, arten: {} })));
    const vorher = await old.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"));
    await old.goto(BASE + "/aufgaben");
    const titel = old.getByRole("heading", { name: "Bevor’s losgeht" });
    check(await titel.waitFor({ timeout: 5000 }).then(() => true, () => false), "bestehend: „Bevor’s losgeht“ beim nächsten Öffnen");
    check((await old.locator("[data-zustimmung]").getByRole("button", { name: /Schließen|✕/ }).count()) === 0, "kein Schließen");
    await old.locator("[data-zustimmung]").getByRole("link", { name: "Datenschutz" }).click();
    check(await old.getByRole("heading", { level: 1, name: "Datenschutz" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Datenschutz lesbar");
    check((await old.locator("[data-zustimmung]").count()) === 0, "auf der Rechtsseite nicht verdeckt");
    await old.goBack();
    check(await titel.waitFor({ timeout: 5000 }).then(() => true, () => false), "zurück: wieder „Bevor’s losgeht“");
    await old.getByText(/^Ich akzeptiere die/).click();
    await old.getByRole("button", { name: "Weiter" }).click();
    check(await titel.waitFor({ state: "detached", timeout: 5000 }).then(() => true, () => false), "nach „Weiter“ weg");
    await old.goto(BASE);
    await old.getByRole("tab", { name: "Heute", selected: true }).waitFor();
    await old.waitForTimeout(800);
    check((await old.locator("[data-zustimmung]").count()) === 0, "danach nie wieder");
    check((await old.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"))) === vorher, "Daten unberührt");
  } finally {
    await old.context().close();
  }
};
