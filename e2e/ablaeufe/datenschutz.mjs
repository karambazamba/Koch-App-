// Datenschutz & Sicherheit (Platz 23): Seiten erreichbar (von Begrüßung und
// Einstellungen), Sicherheits-Header, Anmelden erst mit Häkchen, KI erst mit
// „Erlauben“ (ohne OK keine Anfrage an die KI), Widerruf unter „Deine Daten“,
// „Auf diesem Gerät löschen“.
import { BASE, hello, newPage } from "../lib.mjs";

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
