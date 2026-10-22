// Konten im Test-Backend (KONTEN_TEST=1): zwei Browser, zwei Konten, ein
// Haushalt – Anmelden per Code (Code über die Test-Schnittstelle, nur im
// Testserver), Haushalt anlegen, Einladen, Beitreten, Kind darf nicht
// einladen, Abmelden (Daten bleiben), Konto löschen.
import { BASE, hello, newPage, seedFamily } from "../lib.mjs";

const adminCode = (page, email) => page.evaluate(async (e) => (await (await fetch("/api/test-konten", { method: "POST", body: JSON.stringify({ action: "admin_code", email: e }) })).json()).code, email);

async function login(page, email) {
  await page.goto(BASE + "/konto");
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code schicken" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
}

async function invite(page, kind = false) {
  await page.getByRole("button", { name: "Jemanden einladen" }).click();
  if (kind) await page.getByRole("button", { name: "Kind", exact: true }).click();
  await page.getByRole("button", { name: "Code erstellen" }).click();
  const code = (await page.getByTestId("einladungs-code").textContent()).trim();
  await page.getByRole("dialog", { name: "Jemanden einladen" }).getByRole("button", { name: "Schließen" }).last().click();
  await page.getByRole("dialog", { name: "Jemanden einladen" }).waitFor({ state: "detached" });
  return code;
}

async function join(page, code) {
  await page.getByRole("button", { name: /Mit Code beitreten/ }).click();
  await page.getByLabel("Einladungs-Code").fill(code);
  await page.getByRole("button", { name: "Beitreten" }).click();
}

export const konten = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/profil");
  await page.getByRole("link", { name: "Familie verbinden" }).click();
  await page.getByRole("heading", { name: "Familie verbinden" }).waitFor();
  check(true, "Einstellungen → „Familie verbinden“");

  // A: anmelden, falscher Code → freundlicher Satz, dann richtig
  await page.getByLabel("Deine E-Mail-Adresse").fill(`felix-${tag}@example.com`);
  await page.getByRole("button", { name: "Code schicken" }).click();
  await page.getByLabel("6-stelliger Code").fill("000001");
  check(await page.getByText(/stimmt nicht oder ist abgelaufen/).waitFor({ timeout: 5000 }).then(() => true, () => false), "falscher Code → freundlicher Satz");
  check(await page.getByRole("button", { name: /Code neu senden \(\d+ s\)/ }).isDisabled(), "„Code neu senden“ erst nach 60 s");
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, `felix-${tag}@example.com`));
  await page.getByRole("button", { name: /Neuen Haushalt anlegen/ }).click();
  check((await page.getByLabel("Name des Haushalts").inputValue()).length > 0, "Name des Haushalts vorgeschlagen");
  await page.getByLabel("Name des Haushalts").fill("Familie Test");
  await page.getByRole("button", { name: "Haushalt anlegen" }).click();
  await page.getByText("Familie Test").waitFor();
  check(true, "Haushalt angelegt");
  const code = await invite(page);
  check(/^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/.test(code), `Einladungs-Code ${code}`);

  // B: zweiter Browser, anmelden und beitreten
  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await login(pageB, `lisa-${tag}@example.com`);
    await join(pageB, code);
    await pageB.getByText("Familie Test").waitFor();
    check(await pageB.getByRole("listitem").filter({ hasText: "(du)" }).isVisible(), "B ist im Haushalt");
    const kidCode = await invite(pageB, true);

    // Kind (dritter Browser) darf nicht einladen
    const pageC = await newPage(page.context().browser(), device);
    try {
      await hello(pageC);
      await login(pageC, `kind-${tag}@example.com`);
      await join(pageC, kidCode);
      await pageC.getByText("Familie Test").waitFor();
      check(!(await pageC.getByRole("button", { name: "Jemanden einladen" }).isVisible()), "Kind sieht kein „Jemanden einladen“");
    } finally {
      await pageC.context().close();
    }

    // A sieht alle
    await page.reload();
    const three = await page.waitForFunction(() => document.querySelectorAll("ul[aria-label='Wer dazugehört'] > li").length === 3, null, { timeout: 8000 }).then(() => true, () => false);
    check(three, "A sieht drei Mitglieder");

    // B: Abmelden, Daten bleiben
    const before = await pageB.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"));
    await pageB.getByRole("button", { name: "Abmelden" }).click();
    await pageB.getByRole("button", { name: "Auf dem Handy behalten" }).click();
    await pageB.waitForURL(/\/profil$/);
    check((await pageB.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"))) === before, "Abmelden: Daten bleiben auf dem Handy");
    check(!(await pageB.evaluate(() => localStorage.getItem("wasgibts.konto"))), "Abmelden: Sitzung weg");
  } finally {
    await pageB.context().close();
  }

  // A: Konto löschen in Daten & App
  await page.goto(BASE + "/profil/daten");
  await page.getByRole("button", { name: /Konto löschen/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Konto löschen" }).click();
  await page.getByText("Dein Konto ist gelöscht.").waitFor();
  check(true, "Konto gelöscht");
  check(Boolean(await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"))), "Daten auf dem Handy bleiben nach Konto löschen");
};
