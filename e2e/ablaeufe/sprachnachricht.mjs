// Pinnwand-Sprachnachricht (Vorrang-Auftrag): 5× hintereinander aufnehmen und
// senden, abwechselnd mit Mias Zuhören, hängendes Mikrofon nach 4 s, und in
// den Kacheln überlappen sich Tippflächen nie.
import { devices } from "playwright";
import { hello, launch, seedFamily, swipe } from "../lib.mjs";

const memoCount = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.memos?.length ?? 0);
const tap = (page, x, y) => swipe(page, { x, y, dx: 0, dy: 0, ms: 60, steps: 1 });

/**
 * Wie iPhone-Safari: solange die Spracherkennung zuhört, liefert getUserMedia
 * nichts (hängt). `window.__micHang` = getUserMedia hängt immer.
 */
const IOS_LIKE_MIC = () => {
  window.__recActive = false;
  class FakeRecognition {
    start() {
      window.__recActive = true;
    }
    stop() {
      window.__recActive = false;
      setTimeout(() => this.onend?.(), 20);
    }
    abort() {
      window.__recActive = false;
    }
  }
  window.webkitSpeechRecognition = FakeRecognition;
  window.SpeechRecognition = FakeRecognition;
  const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = (c) => (window.__micHang || window.__recActive ? new Promise(() => undefined) : real(c));
};

/** Seite mit Schein-Mikrofon (echte Zeit, die Aufnahme braucht sie) */
async function micPage(device) {
  const browser = await launch(["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]);
  const ctx = await browser.newContext({ ...devices[device], timezoneId: "Europe/Berlin", locale: "de-DE", permissions: ["microphone"] });
  await ctx.addInitScript(IOS_LIKE_MIC);
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  return { page, browser };
}

/** Auf der Startseite in der Pinnwand-Kachel aufnehmen und senden; liefert die gezeigte Zeit */
async function recordOnce(page) {
  const tile = page.getByRole("region", { name: "Pinnwand" });
  const before = await memoCount(page);
  const mic = tile.getByRole("button", { name: "Aufnahme starten" });
  await mic.waitFor({ timeout: 6000 }).catch(async (e) => {
    await page.screenshot({ path: `.bilder/abbruch/sprachnachricht-mikro-${Date.now()}.png` }).catch(() => {});
    throw e;
  });
  const box = await mic.boundingBox();
  await tap(page, box.x + box.width / 2, box.y + box.height / 2);
  const send = page.getByRole("button", { name: "Senden" }).last();
  await send.waitFor({ timeout: 6000 }).catch(async (e) => {
    await page.screenshot({ path: `.bilder/abbruch/sprachnachricht-${Date.now()}.png` }).catch(() => {});
    throw e;
  });
  await page.waitForTimeout(1600);
  const time = (await tile.innerText()).match(/\d+:\d\d/)?.[0] ?? "0:00";
  await send.click();
  // Speichern (IndexedDB) braucht einen Moment
  for (let i = 0; i < 30 && (await memoCount(page)) === before; i++) await page.waitForTimeout(100);
  return time;
}

export const sprachnachricht5 = async (_page, check, device) => {
  const { page, browser } = await micPage(device);
  try {
    await hello(page);
    await seedFamily(page);
    await page.reload();
    await page.waitForTimeout(1000);
    for (let i = 1; i <= 5; i++) {
      const time = await recordOnce(page);
      check(time !== "0:00" && (await memoCount(page)) === i, `${i}. Sprachnachricht: Zeit ${time}, gesendet`);
    }
    // Abwechselnd: Mia hört zu → zu → Pinnwand-Aufnahme (dreimal)
    for (let i = 1; i <= 3; i++) {
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click({ force: true });
      await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
      await page.waitForTimeout(500);
      check(await page.evaluate(() => window.__recActive), `${i}. Mal Mia: hört zu`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(600);
      const time = await recordOnce(page);
      check(time !== "0:00" && (await memoCount(page)) === 5 + i, `${i}. Mal danach Pinnwand: Zeit ${time}, gesendet`);
    }
  } finally {
    await browser.close();
  }
};

export const mikroHaengt = async (_page, check, device) => {
  const { page, browser } = await micPage(device);
  try {
    await hello(page);
    await seedFamily(page);
    await page.reload();
    await page.waitForTimeout(1000);
    await page.evaluate(() => (window.__micHang = true));
    const tile = page.getByRole("region", { name: "Pinnwand" });
    const box = await tile.getByRole("button", { name: "Aufnahme starten" }).boundingBox();
    await tap(page, box.x + box.width / 2, box.y + box.height / 2);
    // erst ein stiller zweiter Versuch (4 s), dann der Satz
    await page.waitForTimeout(4800);
    check(!(await page.getByText("Das Mikrofon hängt gerade – nochmal antippen?").count()), "nach 4 s: still ein zweiter Versuch");
    await page.waitForTimeout(4200);
    check(await page.getByText("Das Mikrofon hängt gerade – nochmal antippen?").isVisible(), "nach 8 s: „Das Mikrofon hängt gerade …“");
    check(await tile.getByRole("button", { name: "Aufnahme starten" }).isVisible(), "danach wieder bereit");
    // Mikro wieder da → klappt sofort
    await page.evaluate(() => (window.__micHang = false));
    const time = await recordOnce(page);
    check(time !== "0:00" && (await memoCount(page)) === 1, `danach aufnehmen: Zeit ${time}, gesendet`);
  } finally {
    await browser.close();
  }
};

/** Beim Ablegen in IndexedDB wirft put() (wie Safari bei Blobs) */
const PUT_FAILS = () => {
  IDBObjectStore.prototype.put = function () {
    throw Object.assign(new Error("DataCloneError"), { name: "DataCloneError" });
  };
};

/** Pinnwand-Seite ohne Neuladen öffnen (der Ton im Arbeitsspeicher bleibt) und abspielen */
async function playOnBoard(page) {
  await page.getByRole("link", { name: "Pinnwand öffnen", exact: true }).click();
  // Erst die Pinnwand abwarten und nur sichtbare Knöpfe nehmen: die Startseite (mit dem
  // Knopf in der Pinnwand-Kachel) bleibt beim Seitenwechsel versteckt im Hintergrund
  await page.waitForURL(/\/pinnwand/);
  const play = page.getByRole("button", { name: /^Abspielen: Sprachnachricht/ }).filter({ visible: true }).first();
  await play.waitFor({ timeout: 5000 });
  await play.click();
  return page.getByRole("button", { name: /^Anhalten: Sprachnachricht/ }).filter({ visible: true }).first().waitFor({ timeout: 4000 }).then(() => true, () => false);
}

/**
 * Felix (v0.67.0, iPhone): erst der 2. Tipp nahm auf, Senden scheiterte und
 * die Nachricht war weg. Jetzt: erster Tipp nimmt auf – im Beispiel-Tag und
 * ohne Konto –, Senden legt die Nachricht immer ab (auch wenn IndexedDB
 * scheitert), abspielbar; das Mikro-Protokoll zeigt, was passiert ist.
 */
export const sprachnachrichtErsterTipp = async (_page, check, device) => {
  const { page, browser } = await micPage(device);
  try {
    await hello(page);
    const time = await recordOnce(page);
    check(time !== "0:00" && (await memoCount(page)) === 1, `Beispiel-Tag, erster Tipp: Zeit ${time}, gesendet`);
    check(await playOnBoard(page), "in der Pinnwand abspielbar");
    await page.goto(page.url().replace(/\/pinnwand.*/, "/profil/daten"));
    const version = page.getByTestId("app-version");
    await version.waitFor({ timeout: 5000 });
    for (let i = 0; i < 5; i++) await version.click();
    const log = page.getByRole("listitem", { name: "Mikro-Protokoll" });
    check(await log.isVisible(), "5× Version: Mikro-Protokoll");
    const text = await log.innerText();
    check(/getUserMedia ok/.test(text) && /Recorder läuft/.test(text) && /Speichern ok/.test(text), "Protokoll: getUserMedia ok, Recorder, Speichern ok");
  } finally {
    await browser.close();
  }
  // IndexedDB lehnt ab → Nachricht trotzdem da, abspielbar, leiser Hinweis
  const second = await micPage(device);
  try {
    const p = second.page;
    await p.context().addInitScript(PUT_FAILS);
    await hello(p);
    await seedFamily(p);
    await p.reload();
    await p.waitForTimeout(1000);
    const time = await recordOnce(p);
    check(time !== "0:00" && (await memoCount(p)) === 1, `IndexedDB scheitert: trotzdem gesendet (${time})`);
    check(await p.getByText(/Diese Sprachnachricht bleibt nur, bis du .* schließt\./).isVisible(), "leiser Hinweis: bleibt bis zum Schließen");
    check(await playOnBoard(p), "trotzdem abspielbar");
    check(!(await p.getByText("ließ sich gerade nicht speichern").count()), "kein „ließ sich nicht speichern“");
  } finally {
    await second.browser.close();
  }
};

/** In jeder Kachel: Tippflächen überlappen sich nie, kleine Knöpfe nebeneinander mit mind. 8 px Abstand */
export const kachelKnoepfe = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(1200);
  const problems = await page.evaluate(() => {
    const out = [];
    // Kacheln (die Jetzt-Karte ist keine Kachel: ihre Punkte sind nur Anzeige fürs Wischen)
    // nur die Startseite (Kalender und Essen liegen beim Wischen links/rechts daneben)
    const onScreen = (t) => {
      const r = t.getBoundingClientRect();
      const hidden = t.closest("[inert], [aria-hidden=true]") || !t.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      return !hidden && r.left >= 0 && r.right <= innerWidth;
    };
    for (const tile of [...document.querySelectorAll("main section[aria-label]")].filter((t) => onScreen(t) && !t.getAttribute("aria-label").startsWith("Mia: Jetzt"))) {
      const area = tile.getBoundingClientRect();
      // Der große Kachel-Link („jede Kachel öffnet ihre Seite“) liegt bewusst unter dem Plus
      const tileLink = (el) => {
        const r = el.getBoundingClientRect();
        return r.width * r.height > 0.25 * area.width * area.height;
      };
      const rects = [...tile.querySelectorAll("button, a[href]")]
        .filter((el) => el.offsetParent !== null && el.getAttribute("aria-hidden") !== "true" && !tileLink(el) && !el.closest("[role=grid]"))
        .map((el) => ({ name: el.getAttribute("aria-label") || el.textContent.trim().slice(0, 20), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0);
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i].r;
          const b = rects[j].r;
          // enthält einer den anderen (z. B. Zeile mit Knopf darin), zählt es nicht
          const inside = (x, y) => x.left <= y.left && x.right >= y.right && x.top <= y.top && x.bottom >= y.bottom;
          if (inside(a, b) || inside(b, a)) continue;
          const gapX = Math.max(b.left - a.right, a.left - b.right);
          const gapY = Math.max(b.top - a.bottom, a.top - b.bottom);
          // nie überlappen; zwei kleine Knöpfe nebeneinander (Plus, Mikro …) mit mind. 8 px Abstand
          const gap = Math.max(gapX, gapY);
          if (gap < 0 || (gap < 8 && Math.max(a.width, b.width) <= 48))
            out.push(`${tile.getAttribute("aria-label")}: „${rects[i].name}“ ↔ „${rects[j].name}“ (${Math.round(Math.max(gapX, gapY))} px)`);
        }
    }
    return out;
  });
  check(problems.length === 0, `Kachel-Knöpfe mit Abstand ${problems.slice(0, 4).join(" | ")}`);
};

/**
 * Aufnahme-Leiste in der Kachel (Tafel 80): EINE Pille unter dem Kopf, ➤
 * rechts ganz sichtbar (nicht abgeschnitten, nicht über dem Mikro), ＋ und
 * Mikro während der Aufnahme weg, unten „Sprachnachricht“ statt des alten
 * Hinweises; ➤ → Nachricht oben in der Kachel, kurz „✓ Gesendet“. Auf dem
 * jeweiligen Gerät und zusätzlich auf dem iPhone SE (kleinste Kachel).
 */
export const aufnahmeLeiste = async (_page, check, device) => {
  for (const d of [device, "iPhone SE"]) {
    const { page, browser } = await micPage(d);
    try {
      await hello(page);
      await seedFamily(page);
      await page.reload();
      await page.waitForTimeout(1000);
      const tile = page.getByRole("region", { name: "Pinnwand" });
      await tile.evaluate((el) => el.scrollIntoView({ block: "center" }));
      check(await tile.getByText("Sprachnachricht", { exact: true }).isVisible(), `${d}: unten „Sprachnachricht“`);
      check(!(await tile.getByText(/＋ = schreiben/).count()), `${d}: alter Hinweis weg`);
      const before = await memoCount(page);
      const mic = await tile.getByRole("button", { name: "Aufnahme starten" }).boundingBox();
      await tap(page, mic.x + mic.width / 2, mic.y + mic.height / 2);
      const send = tile.getByRole("button", { name: "Senden" });
      await send.waitFor({ timeout: 6000 });
      await page.waitForTimeout(1300);
      const t = await tile.boundingBox();
      const s = await send.boundingBox();
      const trash = await tile.getByRole("button", { name: "Verwerfen" }).boundingBox();
      check(s.x + s.width <= t.x + t.width - 4 && s.y + s.height <= t.y + t.height - 4 && s.width >= 36, `${d}: ➤ rechts ganz sichtbar (${Math.round(s.width)} px)`);
      check(Math.abs(s.y - trash.y) < 8 && trash.x < s.x, `${d}: eine Leiste – 🗑 links, ➤ rechts`);
      check(!(await tile.getByRole("button", { name: /^Nachricht an die Pinnwand/ }).count()) && !(await tile.getByRole("button", { name: "Aufnahme starten" }).count()), `${d}: ＋ und Mikro während der Aufnahme weg`);
      check(await tile.getByText("Aufnahme läuft – sprich einfach").isVisible(), `${d}: „Aufnahme läuft – sprich einfach“`);
      await send.click();
      for (let i = 0; i < 30 && (await memoCount(page)) === before; i++) await page.waitForTimeout(100);
      check((await memoCount(page)) === before + 1, `${d}: ➤ → gesendet`);
      check(await tile.getByText("Gesendet").isVisible(), `${d}: „✓ Gesendet“`);
      const first = tile.locator("[data-zeile]").first();
      check(/Sprachnachricht von/.test((await first.getAttribute("aria-label")) ?? ""), `${d}: neue Sprachnachricht oben`);
    } finally {
      await browser.close();
    }
  }
};
