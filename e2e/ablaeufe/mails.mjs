// Mails an Mia (Test-Backend, KONTEN_TEST=1): Baustein an, anmelden, Adresse
// der Familie in den Einstellungen, eine weitergeleitete Kita-Mail kommt über
// den Webhook an (im Testmodus ohne Signatur), Jetzt-Karte meldet sie,
// „Aus euren Mails“: Vorschläge abwählen, Übernehmen trägt ein. Fremde
// Absender landen nie. Zweite Mail vom selben Absender → einmal fragen,
// „Ja, gern“ → Gmail-Filter in den Einstellungen.
import { BASE, hello, seedFamily, swipe } from "../lib.mjs";

const KITA = "---------- Forwarded message ---------\nFrom: Kita Sonnenschein <info@kita-sonnenschein.de>\nSubject: Laternenumzug\n\nLiebe Eltern,\nder Laternenumzug ist am Freitag um 17 Uhr im Schlosspark.\nBitte bringt einen Kuchen für den Basar mit.\nViele Grüße";

const adminCode = (page, email) => page.evaluate(async (e) => (await (await fetch("/api/test-konten", { method: "POST", body: JSON.stringify({ action: "admin_code", email: e }) })).json()).code, email);

/** Anmelden auf /konto; die Familie wird still angelegt */
async function login(page, email) {
  await page.goto(BASE + "/konto");
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code schicken" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
  await page.getByRole("list", { name: "Wer dazugehört" }).waitFor();
}

/** Wie Resend „email.received“ an den Webhook */
const send = (page, from, to, subject = "Fwd: Laternenumzug", text = KITA) =>
  page.evaluate(async (m) => (await fetch("/api/mail/eingang", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "email.received", data: m }) })).json(), { from, to: [to], subject, text });

const entries = (page) => page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("wasgibts.eintraege") ?? "null")));

export const mailsAnMia = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  const felix = `felix-mail-${tag}@example.com`;
  await hello(page);
  await seedFamily(page, { "wasgibts.funktionen": { version: 2, on: ["mails"] } });
  await login(page, felix);

  await page.goto(BASE + "/profil");
  await page.getByRole("link", { name: /^Mails an / }).click();
  // Datenschutz: einmal erlauben, erst dann gibt es eine Adresse
  check(!(await page.getByTestId("mail-adresse-familie").count()), "vor dem Erlauben keine Adresse");
  await page.getByRole("region", { name: "Einschalten" }).getByRole("button", { name: "Erlauben" }).click();
  const addr = page.getByTestId("mail-adresse-familie");
  await addr.filter({ hasText: "@" }).waitFor();
  const address = ((await addr.textContent()) ?? "").trim();
  check(/^familie-mueller-[0-9a-f]{4}@/.test(address), `Adresse der Familie (${address})`);
  check(await page.getByTestId("mail-adresse-arbeit").filter({ hasText: "-arbeit-" }).waitFor({ timeout: 5000 }).then(() => true, () => false), "eigene Adresse für die Arbeit");
  check(await page.getByRole("button", { name: "Gmail" }).isVisible(), "Anleitung je Postfach");

  check((await send(page, "Spam <x@spam.example>", address)).ok === true, "fremder Absender: still angenommen …");
  check((await send(page, `Felix <${felix}>`, address)).ok === true, "Felix leitet die Kita-Mail weiter");

  // Jetzt-Karte: bis zu drei Themen durchwischen
  await page.goto(BASE + "/");
  const card = page.locator("[data-jetzt]");
  await card.waitFor();
  await page.waitForTimeout(2500);
  let seen = false;
  for (let k = 0; k < 3 && !seen; k++) {
    seen = ((await card.getAttribute("aria-label")) ?? "").includes("Vorschläge aus Mails") || (await card.getAttribute("data-jetzt")) === "mail";
    if (!seen) {
      const box = await card.boundingBox();
      await swipe(page, { x: box.x + box.width * 0.8, y: box.y + box.height / 2, dx: -box.width * 0.6 });
      await page.waitForTimeout(600);
    }
  }
  check(seen, "Jetzt-Karte: „2 Vorschläge aus Mails“");

  await page.goto(BASE + "/mails");
  const mail = page.getByRole("article", { name: "Laternenumzug" });
  await mail.waitFor();
  check((await page.getByRole("article").count()) === 1, "… und landet nie (nur die Kita-Mail ist da)");
  check(await mail.getByText("kita-sonnenschein.de").isVisible(), "Absender nur als Domain");
  check(await mail.getByText(/Termin · .*17 Uhr · Schlosspark/).isVisible(), "Vorschlag: Termin mit Uhrzeit und Ort");
  await mail.getByRole("button", { name: /Kuchen/ }).click();
  check((await mail.getByRole("button", { name: /Kuchen/ }).getAttribute("aria-pressed")) === "false", "Vorschlag abwählen");
  await mail.getByRole("button", { name: "Übernehmen" }).click();
  check(await page.getByText("Eingetragen: Laternenumzug").waitFor({ timeout: 5000 }).then(() => true, () => false), "„Eingetragen: Laternenumzug · Rückgängig“");
  const saved = await entries(page);
  check(saved.includes("Laternenumzug") && saved.includes("Schlosspark") && !saved.includes("Kuchen"), "Termin eingetragen, Abgewähltes nicht");
  check(await page.getByText("Hier landet, was ihr weiterleitet.").waitFor({ timeout: 5000 }).then(() => true, () => false), "danach leer und freundlich");

  // Zweite Mail vom selben Absender → einmal fragen
  await send(page, `Felix <${felix}>`, address, "Fwd: Elternabend", KITA.replace("Laternenumzug ist am Freitag um 17 Uhr im Schlosspark", "Elternabend ist am Dienstag um 19 Uhr"));
  await page.reload();
  const ask = page.getByRole("region", { name: "Frage" });
  check(await ask.getByText(/Von Kita Sonnenschein kommt öfter was/).waitFor({ timeout: 10000 }).then(() => true, () => false), "zweite Mail: „Von Kita Sonnenschein kommt öfter was …“");
  await ask.getByRole("button", { name: "Ja, gern" }).click();
  await ask.waitFor({ state: "detached" });
  await page.getByRole("article", { name: "Elternabend" }).getByRole("button", { name: "Verwerfen" }).click();
  check(await page.getByText("Hier landet, was ihr weiterleitet.").waitFor({ timeout: 5000 }).then(() => true, () => false), "Verwerfen räumt weg");

  await page.goto(BASE + "/profil/mails-an-mia");
  check(await page.getByText("from:(kita-sonnenschein.de)").waitFor({ timeout: 10000 }).then(() => true, () => false), "Einstellungen: Gmail-Filter mit dem gelernten Absender");
};
