// Gemeinsame Hilfen für Durchklick (`npm run durchklick`) und Bildvergleich
// (`npm run bilder`): Testserver starten (fertiger Build, Testmodi an),
// Geräte, feste Zeit, fester Zufall, Beispiel-Familie und echte Touch-Gesten
// über das Chrome-Protokoll (CDP). Zeit: Mittwoch, 21.10.2026, 10:30 (Berlin).

import { spawn } from "node:child_process";
import { chromium, devices } from "playwright";

const PORT = Number(process.env.E2E_PORT || 3210);
export const BASE = process.env.E2E_BASE || `http://localhost:${PORT}`;
const TIME = "2026-10-21T10:30:00+02:00";
export const DEVICES = ["iPhone SE", "iPhone 15 Pro", "Pixel 7"];

/** Testserver mit Testmodus für KI, Wetter und Tipps (braucht `npm run build`) – oder E2E_BASE nutzen */
export async function startServer() {
  if (process.env.E2E_BASE) return () => {};
  if (await fetch(BASE).then(() => true, () => false)) throw new Error(`Port ${PORT} ist schon belegt – alten Testserver beenden (fuser -k ${PORT}/tcp) oder E2E_BASE setzen`);
  const child = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, KUECHENHELFER_MOCK: "1", WETTER_MOCK: "1", TIPS_SOURCE: "demo", KONTEN_TEST: "1", PORT: String(PORT) },
    stdio: "ignore",
    detached: true,
  });
  // npx startet next als Kindprozess – die ganze Gruppe beenden, sonst läuft ein alter Server weiter
  const kill = () => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      // schon beendet
    }
  };
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return kill;
    } catch {
      // startet noch
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  kill();
  throw new Error(`Testserver auf ${BASE} startet nicht – vorher npm run build?`);
}

export const launch = (args = []) => chromium.launch({ args });

/** Fester Zufall (für Vorschläge, Reihenfolgen), damit Bilder gleich bleiben */
const SEEDED_RANDOM = () => {
  let s = 42;
  Math.random = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
};

/** Einwilligungen (KI, Bedingungen) als gegeben – wie nach „Erlauben“ */
const CONSENT = () => {
  try {
    if (!localStorage.getItem("wasgibts.einwilligungen")) {
      const ok = { ja: true, version: 1, at: "2026-10-01T00:00:00.000Z" };
      localStorage.setItem("wasgibts.einwilligungen", JSON.stringify({ version: 1, arten: { ki: { ...ok, version: 2 }, bedingungen: ok } }));
    }
  } catch {
    // ohne Speicher (about:blank) nichts zu tun
  }
};

/** Karte „Mia auf den Home-Bildschirm“ (A-027) gilt als erledigt – sonst stünde sie im Browser auf jeder Startseite; eigener Ablauf `homeKarte` */
const HOMESCREEN_DONE = () => {
  try {
    if (!localStorage.getItem("wasgibts.homebildschirm")) localStorage.setItem("wasgibts.homebildschirm", JSON.stringify({ version: 1, spaeter: 0, am: null, fertig: true }));
  } catch {
    // ohne Speicher (about:blank) nichts zu tun
  }
};

/** /api/lotte nachgestellt: „braucht Zugangscode“ mit ausgedachtem Prüfcode (nie der echte, der liegt nur in Vercel) */
export const PRUEF_CODE = "nur-im-test";
export async function serverMitCode(page, seen = { urls: [] }) {
  await page.route("**/api/lotte**", async (route) => {
    const req = route.request();
    seen.urls.push(req.url());
    const code = req.headers()["x-lotte-code"];
    if (req.method() === "GET") {
      const status = { configured: true, mock: false, needsCode: true, ...(code ? { access: code === PRUEF_CODE ? "ok" : "falsch" } : {}) };
      return route.fulfill({ json: status });
    }
    if (code !== PRUEF_CODE) return route.fulfill({ status: 401, json: { error: "zugangscode" } });
    return route.continue();
  });
  return seen;
}

/** Neue Seite auf einem Gerät: feste Zeit, Zeitzone Berlin, Bewegung reduziert, hell/dunkel */
/** Mikrofon erlaubt wie bei jemandem, der „Erlauben“ getippt hat (Sperre stellt `FAKE_MIC` nach) */
export async function newPage(browser, device, { dark = false, time = TIME, permissions = ["microphone"], consent = true, homeKarte = false } = {}) {
  const ctx = await browser.newContext({ ...devices[device], timezoneId: "Europe/Berlin", locale: "de-DE", colorScheme: dark ? "dark" : "light", reducedMotion: "reduce", permissions });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|favicon/.test(m.text()) && page.errors.push(m.text()));
  await page.clock.setFixedTime(new Date(time));
  await page.addInitScript(SEEDED_RANDOM);
  // Datenschutz (Platz 23): Einwilligungen für KI und Bedingungen schon gegeben – nur wenn noch keine da sind
  if (consent) await page.addInitScript(CONSENT);
  if (!homeKarte) await page.addInitScript(HOMESCREEN_DONE);
  return page;
}

/** Hallo (A-027: Zustimmung als Häkchen im Hallo – ohne Zustimmung erst anhaken) → „Los geht’s“ → „Für wen soll ich sortieren?“ */
export async function losGehts(page, wahl = "Für die Familie") {
  const los = page.getByRole("button", { name: "Los geht’s" });
  await los.waitFor();
  const haken = page.getByRole("checkbox", { name: /^Ich akzeptiere die/ });
  if (!(await haken.isChecked())) await page.getByText(/^Ich akzeptiere die/).click();
  await los.click();
  await page.getByRole("button", { name: wahl }).click();
}

/** Erster Start wie im echten Leben: Hallo → „Los geht’s“ → „Für wen soll ich sortieren?“ → Startseite mit Beispiel-Tag */
export async function hello(page) {
  await page.goto(BASE);
  await losGehts(page);
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor();
  // Startwerte werden kurz nach dem Hallo gespeichert – erst danach eigene Daten einspielen
  await page.waitForFunction(() => Boolean(localStorage.getItem("familienkueche.haushaltsprofil") && localStorage.getItem("wasgibts.beispiel")));
  await page.waitForTimeout(600);
}

const stamp = "2026-10-20T08:00:00.000Z";
const entry = (id, typ, data, raum = "familie", at = stamp) => ({ id, typ, raum, besitzer: "lokal", erstellt: at, geaendert: at, data });
/** Pinnwand: ein Zettel von gestern Abend (bleibt bis „Erledigt“ bzw. 7 Tage) */
const PIN_STAMP = "2026-10-20T18:00:00.000Z";

/** Beispiel-Familie mit eigenen Einträgen (statt Beispiel-Tag) */
const FAMILY = {
  persons: [
    { id: "a1", role: "erwachsen", name: "Lisa", allergies: [], dislikes: [], weekdayLunch: "zuhause" },
    { id: "a2", role: "erwachsen", name: "Felix", allergies: [], dislikes: [], weekdayLunch: "auswaerts" },
    { id: "k1", role: "kind", name: "Mathis", allergies: [], dislikes: [], ageGroup: "schulkind", age: 8, weekdayLunch: "auswaerts" },
  ],
  data: {
    "wasgibts.eintraege": {
      version: 2,
      migratedTermine: true,
      seenReminders: [],
      entries: [
        entry("t1", "termin", { title: "Zahnarzt", date: "2026-10-21", start: "16:15", place: "Praxis Dr. Berg", reminder: "30", doneDates: [], skipDates: [] }),
        entry("t2", "termin", { title: "Elternabend", date: "2026-10-21", start: "19:30", reminder: "aus", doneDates: [], skipDates: [] }),
        entry("t3", "termin", { title: "Fußball Mathis", date: "2026-10-23", start: "17:00", label: "Sport", reminder: "aus", doneDates: [], skipDates: [] }),
        entry("a1", "aufgabe", { title: "Kita-Formular abgeben", date: "2026-10-21", reminder: "aus", doneOn: null, dringend: true }),
        entry("a2", "aufgabe", { title: "Geschenk für Oma", reminder: "aus", doneOn: null }),
      ],
    },
    "wasgibts.vorrat": {
      version: 2,
      items: [
        { id: "p1", name: "Joghurt", amount: null, unit: "", addedAt: "2026-10-16", place: "kuehlschrank" },
        { id: "p2", name: "Paprika", amount: 2, unit: "Stück", addedAt: "2026-10-18", place: "kuehlschrank" },
        { id: "p3", name: "Reis", amount: 500, unit: "g", addedAt: "2026-10-10", place: "schrank" },
        { id: "p4", name: "Erbsen", amount: null, unit: "", addedAt: "2026-10-01", place: "tiefkuehler" },
      ],
    },
    "wasgibts.notizen": { version: 1, notes: [entry("n1", "notiz", { title: "WLAN", kind: "text", text: "Passwort: Sonnenblume42", pinned: true })] },
    "wasgibts.pinnwand": { version: 2, messages: [entry("pin1", "pinnwand", { text: "Bin um 20 Uhr da", author: "Felix", reactions: {}, readBy: ["Felix"], pinned: false }, "familie", PIN_STAMP)], memos: [] },
    "wasgibts.funktionen": { version: 2, on: ["vorrat", "rezepte", "wochenplan", "regiontipps"] },
    "wasgibts.beispiel": { version: 1, since: "2026-10-21", cleared: ["termine", "aufgaben", "pinnwand", "einkauf", "essen"], done: [], gone: [], asked: true },
    // Mias Frage nach Erinnerungen ist schon beantwortet (eigener Ablauf `erinnerungFrage`)
    "wasgibts.mitteilungen": { version: 1, defaultReminder: "30", kinds: { erinnerungen: true, pinnwand: true, abgeben: true, morgen: false }, answer: "nein", askedAt: "2026-10-21T08:00:00.000Z", asks: 2, sent: [] },
    // Mias Karte beim ersten Besuch jeder Seite stand schon (eigener Ablauf `ersterBesuchKarte`)
    "wasgibts.miadenkt": { version: 1, level: "normal", vorgestellt: {}, besucht: ["seite:kalender", "/aufgaben", "/einkaufsliste", "seite:essen", "seite:essen-imhaus", "/pinnwand", "/wetter", "/notizen"], antworten: {}, rituale: [], eingeplant: [], tage: {}, sprueche: [] },
  },
};

/** Familie und eigene Daten einspielen (nach `hello`), dann neu laden */
export async function seedFamily(page, extra = {}) {
  await page.evaluate(({ family, extra }) => {
    const p = JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil"));
    p.persons = family.persons;
    p.adults = 2;
    p.kids = 1;
    p.householdType = "familie";
    p.householdName = "Müller";
    localStorage.setItem("familienkueche.haushaltsprofil", JSON.stringify(p));
    for (const [k, v] of Object.entries({ ...family.data, ...extra })) localStorage.setItem(k, JSON.stringify(v));
  }, { family: FAMILY, extra });
}

/** Dunkel als eigene Wahl (Profil), passend zu colorScheme "dark" */
export async function setDark(page) {
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil"));
    p.theme = "nacht";
    p.themeSet = true;
    localStorage.setItem("familienkueche.haushaltsprofil", JSON.stringify(p));
  });
}

export const store = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), key);

/** Echte Touch-Wischgeste (iOS bricht Pointer-Events beim Scrollen ab – deshalb Touch über CDP) */
export async function swipe(page, { x, y, dx, dy = 0, ms = 260, steps = 10 }) {
  const cdp = await page.context().newCDPSession(page);
  const point = (px, py) => [{ x: Math.round(px), y: Math.round(py), id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(x, y) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(x + (dx * i) / steps, y + (dy * i) / steps) });
    await new Promise((r) => setTimeout(r, ms / steps));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Prüfungen sammeln statt beim ersten Fehler abzubrechen */
export function checker(prefix) {
  const failed = [];
  const check = (ok, msg) => {
    if (!ok) failed.push(`${prefix}: ${msg}`);
    console.log(`${ok ? "✓" : "✗"} ${prefix} · ${msg}`);
  };
  return { check, failed };
}

/**
 * Auf der Bühne nur EINE Mia (Video 27.10.): höchstens ein sichtbarer Ring
 * (Wellen beim Zuhören bzw. Ablauf-Ring beim Abschicken) und genau `mias`
 * antippbare Mias (Knopf mit Mia-Gesicht, sichtbar, nicht abgeschaltet).
 */
export async function eineMia(page, check, wo, { mias = 1 } = {}) {
  const r = await page.evaluate(() => {
    const shown = (el) => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return false;
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0 || s.pointerEvents === "none") return false;
      }
      return true;
    };
    const rings = [...document.querySelectorAll("[data-ring]")].filter(shown).length;
    const tappable = [...document.querySelectorAll("button, a, [role=button]")].filter((b) => b.querySelector(".begleitung-avatar") && !b.disabled && shown(b)).length;
    return { rings, tappable };
  });
  check(r.rings <= 1, `${wo}: höchstens ein Ring um Mia (${r.rings})`);
  check(r.tappable === mias, `${wo}: ${mias === 1 ? "genau eine antippbare Mia" : `${mias} antippbare Mias`} (${r.tappable})`);
}

/** Schein-Mikrofon: jeder Versuch scheitert mit `window.__micError` */
export const FAKE_MIC = () => {
  window.__micError = window.__micError || "not-allowed";
  class FakeRecognition {
    start() {
      setTimeout(() => {
        this.onerror?.({ error: window.__micError });
        this.onend?.();
      }, 50);
    }
    stop() {}
    abort() {}
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
  const deny = () => Promise.reject(new DOMException("nein", "NotAllowedError"));
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = deny;
  // Speicher wie in einem normalen Tab (privat nur, wenn ein Ablauf es will)
  if (navigator.storage) navigator.storage.estimate = () => Promise.resolve({ quota: window.__privat ? 40 * 1024 * 1024 : 10 * 1024 * 1024 * 1024, usage: 0 });
  const query = navigator.permissions?.query?.bind(navigator.permissions);
  if (navigator.permissions)
    navigator.permissions.query = (d) => (d?.name === "microphone" ? Promise.resolve({ state: "prompt", onchange: null }) : query(d));
};

/**
 * Schein-Mikrofon für den Mikro-Check (Tafel 86), gesteuert über window-Werte:
 * `__erkennung` ("ok" oder Fehlername der Spracherkennung), `__gum` ("ton" =
 * Ton kommt an, "still" = kein Ton, "haengt" = antwortet nie, sonst
 * Fehlername), `__privat` (privater Tab).
 */
export const FAKE_MIC_CHECK = () => {
  window.__erkennung = window.__erkennung ?? "ok";
  window.__gum = window.__gum ?? "ton";
  class FakeRecognition {
    start() {
      setTimeout(() => {
        if (window.__erkennung === "ok") this.onstart?.();
        else {
          this.onerror?.({ error: window.__erkennung });
          this.onend?.();
        }
      }, 50);
    }
    stop() {}
    abort() {}
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
  if (navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = () => {
      if (window.__gum === "haengt") return new Promise(() => {});
      if (window.__gum !== "ton" && window.__gum !== "still") return Promise.reject(new DOMException("nein", window.__gum));
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      if (window.__gum === "ton") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.6;
        osc.connect(gain).connect(dest);
        osc.start();
      }
      return Promise.resolve(dest.stream);
    };
  if (navigator.storage) navigator.storage.estimate = () => Promise.resolve({ quota: window.__privat ? 40 * 1024 * 1024 : 10 * 1024 * 1024 * 1024, usage: 0 });
};

/**
 * Schein-Spracherkennung zum Steuern aus dem Test: `__sag(ergebnisse, ab)`
 * meldet Ergebnisse ([text, fertig?] je Position), `__ende()` = der Browser
 * beendet nach Stille, `__starts` zählt die Starts.
 */
export const FAKE_HOEREN = () => {
  window.__starts = 0;
  class FakeRecognition {
    start() {
      window.__starts++;
      window.__rec = this;
      this.running = true;
      // `__haengt` = diese Start-Nummern bleiben stumm (iPhone-Hänger: start() wirft nicht, es kommt nie etwas)
      this.stumm = (window.__haengt ?? []).includes(window.__starts);
      if (!this.stumm) setTimeout(() => this.running && this.onstart?.(), 20);
      // `__belegt` = Mikro belegt (Bildschirmaufnahme, Telefonat): Start ja, Ton nie, sofort Ende
      if (window.__belegt && !this.stumm)
        setTimeout(() => {
          if (!this.running) return;
          this.running = false;
          this.onend?.();
        }, 60);
    }
    stop() {
      if (!this.running || this.stumm) return;
      this.running = false;
      setTimeout(() => this.onend?.(), 30);
    }
    abort() {
      this.running = false;
    }
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
  window.__sag = (list, ab = 0) => {
    const results = list.map(([text, fertig]) => Object.assign([{ transcript: text }], { isFinal: Boolean(fertig) }));
    window.__rec?.onresult?.({ resultIndex: ab, results });
  };
  window.__ende = () => {
    const r = window.__rec;
    if (!r?.running) return;
    r.running = false;
    r.onend?.();
  };
};

/**
 * Schein-Realtime von ElevenLabs (Test-Doppel für den Websocket, A-026): nur
 * Adressen mit „/v1/speech-to-text/realtime“ werden nachgestellt, alles andere
 * (z. B. der Entwicklungs-Server) bleibt echt. `__live.teil(text)` = vorläufiger
 * Text, `__live.satz(text)` = fertiger Satz (VAD), Antippen schickt einen Commit
 * – den beantwortet die Schein-Verbindung mit dem letzten vorläufigen Text.
 * `__live.kaputt = true` = Verbindung bricht sofort ab. `__live.adressen`,
 * `__live.stuecke` (Ton-Stücke), `__live.commits` zum Prüfen.
 */
export const FAKE_ECHTZEIT = () => {
  const Echt = window.WebSocket;
  const live = (window.__live = { adressen: [], stuecke: 0, commits: 0, kaputt: false, offen: null, letzterTeil: "" });
  class FakeLive {
    constructor(url) {
      this.url = String(url);
      this.readyState = 0;
      live.adressen.push(this.url);
      live.offen = this;
      live.letzterTeil = "";
      setTimeout(() => {
        if (live.kaputt) {
          this.readyState = 3;
          this.onerror?.();
          this.onclose?.();
          return;
        }
        this.readyState = 1;
        this.onopen?.();
        this.melde({ message_type: "session_started", session_id: "test" });
      }, 60);
    }
    melde(m) {
      if (this.readyState === 1) this.onmessage?.({ data: JSON.stringify(m) });
    }
    send(d) {
      const m = JSON.parse(d);
      if (m.commit) {
        live.commits++;
        setTimeout(() => this.melde({ message_type: "committed_transcript", text: live.letzterTeil }), 80);
      } else live.stuecke++;
    }
    close() {
      this.readyState = 3;
      if (live.offen === this) live.offen = null;
    }
  }
  live.teil = (text) => {
    live.letzterTeil = text;
    live.offen?.melde({ message_type: "partial_transcript", text });
  };
  live.satz = (text) => live.offen?.melde({ message_type: "committed_transcript", text });
  window.WebSocket = function (url, protocols) {
    return String(url).includes("/v1/speech-to-text/realtime") ? new FakeLive(url) : new Echt(url, protocols);
  };
  Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3, prototype: Echt.prototype });
};

/** Mikrofon mit regelbarer Lautstärke: `__laut(0.6)` = sprechen, `__laut(0)` = still; `__gumAufrufe` zählt */
export const MIKRO_REGLER = () => {
  window.__gumAufrufe = 0;
  navigator.mediaDevices.getUserMedia = () => {
    window.__gumAufrufe++;
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(dest);
    osc.start();
    window.__laut = (v) => (gain.gain.value = v);
    return Promise.resolve(dest.stream);
  };
};

/** Keine Spracherkennung im Browser (z. B. Firefox, oder auf dem iPhone abgeschaltet) */
export const OHNE_ERKENNUNG = () => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  window.__starts = 0;
};

/** Schein-Sprachausgabe: Stimmen aus `window.__voices`, Sprechen endet sofort */
export const FAKE_VOICES = () => {
  const mk = (name) => ({ name, voiceURI: `com.apple.voice.${name}`, lang: "de-DE", localService: true, default: false });
  window.__voices = window.__voices || [mk("Anna"), mk("Markus")];
  window.__mk = mk;
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => window.__voices,
    speak: (u) => setTimeout(() => (u.onstart?.(), setTimeout(() => u.onend?.(), 300)), 10),
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
};

/** Mia holen (runder Knopf) und das Tippen-Feld öffnen – gibt das Feld zurück */
export async function miaTippen(page) {
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  return tippenFeld(page);
}

/** In der offenen Mia-Ansicht das Tippen-Feld holen (falls Mia gerade zuhört) */
export async function tippenFeld(page) {
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  if (!(await box.isVisible().catch(() => false))) {
    const tippen = page.getByRole("button", { name: "Lieber schreiben", exact: true });
    await tippen.waitFor({ timeout: 5000 });
    await tippen.click();
  }
  await box.waitFor({ timeout: 5000 });
  return box;
}

/** „＋“ öffnet die Schnelleingabe – „Mehr Details“ öffnet das volle Fenster */
export async function mehrDetails(page) {
  const link = page.getByRole("dialog", { name: "Schnelleingabe" }).getByRole("button", { name: "Mehr Details" });
  await link.waitFor({ timeout: 5000 });
  await link.click();
  await page.waitForTimeout(500);
}

/** Einkauf „Aussuchen“ öffnen (optional einen Laden wählen) */
export async function aussuchen(page, laden) {
  await page.goto(BASE + "/einkaufsliste/aussuchen");
  await page.locator("[data-aussuchen-oben]").waitFor({ timeout: 8000 });
  if (laden) await page.locator(`[data-aussuchen-laden="${laden}"]`).tap();
  await page.waitForTimeout(300);
}

/** In „Aussuchen“ suchen und die erste passende Kachel antippen (Suche wieder leeren) */
export async function aussuchenTippen(page, name) {
  const feld = page.locator("[data-aussuchen-oben] input");
  await feld.fill(name);
  await page.locator(`[data-treffer] [data-kachel="${name}"]`).first().tap();
  await page.waitForTimeout(250);
  await feld.fill("");
}

/**
 * Echtes Ziehen per Touch (CDP – iOS bricht Pointer-Events beim Scrollen ab):
 * Finger auf `von`, `halten` ms ruhig, dann in Schritten zu `nach`, loslassen.
 */
export async function ziehen(page, von, nach, { halten = 450, steps = 14, ms = 420 } = {}) {
  const a = await von.boundingBox();
  const b = await nach.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const p = (x, y) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  const x0 = a.x + a.width / 2;
  const y0 = a.y + a.height / 2;
  const x1 = b.x + b.width / 2;
  const y1 = b.y + b.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: p(x0, y0) });
  await page.waitForTimeout(halten);
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: p(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps) });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

/** Schnelleingabe: Satz tippen, ➤ (Return; mehrzeilig bei Notiz/Pinnwand nur ➤), Fenster zu */
export async function schnell(page, text, { close = true } = {}) {
  const sheet = page.getByRole("dialog", { name: "Schnelleingabe" });
  await sheet.waitFor({ timeout: 5000 });
  const box = sheet.getByRole("textbox");
  await box.fill(text);
  if (await box.evaluate((el) => el.tagName === "TEXTAREA")) await sheet.getByRole("button", { name: "Speichern" }).click();
  else await box.press("Enter");
  await page.waitForTimeout(300);
  if (close) {
    await sheet.getByRole("button", { name: "Schließen" }).last().click();
    await page.waitForTimeout(400);
  }
  return sheet;
}

/** Pinnwand (Kühlschranktür, Tafel 106): ＋ → „Neuer Zettel“ → Text auf den Zettel → „Aufhängen“ */
export async function pinnwandSchreiben(page, text) {
  await page.getByRole("button", { name: /^(Neuer Zettel|Erster Zettel)$/ }).filter({ visible: true }).first().click();
  const sheet = page.getByRole("dialog", { name: "Neuer Zettel" });
  await sheet.waitFor({ timeout: 5000 });
  await sheet.getByRole("textbox", { name: "Text auf dem Zettel" }).fill(text);
  await sheet.getByRole("button", { name: "Aufhängen" }).click();
  await sheet.waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/** Pinnwand-Sprachnachricht vorbereiten: leere Kachel = Mikro direkt, sonst „Neuer Zettel“ → „Sprachnachricht“; liefert Mikro und Bereich */
export async function pinnwandMikro(page) {
  const tile = page.getByRole("region", { name: "Pinnwand" });
  const direct = tile.getByRole("button", { name: "Sprachnachricht aufnehmen" });
  if (await direct.count()) return { mic: direct, scope: tile };
  await tile.getByRole("button", { name: "Neuer Zettel" }).click();
  const sheet = page.getByRole("dialog", { name: "Neuer Zettel" });
  await sheet.waitFor({ timeout: 5000 });
  await sheet.getByRole("radio", { name: "Sprachnachricht" }).click();
  return { mic: sheet.getByRole("button", { name: "Aufnahme starten" }), scope: sheet };
}
