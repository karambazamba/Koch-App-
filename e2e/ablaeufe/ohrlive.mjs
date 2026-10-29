// Mia hört live über ElevenLabs (A-026) – ohne echten Anbieter: Status mit
// `live`, Einmal-Schlüssel und der Websocket werden nachgestellt
// (`FAKE_ECHTZEIT`). Geprüft: Schlüssel vom eigenen Server, Adresse mit
// Deutsch und VAD, Ton-Stücke kommen an, Live-Text beim Sprechen, Ring ohne
// neue Wörter, Satzende von ElevenLabs schickt sofort ab, Antippen beendet
// (Commit), keine Spracherkennung des Browsers gebraucht; Ersatz-Kette:
// Schlüssel kaputt → Browser, Verbindung kaputt → Browser, ohne Browser-
// Erkennung → eigene Aufnahme.
// A-056: Schlüssel vorgewärmt (schon vor dem Tippen geholt), Mikro sofort beim
// Antippen, der gepufferte Anfang geht als erstes Stück raus (`hoertSofort`),
// scheitert live nach dem ersten Wort, übernimmt die eigene Aufnahme den
// Puffer (`ohrLivePufferUebernimmt`), Zeiten im Mikro-Protokoll.
import { BASE, FAKE_ECHTZEIT, FAKE_HOEREN, FAKE_VOICES, MIKRO_REGLER, OHNE_ERKENNUNG, hello, seedFamily } from "../lib.mjs";

/** Abgeschickte eigene Nachrichten (nicht die Live- oder „wartet“-Blase) */
const eigene = (page) => page.locator("[data-gespraech] .bg-accent.rounded-br-md").evaluateAll((els) => els.filter((e) => !e.closest("[data-eigene-blase]")).map((e) => e.textContent.trim()));
const liveBlase = (page) => page.locator("[data-gespraech] [data-eigene-blase]").evaluateAll((els) => els.map((e) => e.textContent.trim()).join(" "));

/** Server nachstellen: Status mit Live-Ohr, Einmal-Schlüssel (ok/kaputt/aus), /api/hoeren */
async function serverLive(page, { token = "ok", antwortMs = 0, tokenMs = 0 } = {}) {
  const log = { token: [], hoeren: 0, hoerenTyp: "" };
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
    log.token.push({ geraet: JSON.parse(req.postData() ?? "{}").geraet ?? "", at: Date.now() });
    if (tokenMs) await new Promise((r) => setTimeout(r, tokenMs));
    if (token === "kaputt") return route.fulfill({ status: 502, json: { error: "fehler" } });
    if (token === "aus") return route.fulfill({ status: 503, json: { error: "aus" } });
    await route.fulfill({ json: { token: "test-einmal", modell: "scribe_v2_realtime", giltMs: 900000 } });
  });
  await page.route("**/api/hoeren", async (route) => {
    log.hoeren++;
    log.hoerenTyp = route.request().headers()["content-type"] ?? "";
    log.gumBeimHoeren = await page.evaluate(() => window.__gumAufrufe).catch(() => -1);
    await route.fulfill({ json: { text: "Was steht heute an", sekunden: 2 } });
  });
  return log;
}

async function vorbereiten(page, { nachTippen } = {}) {
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", quelle: "mia", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(1200);
  const getippt = Date.now();
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  // Sofort nach dem Tippen sprechen (das erste Wort darf nicht verloren gehen)
  if (nachTippen) await nachTippen();
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  return getippt;
}

/** Zeiten aus dem Mikro-Protokoll: Tippen → Mikro an → Verbindung → erstes Wort (nur Zahlen) */
const zeiten = (page) => page.evaluate(() => (JSON.parse(localStorage.getItem("wasgibts.mikroprotokoll") ?? "{}").entries ?? []).map((e) => e.text).filter((t) => t.startsWith("Ohr (")));

export const ohrLive = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  const log = await serverLive(page, { antwortMs: 2500 });
  const getippt = await vorbereiten(page);
  await page.waitForFunction(() => window.__live?.offen?.readyState === 1, null, { timeout: 6000 }).then(
    () => check(true, "live verbunden"),
    () => check(false, "live verbunden"),
  );
  const adresse = new URL(await page.evaluate(() => window.__live.adressen[0]));
  check(log.token.length >= 1 && log.token[0].geraet.length > 5, "Einmal-Schlüssel vom eigenen Server (mit Gerät)");
  check(log.token[0].at < getippt, "Schlüssel schon vor dem Tippen vorgewärmt (A-056)");
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
  // Mia hört danach gleich wieder zu (Schlüssel vorgewärmt) – die ERSTE Verbindung ist zu
  check(await page.evaluate(() => window.__live.offen === null || window.__live.adressen.length >= 2), "Verbindung nach dem Satz zu");

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
    () => check(true, "Schlüssel kaputt (still, nichts gesagt): Spracherkennung des Browsers hört zu"),
    () => check(false, "Schlüssel kaputt (still, nichts gesagt): Spracherkennung des Browsers hört zu"),
  );
  check(log.token.length >= 1 && (await page.evaluate(() => window.__live.adressen.length)) === 0, "kein Websocket ohne Schlüssel");
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

/** A-056: sofort nach dem Tippen sprechen – der Anfang wird gepuffert und geht als erstes Stück raus */
export const hoertSofort = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  // Langsamer Schlüssel: auch der vorgewärmte ist beim Tippen noch unterwegs (kommt erst nach dem Tippen; der Client wartet höchstens 2,5 s)
  await serverLive(page, { tokenMs: 2000 });
  await vorbereiten(page, {
    nachTippen: async () => {
      await page.waitForFunction(() => window.__laut, null, { timeout: 3000 }).catch(() => {});
      await page.evaluate(() => window.__laut?.(0.5));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__laut?.(0));
    },
  });
  await page.waitForFunction(() => window.__live?.offen?.readyState === 1, null, { timeout: 8000 }).then(
    () => check(true, "live verbunden (Schlüssel langsam)"),
    () => check(false, "live verbunden (Schlüssel langsam)"),
  );
  await page.waitForTimeout(300);
  const live = await page.evaluate(() => ({ laut: window.__live.laut, werte: window.__live.werte }));
  check(live.laut.length > 0 && live.laut[0] > 0.2, `erstes Wort (gleich nach dem Tippen) ist im ersten Stück (lautester Wert ${live.laut[0]})`);
  check(live.werte[0] >= 16_000 * 0.5, `gepufferter Anfang geht zuerst raus (${Math.round((live.werte[0] ?? 0) / 16)} ms Ton am Stück)`);
  check((await page.evaluate(() => window.__gumAufrufe)) === 1, "nur EIN Mikrofon (Vorlauf vom Antippen übernommen)");
  check((await page.locator("[data-ring]").count()) === 1, "„Ich höre“-Ring, weil das Mikro wirklich aufnimmt");
  await page.evaluate(() => window.__live.teil("Milch auf die Liste"));
  await page.waitForTimeout(200);
  const z = await zeiten(page);
  const zeile = z.find((t) => t.startsWith("Ohr (live): Tippen→Mikro")) ?? "";
  const ms = [...zeile.matchAll(/(\d+) ms/g)].map((m) => Number(m[1]));
  check(ms.length === 3 && ms[0] <= ms[1] && ms[1] <= ms[2], `Zeiten im Mikro-Protokoll: ${zeile.replace("Ohr (live): ", "")}`);
  check(ms[0] < 1000, `Mikro an nach ${ms[0]} ms (Ziel unter 300 ms auf dem Handy)`);
};

/** A-056: live scheitert, nachdem schon gesprochen wurde – die eigene Aufnahme übernimmt den Puffer (WAV), kein Wort weg */
export const ohrLivePufferUebernimmt = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await page.addInitScript(MIKRO_REGLER);
  await page.addInitScript(FAKE_ECHTZEIT);
  const log = await serverLive(page, { token: "kaputt", tokenMs: 700 });
  await vorbereiten(page, {
    nachTippen: async () => {
      await page.waitForFunction(() => window.__laut, null, { timeout: 3000 }).catch(() => {});
      await page.evaluate(() => window.__laut?.(0.6));
    },
  });
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.__laut?.(0));
  await page.waitForFunction(() => document.querySelector("[data-gespraech]")?.textContent?.includes("Was steht heute an"), null, { timeout: 6000 }).catch(() => {});
  check(log.hoeren === 1, "live kaputt nach dem ersten Wort: eigene Aufnahme an /api/hoeren");
  check(log.hoerenTyp.startsWith("audio/wav"), `Aufnahme aus dem Puffer als WAV (${log.hoerenTyp || "–"})`);
  check((await page.evaluate(() => window.__starts)) === 0, "Browser-Erkennung nicht gebraucht (Anfang wäre weg)");
  check(log.gumBeimHoeren === 1, "Mikro lief durch (nur EIN getUserMedia bis zur Aufnahme)");
  check((await eigene(page)).includes("Was steht heute an"), "Text kommt als Nachricht");
};
