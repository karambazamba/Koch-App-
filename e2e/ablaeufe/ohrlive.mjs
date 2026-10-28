// Mia hört live über ElevenLabs (A-026) – ohne echten Anbieter: Status mit
// `live`, Einmal-Schlüssel und der Websocket werden nachgestellt
// (`FAKE_ECHTZEIT`). Geprüft: Schlüssel vom eigenen Server, Adresse mit
// Deutsch und VAD, Ton-Stücke kommen an, Live-Text beim Sprechen, Ring ohne
// neue Wörter, Satzende von ElevenLabs schickt sofort ab, Antippen beendet
// (Commit), keine Spracherkennung des Browsers gebraucht; Ersatz-Kette:
// Schlüssel kaputt → Browser, Verbindung kaputt → Browser, ohne Browser-
// Erkennung → eigene Aufnahme.
import { BASE, FAKE_ECHTZEIT, FAKE_HOEREN, FAKE_VOICES, MIKRO_REGLER, OHNE_ERKENNUNG, hello, seedFamily } from "../lib.mjs";

/** Abgeschickte eigene Nachrichten (nicht die Live- oder „wartet“-Blase) */
const eigene = (page) => page.locator("[data-gespraech] .bg-accent.rounded-br-md").evaluateAll((els) => els.filter((e) => !e.closest("[data-eigene-blase]")).map((e) => e.textContent.trim()));
const liveBlase = (page) => page.locator("[data-gespraech] [data-eigene-blase]").evaluateAll((els) => els.map((e) => e.textContent.trim()).join(" "));

/** Server nachstellen: Status mit Live-Ohr, Einmal-Schlüssel (ok/kaputt/aus), /api/hoeren */
async function serverLive(page, { token = "ok", antwortMs = 0 } = {}) {
  const log = { token: [], hoeren: 0 };
  await page.route("**/api/lotte", async (route) => {
    if (route.request().method() !== "GET") {
      if (antwortMs) await new Promise((r) => setTimeout(r, antwortMs));
      return route.continue().catch(() => {});
    }
    const r = await route.fetch();
    const status = await r.json();
    await route.fulfill({ json: { ...status, stimme: { sprechen: false, hoeren: true, live: true, v: "test" } } });
  });
  await page.route("**/api/stimme/ohr-token", async (route) => {
    const req = route.request();
    log.token.push({ geraet: JSON.parse(req.postData() ?? "{}").geraet ?? "" });
    if (token === "kaputt") return route.fulfill({ status: 502, json: { error: "fehler" } });
    if (token === "aus") return route.fulfill({ status: 503, json: { error: "aus" } });
    await route.fulfill({ json: { token: "test-einmal", modell: "scribe_v2_realtime", giltMs: 900000 } });
  });
  await page.route("**/api/hoeren", async (route) => {
    log.hoeren++;
    await route.fulfill({ json: { text: "Was steht heute an", sekunden: 2 } });
  });
  return log;
}

async function vorbereiten(page) {
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", quelle: "mia", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
}

export const ohrLive = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  const log = await serverLive(page, { antwortMs: 2500 });
  await vorbereiten(page);
  await page.waitForFunction(() => window.__live?.offen?.readyState === 1, null, { timeout: 6000 }).then(
    () => check(true, "live verbunden"),
    () => check(false, "live verbunden"),
  );
  const adresse = new URL(await page.evaluate(() => window.__live.adressen[0]));
  check(log.token.length === 1 && log.token[0].geraet.length > 5, "Einmal-Schlüssel vom eigenen Server (mit Gerät)");
  check(adresse.searchParams.get("token") === "test-einmal" && adresse.searchParams.get("language_code") === "de" && adresse.searchParams.get("commit_strategy") === "vad" && adresse.searchParams.get("audio_format") === "pcm_16000", "Websocket: Einmal-Schlüssel, Deutsch fest, PCM 16 kHz, VAD");
  check(adresse.searchParams.get("vad_silence_threshold_secs") === "1.2", "Satzende nach 1,2 s Stille");
  await page.evaluate(() => window.__laut(0.5));
  await page.waitForTimeout(600);
  check((await page.evaluate(() => window.__live.stuecke)) > 0, "Ton wird gestreamt (Stücke kommen an)");
  check((await page.evaluate(() => window.__starts)) === 0, "keine Spracherkennung des Browsers gebraucht");

  // Live-Text beim Sprechen
  await page.evaluate(() => window.__live.teil("Was gibt es"));
  await page.waitForTimeout(150);
  check((await liveBlase(page)).includes("Was gibt es"), "Live-Text erscheint beim Sprechen");
  await page.evaluate(() => window.__live.teil("Was gibt es morgen zum Essen"));
  await page.waitForTimeout(750);
  check((await page.locator("[data-pause-ring]").count()) === 1, "0,6 s ohne neue Wörter: Ring „Gleich schick ich’s ab“");
  check((await eigene(page)).length === 0, "ohne Satzende noch nichts abgeschickt");
  // Satzende von ElevenLabs (VAD) → sofort an Mia
  await page.evaluate(() => window.__live.satz("Was gibt es morgen zum Essen?"));
  await page.waitForTimeout(300);
  check((await eigene(page)).includes("Was gibt es morgen zum Essen?"), "Satzende (VAD): sofort abgeschickt");
  check((await page.evaluate(() => window.__live.offen)) === null, "Verbindung nach dem Satz zu");

  // Mia hört nach dem Abschicken weiter (Vorlesen aus) – Antippen beendet sofort
  await page.waitForFunction(() => window.__live?.offen?.readyState === 1, null, { timeout: 8000 }).catch(() => {});
  const weiter = await page.evaluate(() => window.__live.adressen.length >= 2 && window.__live.offen?.readyState === 1);
  check(weiter, "danach hört Mia wieder live zu (neuer Einmal-Schlüssel)");
  if (!weiter) return;
  check(log.token.length >= 2, "jede Runde ein eigener Einmal-Schlüssel");
  await page.evaluate(() => window.__live.teil("Und Milch auf die Liste"));
  await page.waitForTimeout(150);
  await page.locator("[data-buehne-mia]").dispatchEvent("click");
  await page.waitForTimeout(500);
  check((await page.evaluate(() => window.__live.commits)) === 1, "Antippen: Satz von Hand abgeschlossen (Commit)");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].some((e) => e.textContent.includes("Und Milch auf die Liste")), null, { timeout: 3000 }).then(
    () => check(true, "Antippen: sofort abgeschickt"),
    () => check(false, "Antippen: sofort abgeschickt"),
  );
};

export const ohrLiveSchluesselKaputt = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  const log = await serverLive(page, { token: "kaputt" });
  await vorbereiten(page);
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 6000 }).then(
    () => check(true, "Schlüssel kaputt: Spracherkennung des Browsers hört zu"),
    () => check(false, "Schlüssel kaputt: Spracherkennung des Browsers hört zu"),
  );
  check(log.token.length === 1 && (await page.evaluate(() => window.__live.adressen.length)) === 0, "kein Websocket ohne Schlüssel");
  await page.evaluate(() => window.__sag([["Was steht morgen an", true]]));
  await page.waitForTimeout(150);
  check((await liveBlase(page)).includes("Was steht morgen an"), "Live-Text auch über den Browser");
  await page.waitForTimeout(1500);
  check((await eigene(page)).includes("Was steht morgen an"), "nach 1,2 s Stille abgeschickt (Browser)");
};

export const ohrLiveVerbindungKaputt = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  await page.addInitScript(() => (window.__live.kaputt = true));
  await serverLive(page);
  await vorbereiten(page);
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 6000 }).then(
    () => check(true, "Verbindung bricht ab: weiter über den Browser"),
    () => check(false, "Verbindung bricht ab: weiter über den Browser"),
  );
  check((await page.locator("text=Hat grad nicht geklappt").count()) === 0, "kein Fehler zu sehen, nichts hängt");
};

export const ohrLiveOhneBrowser = async (page, check) => {
  await page.addInitScript(OHNE_ERKENNUNG);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  const log = await serverLive(page, { token: "aus" });
  await vorbereiten(page);
  await page.waitForFunction(() => window.__gumAufrufe >= 1 && window.__laut, null, { timeout: 6000 }).catch(() => {});
  // Schlüssel „aus“ und keine Spracherkennung → eigene Aufnahme, Satzende am Pegel
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__laut?.(0.6));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__laut?.(0));
  await page.waitForTimeout(2500);
  check(log.hoeren === 1, "ohne Live und ohne Browser-Erkennung: eigene Aufnahme an /api/hoeren");
  check((await eigene(page)).includes("Was steht heute an"), "Text kommt als Nachricht");
};
