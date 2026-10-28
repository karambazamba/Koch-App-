// Konten im Test-Backend (KONTEN_TEST=1): zwei Browser, zwei Konten, eine
// Familie – Anmelden per Code (Code über die Test-Schnittstelle, nur im
// Testserver), Familie still angelegt, Einladen per Link, Beitreten über den
// Link (Zugangscode erst beim ersten KI-Versuch, A-027), Kind darf nicht
// einladen, Zurückziehen, Abmelden (Daten bleiben), Konto löschen.
import { BASE, hello, miaTippen, newPage, seedFamily, pinnwandSchreiben, serverMitCode } from "../lib.mjs";

const adminCode = (page, email) => page.evaluate(async (e) => (await (await fetch("/api/test-konten", { method: "POST", body: JSON.stringify({ action: "admin_code", email: e }) })).json()).code, email);

async function login(page, email) {
  await page.goto(BASE + "/konto");
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code schicken" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
}

/** Einladen per Link (Tafel 22): liefert den Link */
async function invite(page, kind = false) {
  await page.getByRole("button", { name: "Familie einladen" }).click();
  if (kind) await page.getByRole("button", { name: "Kind", exact: true }).click();
  await page.getByRole("button", { name: "Einladungs-Link erstellen" }).click();
  const link = (await page.getByTestId("einladungs-link").textContent()).trim();
  await page.getByRole("dialog", { name: "Familie einladen" }).getByRole("button", { name: "Schließen" }).last().click();
  await page.getByRole("dialog", { name: "Familie einladen" }).waitFor({ state: "detached" });
  return link;
}

/** Eingeladene Person: Link öffnen, mit E-Mail anmelden – sofort Mitglied, danach Startseite */
async function joinViaLink(page, link, email) {
  await page.goto(link);
  await page.getByRole("heading", { name: /lädt dich ein\./ }).waitFor();
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code senden" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
}

/** Nach der Anmeldung auf /konto: Familie wird still angelegt */
const familyReady = (page) => page.getByRole("list", { name: "Wer dazugehört" }).waitFor();

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
  await familyReady(page);
  const family = (await page.getByRole("region", { name: "Familie" }).textContent()) ?? "";
  check(/Familie \S+/.test(family), "Familie ohne Frage angelegt");
  check(!(await page.getByText(/Haushalt/).count()), "kein „Haushalt“ in der Oberfläche");
  const link = await invite(page);
  check(/\/e\/[0-9a-f]{32}$/.test(link), "Einladungs-Link /e/…");

  // B: zweiter Browser, Link öffnen, anmelden – sofort dabei
  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await joinViaLink(pageB, link, `lisa-${tag}@example.com`);
    await pageB.goto(BASE + "/konto");
    await familyReady(pageB);
    check(await pageB.getByRole("listitem").filter({ hasText: "(du)" }).isVisible(), "B ist per Link in der Familie");
    // Mitglieder kommen über den Abgleich (Testserver: alle 2 s) – kurz warten statt sofort zählen
    const seesA = await pageB.waitForFunction(() => document.querySelectorAll("ul[aria-label='Wer dazugehört'] > li").length >= 2, null, { timeout: 8000 }).then(() => true, () => false);
    check(seesA, "B sieht A");
    const kidLink = await invite(pageB, true);

    // Kind (dritter Browser) darf nicht einladen
    const pageC = await newPage(page.context().browser(), device);
    try {
      await hello(pageC);
      await joinViaLink(pageC, kidLink, `kind-${tag}@example.com`);
      await pageC.goto(BASE + "/konto");
      await familyReady(pageC);
      check(!(await pageC.getByRole("button", { name: "Familie einladen" }).isVisible()), "Kind sieht kein „Familie einladen“");
    } finally {
      await pageC.context().close();
    }

    // A sieht alle
    await page.reload();
    const three = await page.waitForFunction(() => document.querySelectorAll("ul[aria-label='Wer dazugehört'] > li").length === 3, null, { timeout: 8000 }).then(() => true, () => false);
    check(three, "A sieht drei Mitglieder");

    // Einladungen zurückziehen: danach geht der Link nicht mehr
    const open = page.getByRole("region", { name: "Eure Einladungen" });
    check(await open.waitFor({ timeout: 8000 }).then(() => true, () => false), "„Eure Einladungen“ mit Zurückziehen");
    while (await open.getByRole("button", { name: "Zurückziehen" }).count()) {
      await open.getByRole("button", { name: "Zurückziehen" }).first().click();
      await page.waitForTimeout(600);
    }
    const pageD = await newPage(page.context().browser(), device);
    try {
      await pageD.goto(link);
      check(await pageD.getByRole("heading", { name: "Diese Einladung gibt es nicht mehr." }).waitFor({ timeout: 8000 }).then(() => true, () => false), "zurückgezogener Link: freundliche Seite");
    } finally {
      await pageD.context().close();
    }

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
  const preview = page.getByTestId("uebernahme-vorschau");
  await preview.waitFor();
  const text = (await preview.textContent()) ?? "";
  check(/3 Termine, 2 Aufgaben, 1 Notiz, 1 Nachricht und 4 Sachen im Haus werden mitgenommen\./.test(text), `Vorschau: ${text}`);
  await page.getByRole("button", { name: "Mitnehmen" }).click();
  await preview.waitFor({ state: "detached" });
  const link = await invite(page);

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await joinViaLink(pageB, link, `lisa-sync-${tag}@example.com`);
    await pageB.goto(BASE + "/konto");
    await familyReady(pageB);
    check(!(await pageB.getByTestId("uebernahme-vorschau").isVisible()), "B ohne eigene Daten: keine Frage");
    const termin = await waitFor(pageB, () => (localStorage.getItem("wasgibts.eintraege") ?? "").includes("Zahnarzt"));
    check(termin, "Termin von A ist bei B");
    await pageB.goto(BASE + "/pinnwand");
    check(await pageB.getByText("Bin um 20 Uhr da").waitFor({ timeout: 10000 }).then(() => true, () => false), "Pinnwand von A bei B");
    await pinnwandSchreiben(pageB, "Pizza ist im Ofen");
    await page.goto(BASE + "/pinnwand");
    check(await waitFor(page, () => document.body.innerText.includes("Pizza ist im Ofen")), "Nachricht von B kommt bei A an");

    // offline → online
    await pageB.context().setOffline(true);
    await pinnwandSchreiben(pageB, "Bin im Funkloch");
    await pageB.waitForTimeout(3000);
    check(!(await pinTexts(page)).includes("Bin im Funkloch"), "offline: noch nicht bei A");
    check((await pinTexts(pageB)).includes("Bin im Funkloch"), "offline: bei B auf dem Handy");
    await pageB.context().setOffline(false);
    check(await waitFor(page, () => document.body.innerText.includes("Bin im Funkloch"), undefined, 30000), "wieder online: kommt bei A an");
  } finally {
    await pageB.context().close();
  }
};

// Tafel 22: „Schon ein Konto? Anmelden“ auf der Begrüßung, danach ohne Frage
// weiter; Einladen per Link (/e/…); ohne Konten-Variablen kein Anmelden.
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
  // Tafel 22: mit Konten klein „Schon ein Konto? Anmelden“
  check(await page.getByRole("link", { name: /Schon ein Konto\? Anmelden/ }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Begrüßung: „Schon ein Konto? Anmelden“");
  await page.getByRole("link", { name: /Schon ein Konto\? Anmelden/ }).click();
  await page.getByRole("heading", { name: "Willkommen zurück" }).waitFor();
  check(await page.getByText("Kein Passwort nötig. Kostenlos.").isVisible(), "„Kein Passwort nötig. Kostenlos.“");
  check(!(await page.getByRole("button", { name: /Mit (Apple|Google) fortfahren/ }).count()), "Apple/Google nur, wenn eingerichtet");
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
  check(await page.getByRole("heading", { name: "Willkommen zurück" }).isVisible(), "Zurück geht einen Schritt zurück");
  await codeFromHello(page, email);
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  check(new URL(page.url()).pathname === "/", "ohne Frage direkt die Startseite");
  check(Boolean(await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"))), "Profil angelegt (wie „Los geht’s“)");
  const familyId = await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.haushalt") ?? "null")?.household?.id ?? null);
  check(Boolean(familyId), "Familie still angelegt");

  // Einladen, B öffnet den Link
  await page.goto(BASE + "/konto");
  await familyReady(page);
  const link = await invite(page);
  const pageB = await newPage(page.context().browser(), device);
  try {
    // A-027: Einladungs-Weg Mail-Code → Startseite → Zugangscode erst beim ersten KI-Versuch (Server nur nachgestellt)
    await serverMitCode(pageB);
    await pageB.goto(link);
    check(await pageB.getByRole("heading", { name: /lädt dich ein\./ }).waitFor({ timeout: 8000 }).then(() => true, () => false), "Einladungsseite: „… lädt dich ein.“");
    check(await pageB.getByText("Termine, Einkauf und Pinnwand – gemeinsam.").isVisible(), "„Termine, Einkauf und Pinnwand – gemeinsam.“");
    await codeFromHello(pageB, `lisa-hallo-${tag}@example.com`);
    await pageB.getByRole("tab", { name: "Heute", selected: true }).waitFor();
    check((await pageB.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.haushalt") ?? "null")?.household?.id ?? null)) === familyId, "B ist per Link in derselben Familie");
    await pageB.waitForTimeout(1500);
    check(!(await pageB.locator("[data-code-screen]").count()), "Einladung: nach dem Mail-Code die Startseite, noch kein Zugangscode");
    const box = await miaTippen(pageB);
    await box.fill("Erzähl mir einen Witz");
    await box.press("Enter");
    check(await pageB.locator("[data-code-screen]").waitFor({ timeout: 6000 }).then(() => true, () => false), "Einladung: Zugangscode beim ersten KI-Versuch");
  } finally {
    await pageB.context().close();
  }
  const pageE = await newPage(page.context().browser(), device);
  try {
    await pageE.goto(BASE + "/e/00000000000000000000000000000000");
    check(await pageE.getByRole("heading", { name: "Diese Einladung gibt es nicht mehr." }).waitFor({ timeout: 8000 }).then(() => true, () => false), "unbekannter Link: freundliche Seite");
  } finally {
    await pageE.context().close();
  }

  // Ohne Konten-Variablen: Begrüßung ohne Anmelden
  const pageC = await newPage(page.context().browser(), device);
  try {
    await pageC.route("**/api/konto/config", (r) => r.fulfill({ json: { mode: "aus" } }));
    await pageC.goto(BASE);
    await pageC.getByRole("button", { name: "Los geht’s" }).waitFor();
    await pageC.waitForTimeout(800);
    check(!(await pageC.getByText(/Schon ein Konto/).count()), "ohne Konten: kein Anmelden-Link");
    await pageC.goto(BASE + "/anmelden");
    check(await pageC.getByText(/Hier geht’s erstmal ohne Konto/).waitFor({ timeout: 5000 }).then(() => true, () => false), "ohne Konten: freundlicher Satz statt Anmelden");
  } finally {
    await pageC.context().close();
  }
};

// Etappe 3c: Sprachnachricht teilen – A hat ein Memo (Ton im Gerät), nach dem
// Abgleich liegt der Ton im Haushalt; B sieht das Memo mit Punkt, tippt
// „Abspielen“ → Ton wird geholt, Punkt weg, „gehört“ kommt bei A an.
const MEMO_AUF_GERAET = async (author) => {
  const id = "e2e-memo-1";
  const at = new Date().toISOString();
  const memo = { id, typ: "memo", raum: "familie", besitzer: "lokal", erstellt: at, geaendert: at, data: { author, dauer: 1, mime: "audio/wav", wave: [], gehoertVon: [author], alleGehoertAm: null, reactions: {}, storagePath: null } };
  const store = JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null") ?? { version: 3, messages: [], memos: [] };
  localStorage.setItem("wasgibts.pinnwand", JSON.stringify({ ...store, version: 3, memos: [...(store.memos ?? []), memo] }));
  await new Promise((resolve, reject) => {
    const req = indexedDB.open("wasgibts-memos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("audio", { keyPath: "id" });
    req.onsuccess = () => {
      const tx = req.result.transaction("audio", "readwrite");
      // 0,3 s Stille als gültiges WAV (8 kHz, 8 Bit) – echter Ton, damit Abspielen klappt
      const n = 2400;
      const buf = new ArrayBuffer(44 + n);
      const v = new DataView(buf);
      const text = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      text(0, "RIFF");
      v.setUint32(4, 36 + n, true);
      text(8, "WAVEfmt ");
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true);
      v.setUint32(28, 8000, true);
      v.setUint16(32, 1, true);
      v.setUint16(34, 8, true);
      text(36, "data");
      v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      tx.objectStore("audio").put({ id, buf, mime: "audio/wav", at: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
};
const memoOf = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.memos ?? []).find((m) => m.id === "e2e-memo-1") ?? null);
const tonAufGeraet = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open("wasgibts-memos", 1);
        req.onupgradeneeded = () => req.result.createObjectStore("audio", { keyPath: "id" });
        req.onsuccess = () => {
          const get = req.result.transaction("audio").objectStore("audio").get("e2e-memo-1");
          get.onsuccess = () => resolve(Boolean(get.result));
          get.onerror = () => resolve(false);
        };
        req.onerror = () => resolve(false);
      }),
  );

export const memosTeilen = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await login(page, `anna-memo-${tag}@example.com`);
  await familyReady(page);
  const link = await invite(page);
  await page.evaluate(MEMO_AUF_GERAET, "Anna");
  await page.reload();
  check(await waitFor(page, () => /^[0-9a-f-]{36}\/e2e-memo-1\.webm$/.test((JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.memos ?? []).find((m) => m.id === "e2e-memo-1")?.data.storagePath ?? "")), "A: Ton im Haushalt abgelegt (storagePath)");

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    await joinViaLink(pageB, link, `ben-memo-${tag}@example.com`);
    check(await waitFor(pageB, () => (localStorage.getItem("wasgibts.pinnwand") ?? "").includes("e2e-memo-1")), "B: Memo kommt an");
    await pageB.goto(BASE + "/pinnwand");
    const play = pageB.getByRole("button", { name: /^Abspielen: Sprachnachricht von Anna/ }).first();
    check(await play.waitFor({ timeout: 10000 }).then(() => true, () => false), "B: Memo von Anna in der Pinnwand");
    check(await pageB.getByLabel("Noch nicht gehört").first().isVisible(), "B: Punkt „Noch nicht gehört“");
    await play.click();
    check(await waitFor(pageB, () => !document.querySelector("[aria-label='Noch nicht gehört']"), undefined, 10000), "B: nach dem Abspielen ist der Punkt weg");
    check(await tonAufGeraet(pageB), "B: Ton aus dem Haushalt geholt und abgelegt");
    check(await waitFor(page, () => ((JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.memos ?? []).find((m) => m.id === "e2e-memo-1")?.data.gehoertVon ?? []).length > 1, undefined, 30000), "A: „gehört“ von B kommt an");
    check((await memoOf(page))?.data.storagePath, "A: Memo bleibt geteilt");
  } finally {
    await pageB.context().close();
  }
};

// Einkauf Teil 6: „Familie Bescheid sagen“ – A öffnet „Bei REWE“, sagt „Ja,
// immer“; B bekommt den Hinweis, setzt per Schnellknopf-Link „Butter“ drauf;
// bei A erscheint es gelb („Neu von …“); „Einkauf fertig“ kommt bei B an.
export const einkaufUnterwegs = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await seedFamily(page);
  await login(page, `felix-weg-${tag}@example.com`);
  await page.getByRole("button", { name: "Mitnehmen" }).click();
  const link = await invite(page);
  const profile = await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"));

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    // gleiche Einkaufswoche wie A (Profil bleibt pro Gerät)
    await pageB.evaluate((p) => localStorage.setItem("familienkueche.haushaltsprofil", p), profile);
    await joinViaLink(pageB, link, `lisa-weg-${tag}@example.com`);

    await page.goto(BASE + "/einkaufsliste/laden?name=REWE&unterwegs=1");
    const ask = page.getByRole("dialog", { name: "Familie Bescheid sagen?" });
    check(await ask.waitFor({ timeout: 10000 }).then(() => true, () => false), "Frage „Familie Bescheid sagen?“ beim ersten Einkauf (unterwegs geöffnet)");
    await ask.getByRole("button", { name: "Ja, immer" }).click();
    await ask.waitFor({ state: "detached" });
    check(await page.getByText("Die Familie weiß Bescheid.").isVisible(), "A: „Die Familie weiß Bescheid“");

    check(await waitFor(pageB, () => (localStorage.getItem("wasgibts.neu") ?? "").includes("ist gleich bei REWE")), "B: Hinweis „… ist gleich bei REWE“");
    await pageB.goto(BASE + "/einkaufsliste?plus=Butter");
    check(await pageB.getByText("Butter steht auf der Liste.").waitFor({ timeout: 10000 }).then(() => true, () => false), "B: Schnellknopf „+ Butter“ setzt es drauf");

    const neu = page.locator("li[data-neu]", { hasText: "Butter" });
    check(await neu.waitFor({ timeout: 20000 }).then(() => true, () => false), "A: Butter erscheint gelb");
    check(/Neu von .+ · gerade eben/.test((await neu.textContent()) ?? ""), "A: „Neu von … · gerade eben“");

    await neu.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Einkauf fertig" }).click();
    check(await waitFor(pageB, () => /"end":"/.test(localStorage.getItem("wasgibts.einkaufswege") ?? "")), "B: „Eingekauft ✓“ kommt an");

    await page.goto(BASE + "/einkaufsliste/laden?name=REWE&unterwegs=1");
    await page.getByRole("button", { name: "Einkauf fertig" }).waitFor();
    check(!(await page.getByRole("dialog", { name: "Familie Bescheid sagen?" }).isVisible()), "Antwort gemerkt: keine zweite Frage");
  } finally {
    await pageB.context().close();
  }
};
