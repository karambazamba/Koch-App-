// Härtetest „Familie teilen“ (Clip „Mia“, Szenen „Einer sagt’s, alle
// wissen’s“ und „Gemeinsam/Privat“) im Test-Backend (KONTEN_TEST=1): zwei
// Browser, zwei Konten, eine Familie.
// - Termine: Familie sehen beide, „Arbeit“ nur der Besitzer (in beide Richtungen).
// - Einkauf live: Felix ist „Bei REWE“ (Familie weiß Bescheid), Lisa sagt Mia
//   „Milch auf die Liste“ → bei Felix gelb „Neu von …“ in höchstens 5 s.
// - Antwort: Felix tippt „Steh grad davor“ → kommt bei Lisa in der Liste an.
// - Pinnwand live in beide Richtungen (höchstens 5 s).
// Die Mitteilung selbst (Web Push) plant der Server – geprüft in
// tests/einkauf/unterwegs.test.ts („Steh grad davor“).
import { BASE, hello, miaTippen, newPage, pinnwandSchreiben, seedFamily, store } from "../lib.mjs";

const LIVE_MS = 5000;

const adminCode = (page, email) => page.evaluate(async (e) => (await (await fetch("/api/test-konten", { method: "POST", body: JSON.stringify({ action: "admin_code", email: e }) })).json()).code, email);

async function login(page, email) {
  await page.goto(BASE + "/konto");
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code schicken" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
}

async function invite(page) {
  await page.getByRole("button", { name: "Familie einladen" }).click();
  await page.getByRole("button", { name: "Einladungs-Link erstellen" }).click();
  const link = (await page.getByTestId("einladungs-link").textContent()).trim();
  await page.getByRole("dialog", { name: "Familie einladen" }).getByRole("button", { name: "Schließen" }).last().click();
  await page.getByRole("dialog", { name: "Familie einladen" }).waitFor({ state: "detached" });
  return link;
}

async function joinViaLink(page, link, email) {
  await page.goto(link);
  await page.getByRole("heading", { name: /lädt dich ein\./ }).waitFor();
  await page.getByLabel("Deine E-Mail-Adresse").fill(email);
  await page.getByRole("button", { name: "Code senden" }).click();
  await page.getByLabel("6-stelliger Code").waitFor();
  await page.getByLabel("6-stelliger Code").fill(await adminCode(page, email));
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
}

const waitFor = (page, fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);

/** Wie lange etwas braucht, bis es da ist (ms) – null, wenn gar nicht */
async function timed(wait) {
  const t0 = Date.now();
  return (await wait()) ? Date.now() - t0 : null;
}
const liveText = (ms) => (ms === null ? "kam nicht an" : `${(ms / 1000).toFixed(1)} s`);

/** Termin direkt in den Speicher legen (wie aus der Schnelleingabe) – der Abgleich holt ihn ab */
const terminRein = (page, id, title, raum, start) =>
  page.evaluate(
    ({ id, title, raum, start }) => {
      const at = new Date().toISOString();
      const s = JSON.parse(localStorage.getItem("wasgibts.eintraege") ?? "null") ?? { version: 2, migratedTermine: true, seenReminders: [], entries: [] };
      s.entries.push({ id, typ: "termin", raum, besitzer: "lokal", erstellt: at, geaendert: at, data: { title, date: "2026-10-21", start, reminder: "aus", doneDates: [], skipDates: [] } });
      localStorage.setItem("wasgibts.eintraege", JSON.stringify(s));
    },
    { id, title, raum, start },
  );
const hat = (page, text) => page.evaluate((t) => (localStorage.getItem("wasgibts.eintraege") ?? "").includes(t), text);

export const familieTeilen = async (page, check, device) => {
  const tag = device.replace(/\W/g, "").toLowerCase() + Date.now();
  await hello(page);
  await seedFamily(page);
  // Felix hat schon einen Arbeit-Termin auf dem Handy
  await terminRein(page, "e2e-arbeit-felix", "Kundentermin Felix", "arbeit", "14:00");
  await login(page, `felix-teilen-${tag}@example.com`);
  await page.getByRole("button", { name: "Mitnehmen" }).click();
  const link = await invite(page);
  const profile = await page.evaluate(() => localStorage.getItem("familienkueche.haushaltsprofil"));
  // Mias Karte beim ersten Besuch einer Seite stand bei Lisa auch schon (deckt sonst Knöpfe ab)
  const besucht = await page.evaluate(() => localStorage.getItem("wasgibts.miadenkt"));

  const pageB = await newPage(page.context().browser(), device);
  try {
    await hello(pageB);
    // gleiche Einkaufswoche wie Felix (Profil bleibt pro Gerät)
    await pageB.evaluate(([p, m]) => {
      localStorage.setItem("familienkueche.haushaltsprofil", p);
      if (m) localStorage.setItem("wasgibts.miadenkt", m);
    }, [profile, besucht]);
    await joinViaLink(pageB, link, `lisa-teilen-${tag}@example.com`);

    // --- Termine: Familie bei beiden, Arbeit nur beim Besitzer -----------------
    check(await waitFor(pageB, () => (localStorage.getItem("wasgibts.eintraege") ?? "").includes("Elternabend")), "Lisa: Familien-Termin von Felix ist da");
    await terminRein(pageB, "e2e-familie-lisa", "Kinderarzt Mathis", "familie", "15:00");
    await terminRein(pageB, "e2e-arbeit-lisa", "Meeting Lisa", "arbeit", "11:00");
    const kinderarzt = await timed(() => waitFor(page, () => (localStorage.getItem("wasgibts.eintraege") ?? "").includes("Kinderarzt Mathis"), undefined, 15000));
    check(kinderarzt !== null && kinderarzt <= LIVE_MS, `Felix: Familien-Termin von Lisa live (${liveText(kinderarzt)})`);
    // ein paar Abgleich-Runden abwarten, dann: Arbeit blieb, wo sie war
    await page.waitForTimeout(4000);
    check(!(await hat(pageB, "Kundentermin Felix")), "Lisa sieht Felix’ Arbeit-Termin nie");
    check(!(await hat(page, "Meeting Lisa")), "Felix sieht Lisas Arbeit-Termin nie");
    check((await hat(page, "Kundentermin Felix")) && (await hat(pageB, "Meeting Lisa")), "Arbeit bleibt beim Besitzer");
    await pageB.goto(BASE + "/tag?datum=2026-10-21");
    check(await pageB.getByText("Kinderarzt Mathis").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "Lisa: Tag zeigt Familie");
    check(await pageB.getByText("Elternabend").first().isVisible(), "Lisa: Tag zeigt Felix’ Familien-Termin");
    check(!(await pageB.getByText("Kundentermin Felix").count()), "Lisa: Tag ohne Felix’ Arbeit");
    await page.goto(BASE + "/tag?datum=2026-10-21");
    check(await page.getByText("Kundentermin Felix").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "Felix: Tag zeigt seine Arbeit");
    check(await page.getByText("Kinderarzt Mathis").first().isVisible(), "Felix: Tag zeigt Lisas Familien-Termin");
    check(!(await page.getByText("Meeting Lisa").count()), "Felix: Tag ohne Lisas Arbeit");

    // --- Einkauf live: Felix im Laden, Lisa sagt’s Mia --------------------------
    await page.goto(BASE + "/einkaufsliste/laden?name=REWE&unterwegs=1");
    const ask = page.getByRole("dialog", { name: "Familie Bescheid sagen?" });
    check(await ask.waitFor({ timeout: 10000 }).then(() => true, () => false), "Felix: „Familie Bescheid sagen?“");
    await ask.getByRole("button", { name: "Ja, immer" }).click();
    await ask.waitFor({ state: "detached" });
    check(await page.getByText("Die Familie weiß Bescheid.").isVisible(), "Felix ist „gerade beim Einkaufen“ (Familie weiß Bescheid)");
    check(await waitFor(pageB, () => (localStorage.getItem("wasgibts.einkaufswege") ?? "").includes("REWE")), "Lisa: weiß, dass Felix bei REWE ist");

    await pageB.goto(BASE + "/");
    await pageB.waitForTimeout(1200);
    const box = await miaTippen(pageB);
    await box.fill("Milch auf die Liste");
    await box.press("Enter");
    const t0 = Date.now();
    const beiLisa = await waitFor(pageB, () => Object.values(JSON.parse(localStorage.getItem("wasgibts.einkaufsliste") ?? "null")?.weeks ?? {}).some((w) => (w.manual ?? []).some((i) => i.name === "Milch")), undefined, 10000);
    check(beiLisa, "Lisa: Mia setzt Milch auf die Liste");
    const neu = page.locator("li[data-neu]", { hasText: "Milch" });
    const da = await neu.waitFor({ timeout: 15000 }).then(() => true, () => false);
    const ms = da ? Date.now() - t0 : null;
    check(ms !== null && ms <= LIVE_MS, `Felix: Milch erscheint live im Laden (${liveText(ms)})`);
    check(/Neu von .+ · gerade eben/.test((await neu.textContent().catch(() => "")) ?? ""), "Felix: „Neu von … · gerade eben“");

    // --- Antwort „Steh grad davor“ -------------------------------------------------
    const davor = neu.getByRole("button", { name: "Steh grad davor" });
    check(await davor.isVisible().catch(() => false), "Felix: Knopf „Steh grad davor“ an der neuen Sache");
    await davor.click();
    check(await neu.getByText("Gesagt: Steh grad davor.").waitFor({ timeout: 3000 }).then(() => true, () => false), "Felix: „Gesagt“");
    await pageB.goto(BASE + "/einkaufsliste");
    const antwort = pageB.locator("[data-antwort]");
    const antwortMs = await timed(() => antwort.waitFor({ timeout: 15000 }).then(() => true, () => false));
    check(antwortMs !== null, `Lisa: Antwort kommt an (${liveText(antwortMs)})`);
    check(/zu Milch: Steh grad davor\./.test((await antwort.textContent().catch(() => "")) ?? ""), "Lisa: „… zu Milch: Steh grad davor.“");

    // --- Pinnwand live in beide Richtungen ---------------------------------------
    await page.goto(BASE + "/pinnwand");
    await pageB.goto(BASE + "/pinnwand");
    await pinnwandSchreiben(pageB, "Bring bitte Brot mit");
    const pinA = await timed(() => waitFor(page, () => document.body.innerText.includes("Bring bitte Brot mit"), undefined, 15000));
    check(pinA !== null && pinA <= LIVE_MS, `Pinnwand: Lisa → Felix live (${liveText(pinA)})`);
    await pinnwandSchreiben(page, "Mach ich, bis gleich");
    const pinB = await timed(() => waitFor(pageB, () => document.body.innerText.includes("Mach ich, bis gleich"), undefined, 15000));
    check(pinB !== null && pinB <= LIVE_MS, `Pinnwand: Felix → Lisa live (${liveText(pinB)})`);

    const listeA = await store(page, "wasgibts.einkaufsliste");
    check(JSON.stringify(listeA ?? {}).includes("Milch"), "Felix: Milch steht auch in seiner Einkaufsliste");
  } finally {
    await pageB.context().close();
  }
};
