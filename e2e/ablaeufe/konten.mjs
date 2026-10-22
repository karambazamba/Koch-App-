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

// Abgleich (3b): A nimmt seine Daten mit, B tritt bei und sieht sie; B
// schreibt an die Pinnwand → A sieht es; B offline → schreibt → wieder online
// → kommt bei A an.
const pinTexts = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.messages ?? []).map((m) => m.data.text));
const waitFor = async (page, fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 500 }).then(() => true, () => false);

export const abgleich = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await seedFamily(page);
  await login(page, `felix-sync-${tag}@example.com`);
  await page.getByRole("button", { name: /Neuen Haushalt anlegen/ }).click();
  await page.getByRole("button", { name: "Haushalt anlegen" }).click();
  const preview = page.getByTestId("uebernahme-vorschau");
  await preview.waitFor();
  const text = (await preview.textContent()) ?? "";
  check(/3 Termine, 2 Aufgaben, 1 Notiz, 1 Nachricht und 4 Sachen im Vorrat werden mitgenommen\./.test(text), `Vorschau: ${text}`);
  await page.getByRole("button", { name: "Mitnehmen" }).click();
  await preview.waitFor({ state: "detached" });
  const code = await invite(page);

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await login(pageB, `lisa-sync-${tag}@example.com`);
    await join(pageB, code);
    await pageB.getByRole("list", { name: "Wer dazugehört" }).waitFor();
    check(!(await pageB.getByTestId("uebernahme-vorschau").isVisible()), "B ohne eigene Daten: keine Frage");
    const termin = await waitFor(pageB, () => (localStorage.getItem("wasgibts.eintraege") ?? "").includes("Zahnarzt"));
    check(termin, "Termin von A ist bei B");
    await pageB.goto(BASE + "/pinnwand");
    check(await pageB.getByText("Bin um 20 Uhr da").waitFor({ timeout: 10000 }).then(() => true, () => false), "Pinnwand von A bei B");
    await pageB.getByRole("textbox", { name: "Nachricht an alle" }).fill("Pizza ist im Ofen");
    await pageB.getByRole("button", { name: "Anheften" }).click();
    await page.goto(BASE + "/pinnwand");
    check(await waitFor(page, () => document.body.innerText.includes("Pizza ist im Ofen")), "Nachricht von B kommt bei A an");

    // offline → online
    await pageB.context().setOffline(true);
    await pageB.getByRole("textbox", { name: "Nachricht an alle" }).fill("Bin im Funkloch");
    await pageB.getByRole("button", { name: "Anheften" }).click();
    await pageB.waitForTimeout(3000);
    check(!(await pinTexts(page)).includes("Bin im Funkloch"), "offline: noch nicht bei A");
    check((await pinTexts(pageB)).includes("Bin im Funkloch"), "offline: bei B auf dem Handy");
    await pageB.context().setOffline(false);
    check(await waitFor(page, () => document.body.innerText.includes("Bin im Funkloch"), undefined, 30000), "wieder online: kommt bei A an");
  } finally {
    await pageB.context().close();
  }
};

// Tafel 20: Anmelden direkt von der Begrüßung; Beitreten per Link; ohne
// Konten-Variablen bleibt die Begrüßung wie bisher.
async function codeFromHello(page, email) {
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code senden" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
}

export const begruessung = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await page.goto(BASE);
  await page.getByRole("button", { name: "Los geht’s" }).waitFor();
  await page.getByText(/Schon mal genutzt\?/).waitFor();
  // Bis „Anmelden wie man es kennt“ (Tafel 22) fertig ist: kein Anmelden-Link auf der Begrüßung
  check(!(await page.getByText(/Anmelden/).count()), "Begrüßung ohne Anmelden-Link");
  await page.goto(BASE + "/anmelden");
  await page.getByRole("heading", { name: "Schön, dass ihr dabei seid." }).waitFor();
  check(await page.getByText("Kein Passwort nötig.").isVisible(), "„Kein Passwort nötig.“");
  const email = `felix-hallo-${tag}@example.com`;
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code senden" }).click();
  await page.getByRole("heading", { name: "Code eingeben" }).waitFor();
  const field = page.getByLabel("6-stelliger Code");
  check((await field.getAttribute("autocomplete")) === "one-time-code" && (await field.getAttribute("inputmode")) === "numeric", "Feld schlägt den Code aus der Mail vor");
  check(await page.getByRole("button", { name: /Neuen Code senden in 0:\d\d/ }).isDisabled(), "„Neuen Code senden in 0:60“");
  await field.fill("000001");
  check(await page.getByText(/stimmt nicht oder ist abgelaufen/).waitFor({ timeout: 5000 }).then(() => true, () => false), "falscher Code → freundlicher Satz");
  check((await field.inputValue()) === "", "Feld geleert");
  await page.getByRole("button", { name: "Zurück" }).click();
  check(await page.getByRole("heading", { name: "Schön, dass ihr dabei seid." }).isVisible(), "Zurück geht einen Schritt zurück");
  await codeFromHello(page, email);
  await page.getByText("Wie wollt ihr starten?").waitFor();
  check(await page.getByText("Was schon auf diesem Handy ist, nehmen wir mit.").isVisible(), "„… nehmen wir mit.“");
  await page.getByRole("button", { name: /Neuen Haushalt anlegen/ }).click();
  await page.getByLabel("Name des Haushalts").fill("Familie Hallo");
  await page.getByRole("button", { name: "Haushalt anlegen" }).click();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  check(new URL(page.url()).pathname === "/", "danach direkt die Startseite");
  check(Boolean(await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"))), "Profil angelegt (wie „Los geht’s“)");
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.haushalt") ?? "null")?.household?.name)) === "Familie Hallo", "Haushalt verbunden");

  // Einladen, B öffnet den Link
  await page.goto(BASE + "/konto");
  const code = await invite(page);
  const pageB = await newPage(page.context().browser(), device);
  try {
    await pageB.goto(`${BASE}/beitreten?code=${code}`);
    await pageB.getByRole("heading", { name: "Schön, dass ihr dabei seid." }).waitFor();
    await codeFromHello(pageB, `lisa-hallo-${tag}@example.com`);
    await pageB.getByRole("heading", { name: "Mit Code beitreten" }).waitFor();
    check((await pageB.getByLabel("Einladungs-Code").inputValue()) === code, `Code aus dem Link eingetragen (${code})`);
    await pageB.getByRole("button", { name: "Beitreten" }).click();
    await pageB.getByRole("tab", { name: "Heute", selected: true }).waitFor();
    check((await pageB.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.haushalt") ?? "null")?.household?.name)) === "Familie Hallo", "B ist per Link im Haushalt");
  } finally {
    await pageB.context().close();
  }

  // Ohne Konten-Variablen: Begrüßung wie bisher
  const pageC = await newPage(page.context().browser(), device);
  try {
    await pageC.route("**/api/konto/config", (r) => r.fulfill({ json: { mode: "aus" } }));
    await pageC.goto(BASE);
    await pageC.getByRole("button", { name: "Los geht’s" }).waitFor();
    await pageC.goto(BASE + "/anmelden");
    check(await pageC.getByText(/Hier geht’s erstmal ohne Konto/).waitFor({ timeout: 5000 }).then(() => true, () => false), "ohne Konten: freundlicher Satz statt Anmelden");
  } finally {
    await pageC.context().close();
  }
};
