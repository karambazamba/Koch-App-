// Mias Stimme und Ohr über den Server (ElevenLabs) – der Server wird hier
// nachgestellt (Status, Ton, erkannter Text), der echte Anbieter nie gerufen:
// „Wer spricht?“ in den Einstellungen, Probe hören über den Server, Stimme des
// Handys ohne Server, Antwort vorlesen mit stillem Rückfall aufs Handy,
// Zuhören mit eigener Aufnahme (letzter Ersatz seit A-026: ohne Live und ohne
// Spracherkennung im Browser; Satzende an der Stille).
import { BASE, FAKE_VOICES, MIKRO_REGLER, OHNE_ERKENNUNG, hello, miaTippen, seedFamily, tippenFeld } from "../lib.mjs";

/** 0,1 s Stille als WAV (für die nachgestellte Stimme) */
function stilleWav() {
  const samples = 800;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(8000, 24);
  buf.writeUInt32LE(16000, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}

/** Server nachstellen: Status mit Stimme (ohne Live), /api/stimme (Ton oder Fehler), /api/hoeren (Text) */
async function serverMitStimme(page, { stimmeKaputt = false, gehoert = "Was steht heute an", antwortMs = 0 } = {}) {
  const log = { stimme: [], hoeren: [] };
  await page.route("**/api/lotte", async (route) => {
    if (route.request().method() !== "GET") {
      if (antwortMs) await new Promise((r) => setTimeout(r, antwortMs));
      return route.continue().catch(() => {});
    }
    const r = await route.fetch();
    const status = await r.json();
    await route.fulfill({ json: { ...status, stimme: { sprechen: true, hoeren: true, v: "test" } } });
  });
  await page.route("**/api/stimme**", async (route) => {
    const req = route.request();
    log.stimme.push({ method: req.method(), url: req.url(), body: req.postData() ?? "" });
    if (stimmeKaputt) return route.fulfill({ status: 502, json: { error: "fehler" } });
    await route.fulfill({ status: 200, body: stilleWav(), headers: { "content-type": "audio/wav", "x-mia-zeichen": "12" } });
  });
  await page.route("**/api/hoeren", async (route) => {
    const req = route.request();
    log.hoeren.push({ typ: req.headers()["content-type"] ?? "", geraet: req.headers()["x-mia-geraet"] ?? "", bytes: req.postDataBuffer()?.length ?? 0 });
    await route.fulfill({ json: { text: gehoert, sekunden: 3 } });
  });
  return log;
}

/** Handy-Stimme mitschreiben (was über speechSynthesis gesprochen wird) */
const HANDY_MITSCHRIFT = () => {
  window.__gesagt = [];
  const synth = window.speechSynthesis;
  const speak = synth.speak;
  synth.speak = (u) => (u.text.trim() && window.__gesagt.push(u.text), speak(u));
};

export const stimmeServer = async (page, check) => {
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(HANDY_MITSCHRIFT);
  const log = await serverMitStimme(page);
  await hello(page);
  await page.goto(BASE + "/profil/kuechenhelfer");
  const wer = page.getByRole("radiogroup", { name: "Wer spricht?" });
  await wer.waitFor({ timeout: 8000 });
  check((await wer.getByRole("radio", { checked: true }).innerText()).includes("Mias Stimme"), "„Wer spricht?“: Mias Stimme ist Standard");
  check(!(await page.getByRole("radiogroup", { name: "Stimme" }).count()), "bei Mias Stimme keine Handy-Stimmenliste");
  await page.getByRole("button", { name: "Probe hören" }).click();
  await page.waitForTimeout(800);
  const probe = log.stimme.find((s) => s.method === "POST");
  check(Boolean(probe), "Probe hören: Ton vom Server");
  check(probe && JSON.parse(probe.body).text.includes("18 Uhr 30"), "Text bereinigt (18:30 → 18 Uhr 30)");
  check((await page.evaluate(() => window.__gesagt.length)) === 0, "Handy-Stimme schweigt, solange Mias Stimme kommt");

  // Stimme des Handys: Liste wie bisher, Probe ohne Server
  await wer.getByRole("radio", { name: /Stimme des Handys/ }).click();
  await page.getByRole("radiogroup", { name: "Stimme" }).waitFor({ timeout: 3000 });
  check(true, "Stimme des Handys: Stimmenliste da");
  const vorher = log.stimme.length;
  await page.getByRole("button", { name: "Probe hören" }).click();
  await page.waitForTimeout(600);
  check(log.stimme.length === vorher && (await page.evaluate(() => window.__gesagt.length)) > 0, "Stimme des Handys: ohne Server");
  await wer.getByRole("radio", { name: /Mias Stimme/ }).click();

  // Antwort vorlesen (immer): über den Server; geht der kaputt, still das Handy
  await seedFamily(page, { "wasgibts.vorlesen": { version: 1, mode: "an", quelle: "mia", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(800);
  const vorAntwort = log.stimme.length;
  const box = await miaTippen(page);
  await box.fill("Was gibt es heute zu essen?");
  await box.press("Enter");
  await page.waitForTimeout(3500);
  check(log.stimme.length > vorAntwort, "Antwort mit Mias Stimme vorgelesen");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await serverMitStimme(page, { stimmeKaputt: true });
  await page.evaluate(() => (window.__gesagt.length = 0));
  const feld = await tippenFeld(page);
  await feld.fill("Und morgen?");
  await feld.press("Enter");
  await page.waitForTimeout(4000);
  check((await page.evaluate(() => window.__gesagt.length)) > 0, "Server-Stimme kaputt: still mit der Stimme des Handys");
};

export const ohrServer = async (page, check) => {
  // Letzter Ersatz: kein Live (Status ohne `live`) und keine Spracherkennung im Browser
  await page.addInitScript(OHNE_ERKENNUNG);
  await page.addInitScript(MIKRO_REGLER);
  // Mia antwortet langsam: währenddessen hört sie weiter zu (Vorlesen aus)
  const log = await serverMitStimme(page, { antwortMs: 3000, gehoert: "Was gibt es morgen bei uns zum Essen" });
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", quelle: "mia", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  await page.waitForFunction(() => window.__gumAufrufe > 0 && window.__laut, null, { timeout: 5000 });
  check((await page.evaluate(() => window.__starts)) === 0, "ohne Live und Spracherkennung: eigene Aufnahme");

  // Sprechen, kurze Pause (0,9 s), weitersprechen, dann still → nach 1,2 s Stille verstanden
  await page.evaluate(() => window.__laut(0.6));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__laut(0));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.__laut(0.6));
  await page.waitForTimeout(800);
  check(log.hoeren.length === 0, "kurze Pause schickt nichts ab");
  await page.evaluate(() => window.__laut(0));
  await page.waitForTimeout(750);
  check((await page.locator("[data-pause-ring]").count()) === 1, "Stille: Ring läuft ab");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].some((e) => e.textContent.includes("Was gibt es morgen bei uns zum Essen")), null, { timeout: 8000 }).then(
    () => check(true, "nach der Stille: Ton an den Server, Text kommt als Nachricht"),
    () => check(false, "nach der Stille: Ton an den Server, Text kommt als Nachricht"),
  );
  const h = log.hoeren[0];
  check(Boolean(h) && /^audio\//.test(h.typ) && h.bytes > 0 && h.geraet.length > 5, "Aufnahme als Ton mit Gerät (kein Text, keine Datei)");
  check((await page.evaluate(() => window.__starts)) === 0, "keine Spracherkennung des Browsers gebraucht");

  // Antippen beendet sofort (Mia hört nach der Antwort von selbst weiter)
  await page.waitForFunction(() => window.__gumAufrufe > 1, null, { timeout: 8000 }).catch(() => {});
  const lauscht = await page.evaluate(() => window.__gumAufrufe > 1);
  const lage = await page.evaluate(() => ({ gum: window.__gumAufrufe, starts: window.__starts, buehne: Boolean(document.querySelector("[data-buehne-mia]")), url: location.pathname, blasen: [...document.querySelectorAll("[data-gespraech] .rounded-2xl, [data-gespraech] p")].slice(-3).map((e) => e.textContent.slice(0, 60)) }));
  check(lauscht, `nach der Antwort hört Mia weiter zu (eigene Aufnahme) ${lauscht ? "" : JSON.stringify(lage)}`);
  if (!lauscht) return;
  await page.evaluate(() => window.__laut(0.6));
  await page.waitForTimeout(700);
  const vorher = log.hoeren.length;
  await page.locator("[data-buehne-mia]").dispatchEvent("click");
  await page.waitForTimeout(1500);
  check(log.hoeren.length === vorher + 1, "Antippen: sofort verstanden");
};
