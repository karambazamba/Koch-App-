// Startseite im festen Raster XS · S · M (Tafel 118–120, A-023): jede Kachel
// in jeder erlaubten Größe mit fester Höhe auf SE, 15 Pro und Pixel 7 (S
// quadratisch aus der Breite, XS halb so hoch, M so hoch wie S, nichts quillt
// über); zwei S und XS-Paare bündig; Größenwechsel lässt die Nachbarn
// nachrücken; Bearbeiten = Fertig-Ansicht (auch die Pinnwand-S nach „Fertig“);
// Standard je Haushalt mit Beispiel-Tag; Timer-XS nur bei laufendem Timer;
// Wetter-Szenen; auf dem iPhone 15 Pro ohne Scrollen bis Essen/Einkauf.
import { BASE, hello, newPage, seedFamily } from "../lib.mjs";

const KEY = "wasgibts.startseite";
/** Erlaubte Größen je Kachel (wie `HOME_TILES`) */
const SIZES = { wetter: ["XS", "S", "M"], timer: ["XS", "S"], notizen: ["XS", "S", "M"], vorrat: ["XS", "S"], sport: ["XS", "S"], pinnwand: ["S", "M"], essen: ["S", "M"], einkauf: ["S", "M"], termine: ["S", "M"], aufgaben: ["S", "M"] };
const FEATURES = { version: 6, on: ["notizen", "vorrat", "pinnwand", "sport", "rezepte"], launch: true, imHaus: true };

/** Anordnung speichern (nur diese Kacheln sichtbar, in dieser Reihenfolge) und neu laden */
async function layout(page, tiles) {
  await page.evaluate(
    ({ KEY, tiles, FEATURES }) => {
      localStorage.setItem(KEY, JSON.stringify({ version: 9, tiles: tiles.map(([id, size]) => ({ id, visible: true, size })), tipSeen: true }));
      localStorage.setItem("wasgibts.funktionen", JSON.stringify(FEATURES));
    },
    { KEY, tiles, FEATURES },
  );
  await page.reload();
  await page.locator("[data-raster]").waitFor({ timeout: 6000 });
  await page.waitForTimeout(700);
}

/** Flächen aller Einheiten relativ zum Raster (+ ob der Inhalt in die Fläche passt) */
const boxes = (page) =>
  page.evaluate(() => {
    const board = document.querySelector("[data-raster]").getBoundingClientRect();
    // Wasserzeichen (A-036) sind absichtlich angeschnitten – sie zählen nicht als Inhalt, der überquillt
    const marks = [...document.querySelectorAll(".kachel-wasserzeichen")];
    for (const m of marks) m.style.display = "none";
    const out = {
      width: board.width,
      units: [...document.querySelectorAll("[data-raster] > [data-unit]")].map((el) => {
        const r = el.getBoundingClientRect();
        const inner = [...el.querySelectorAll("section, a.wx-himmel")].filter((s) => !s.closest("[role=dialog]"));
        return {
          key: el.dataset.unit,
          size: el.dataset.groesse,
          x: Math.round(r.left - board.left),
          y: Math.round(r.top - board.top),
          w: Math.round(r.width),
          h: Math.round(r.height),
          over: inner.filter((s) => s.scrollHeight > s.clientHeight + 2).map((s) => s.getAttribute("aria-label") || s.tagName),
        };
      }),
    };
    for (const m of marks) m.style.display = "";
    return out;
  });

const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

/** Erwartete Maße aus der Breite: S = (Breite − 8) / 2 (mindestens 168 hoch, `ZEILE_MIN`), XS halb so hoch (minus Abstand), M = volle Breite × S */
const expected = (width, size) => {
  const s = (width - 8) / 2;
  const h = Math.max(168, s);
  return size === "XS" ? { w: s, h: (h - 8) / 2 } : size === "S" ? { w: s, h } : { w: width, h };
};

/** Jede Kachel in jeder erlaubten Größe: feste Höhe, nichts quillt über – auf SE, 15 Pro und Pixel 7 */
export const rasterHoehen = async (page, check, device) => {
  await hello(page);
  await seedFamily(page);
  const sizes = [null, { width: 375, height: 667 }];
  for (const vp of sizes) {
    if (vp) await page.setViewportSize(vp);
    const where = vp ? "iPhone SE" : device;
    for (const size of ["XS", "S", "M"]) {
      const ids = Object.keys(SIZES).filter((id) => SIZES[id].includes(size) && (size === "M" || !["essen", "einkauf"].includes(id)));
      // Essen + Einkauf als Paar am Ende (in S eine Einheit)
      const tiles = [...ids.map((id) => [id, size]), ...(SIZES.essen.includes(size) ? [["essen", size], ["einkauf", size]] : [])].filter((t, i, a) => a.findIndex((x) => x[0] === t[0]) === i);
      await layout(page, tiles);
      const { width, units } = await boxes(page);
      const bad = [];
      for (const u of units) {
        const want = u.key === "essen+einkauf" ? expected(width, "M") : expected(width, u.size);
        if (!near(u.w, want.w) || !near(u.h, want.h)) bad.push(`${u.key} ${u.w}×${u.h} statt ${Math.round(want.w)}×${Math.round(want.h)}`);
        if (u.over.length) bad.push(`${u.key} quillt über (${u.over.join(", ")})`);
      }
      check(!bad.length && units.length >= 2, `${where} · ${size}: ${units.length} Kacheln mit fester Höhe, nichts gestaucht${bad.length ? ` – ${bad.join(" · ")}` : ""}`);
    }
  }
};

/** Zwei S und XS-Paare schließen bündig ab; Größenwechsel lässt die Nachbarn nachrücken */
export const rasterBuendig = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.locator("[data-raster]").waitFor();
  await page.waitForTimeout(700);
  const { units } = await boxes(page);
  const u = Object.fromEntries(units.map((x) => [x.key, x]));
  check(u.pinnwand && u.wetter && u.notizen && near(u.pinnwand.y, u.wetter.y) && near(u.pinnwand.y + u.pinnwand.h, u.notizen.y + u.notizen.h), "Pinnwand S | Wetter XS über Notizen XS: oben und unten bündig");
  check(near(u.wetter.h, u.notizen.h) && near(u.wetter.x, u.notizen.x), "XS-Paar übereinander gleich groß");
  check(near(u.termine.w, u.aufgaben.w) && near(u.termine.h, u.pinnwand.h), "Termine und Aufgaben (M) so hoch wie die Pinnwand (S)");
  // zwei S nebeneinander
  await layout(page, [["pinnwand", "S"], ["notizen", "S"], ["termine", "M"]]);
  const two = Object.fromEntries((await boxes(page)).units.map((x) => [x.key, x]));
  check(near(two.pinnwand.y, two.notizen.y) && near(two.pinnwand.h, two.notizen.h), "zwei S nebeneinander bündig (Pinnwand S neben Notizen S)");
  // Größenwechsel im Bearbeiten: Wetter M → die Notizen rücken neben die Pinnwand
  await layout(page, [["pinnwand", "S"], ["wetter", "XS"], ["notizen", "XS"], ["termine", "M"]]);
  await page.getByRole("button", { name: "Startseite bearbeiten" }).last().click();
  await page.getByRole("button", { name: "Verstanden" }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  // Im Bearbeiten wackeln die Kacheln (nie „stabil“) – tippen wie ein Finger auf die Mitte
  const b = await page.getByRole("radio", { name: "Wetter mittel" }).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(600);
  const moved = Object.fromEntries((await boxes(page)).units.map((x) => [x.key, x]));
  check(near(moved.notizen.y, moved.pinnwand.y) && moved.wetter.y > moved.pinnwand.y && near(moved.wetter.w, moved.termine.w), "Wetter auf M: Notizen rücken nach, Wetter so breit wie Termine");
  check(near(moved.wetter.h, moved.pinnwand.h), "Wetter auf M so hoch wie eine S");
};

/** Bearbeiten = Fertig-Ansicht; nach „Fertig“ ist die Pinnwand-S kein Streifen (Video 28.10.) */
export const bearbeitenWieFertig = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.locator("[data-raster]").waitFor();
  await page.waitForTimeout(700);
  const before = (await boxes(page)).units;
  await page.getByRole("button", { name: "Startseite bearbeiten" }).last().click();
  await page.getByRole("button", { name: "Verstanden" }).click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(600);
  const during = (await boxes(page)).units;
  const diff = (a, b) => a.filter((x) => { const y = b.find((z) => z.key === x.key); return !y || !near(x.x, y.x) || !near(x.y, y.y) || !near(x.w, y.w) || !near(x.h, y.h); }).map((x) => x.key);
  check(!diff(before, during).length, `Bearbeiten: dieselben Flächen wie fertig${diff(before, during).length ? ` (anders: ${diff(before, during).join(", ")})` : ""}`);
  check((await page.locator('[data-unit="pinnwand"] [data-kachel-knoepfe]').count()) === 1, "Größen-Umschalter liegt IN der Kachel");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(800);
  const after = (await boxes(page)).units;
  check(!diff(before, after).length, `nach „Fertig“ exakt dieselbe Ansicht${diff(before, after).length ? ` (anders: ${diff(before, after).join(", ")})` : ""}`);
  const pin = after.find((x) => x.key === "pinnwand");
  check(pin && near(pin.w, pin.h), `Pinnwand-S nach „Fertig“ quadratisch, kein Streifen (${pin ? `${pin.w}×${pin.h}` : "fehlt"})`);
  // Ziehen: Platzhalter rastet im Raster ein
  await page.getByRole("button", { name: "Startseite bearbeiten" }).last().click();
  await page.waitForTimeout(500);
  const t = await page.locator('[data-unit="termine"]').boundingBox();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(t.x + t.width / 2, t.y - 120, { steps: 8 });
  await page.waitForTimeout(300);
  const ph = await page.locator("[data-platzhalter]").boundingBox();
  check(Boolean(ph) && near(ph.width, t.width, 3) && near(ph.height, t.height, 3), "Ziehen: gestrichelter Platzhalter in Kachel-Größe im Raster");
  await page.mouse.up();
  await page.waitForTimeout(400);
};

/** Standard je Haushalt + Beispiel-Tag (Tafel 119), auf dem iPhone 15 Pro ohne Scrollen bis Essen/Einkauf */
export const standardJeHaushalt = async (page, check, device) => {
  const browser = page.context().browser();
  const want = {
    "Für die Familie": [["pinnwand", 0, 0], ["wetter", 1, 0], ["notizen", 1, 1]],
    "Für uns zwei": [["pinnwand", 0, 0], ["wetter", 1, 0], ["notizen", 1, 1]],
    "Nur für mich": [["wetter", 0, 0], ["sport", 0, 1], ["notizen", 1, 0], ["vorrat", 1, 1]],
  };
  const jetzt = { "Für die Familie": "Laternelaufen", "Für uns zwei": "Kino heute um 20:15", "Nur für mich": "18 Uhr Yoga" };
  for (const [wahl, cells] of Object.entries(want)) {
    const p = await newPage(browser, device);
    try {
      if (device === "iPhone 15 Pro") await p.setViewportSize({ width: 393, height: 852 });
      await p.goto(BASE);
      await p.getByRole("button", { name: "Los geht’s" }).click();
      await p.getByRole("button", { name: wahl }).click();
      await p.getByRole("tab", { name: "Heute", selected: true }).waitFor();
      await p.locator("[data-raster]").waitFor();
      await p.waitForTimeout(1200);
      const { width, units } = await boxes(p);
      const row = (expected(width, "XS").h + 8);
      const col = (expected(width, "S").w + 8);
      const ok = cells.every(([id, c, r]) => { const u = units.find((x) => x.key === id); return u && near(u.x, c * col, 2) && near(u.y, r * row, 2); });
      check(ok, `${wahl}: Kacheln wie Tafel 119 (${units.map((u) => u.key).join(", ")})`);
      check(units.map((u) => u.key).slice(-3).join() === "termine,aufgaben,essen+einkauf", `${wahl}: dann Termine M, Aufgaben M, Essen | Einkauf`);
      check(wahl === "Nur für mich" ? !units.some((u) => u.key === "pinnwand") : units.some((u) => u.key === "pinnwand"), `${wahl}: Pinnwand ${wahl === "Nur für mich" ? "aus" : "an"}`);
      check(await p.locator("[data-jetzt]").getByText(jetzt[wahl]).first().isVisible().catch(() => false), `${wahl}: Jetzt-Karte „${jetzt[wahl]}“`);
      // Familie/zu zweit: Schild „Beispiel“ unten rechts an der Pinnwand; allein (Tafel 119 ohne Pinnwand) kein Schild, die Beispiel-Kacheln sagen es VoiceOver
      check(wahl === "Nur für mich" ? (await p.getByRole("region", { name: /· Beispiel$/ }).count()) >= 3 && !(await p.getByText("Beispiel", { exact: true }).count()) : (await p.getByText("Beispiel", { exact: true }).count()) > 0, `${wahl}: leise „Beispiel“`);
      if (device === "iPhone 15 Pro") {
        // Ohne Scrollen: alles bis Aufgaben ganz, Essen + Einkauf mindestens mit Kopf über der Leiste
        const seen = await p.evaluate(() => {
          const leiste = document.querySelector("[data-leiste]")?.getBoundingClientRect().top ?? innerHeight;
          const box = (id) => document.querySelector(`[data-unit="${id}"]`)?.getBoundingClientRect();
          const whole = ["pinnwand", "wetter", "notizen", "sport", "vorrat", "termine", "aufgaben"].filter((id) => box(id) && box(id).bottom > innerHeight);
          const pair = box("essen+einkauf");
          return { whole, pair: Boolean(pair && pair.top < innerHeight), unter: pair ? Math.round(pair.top - leiste) : null };
        });
        check(!seen.whole.length && seen.pair, `${wahl}: iPhone 15 Pro ohne Scrollen bis Essen/Einkauf${seen.whole.length ? ` (unten: ${seen.whole.join(", ")})` : ""}`);
      }
      // Speicher: Beispiele nie in echten Speichern
      const echt = await p.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.eintraege") ?? "null")?.entries?.length ?? 0);
      check(echt === 0, `${wahl}: keine Beispiele in den echten Einträgen`);
    } finally {
      await p.context().close();
    }
  }
};

/** Timer ohne festen Platz: läuft einer, steht er als XS ganz oben – danach wieder weg */
export const timerXS = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.locator("[data-raster]").waitFor();
  await page.waitForTimeout(600);
  check(!(await page.locator('[data-unit="timer"]').count()), "ohne laufenden Timer keine Timer-Kachel");
  await page.evaluate(() => {
    const t = Date.now();
    localStorage.setItem("wasgibts.timer", JSON.stringify({ version: 1, timers: [{ id: "n1", name: "Nudeln", emoji: "🍝", durationMs: 600000, endsAt: t + 462000, pausedLeft: null, startedAt: t - 138000, acked: false }], stopwatch: null, hintSeen: true, firstAt: t - 138000, lastEnd: t + 462000 }));
  });
  await page.reload();
  await page.locator('[data-unit="timer"]').waitFor({ timeout: 5000 }).catch(() => {});
  const { width, units } = await boxes(page);
  const timer = units.find((u) => u.key === "timer");
  check(Boolean(timer) && timer.size === "XS" && timer.y === 0 && timer.x === 0 && near(timer.h, expected(width, "XS").h), "laufender Timer: XS ganz oben links");
  check(await page.locator('[data-unit="timer"]').getByText(/Nudeln/).isVisible(), "Timer-XS: „Nudeln · 7:42“");
  const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).tiles.find((t) => t.id === "timer")?.visible, KEY);
  check(saved === false, "die gespeicherte Anordnung bleibt unverändert");
  await page.evaluate(() => localStorage.removeItem("wasgibts.timer"));
  await page.reload();
  await page.waitForTimeout(800);
  check(!(await page.locator('[data-unit="timer"]').count()), "Timer vorbei: Kachel wieder weg");
};

/** Wetter mit Himmel: jede Lage × XS/S/M – Szene da, Text links nie unter der Zeichnung, nichts abgeschnitten */
export const wetterSzenen = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  for (const sz of ["regen", "klar", "wolkig", "sturm", "schnee", "gewitter"]) {
    await page.evaluate((s) => {
      sessionStorage.setItem("wasgibts.wetterszenario", s);
      localStorage.removeItem("wasgibts.wetterdaten");
    }, sz);
    for (const size of ["XS", "S", "M"]) {
      await layout(page, [["wetter", size], ["termine", "M"]]);
      await page.locator('[data-unit="wetter"] [data-szene]').first().waitFor({ timeout: 6000 }).catch(() => {});
      const r = await page.evaluate(() => {
        const tile = document.querySelector('[data-unit="wetter"] a.wx-himmel');
        const svg = tile?.querySelector("svg.wx-szene")?.getBoundingClientRect();
        const t = tile?.getBoundingClientRect();
        const texts = [...(tile?.querySelectorAll("[data-wetter-zeile], .tabular-nums") ?? [])].filter((el) => !el.closest("[data-stunden]"));
        // Text nie unter der Zeichnung (sichtbarer Teil der Szene in der Kachel, kleine Ränder der SVG-Box ausgenommen)
        const under = svg && t ? texts.filter((el) => { const b = el.getBoundingClientRect(); const x0 = Math.max(svg.left + svg.width * 0.15, t.left); const y1 = Math.min(svg.bottom - svg.height * 0.1, t.bottom); return b.right > x0 && b.top < y1 && b.bottom > Math.max(svg.top, t.top); }).map((el) => el.textContent) : ["keine Szene"];
        const cut = texts.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent);
        return { szene: tile?.dataset.szene, under, cut, satz: tile?.querySelector("[data-wetter-zeile]")?.textContent ?? "" };
      });
      check(Boolean(r.szene) && !r.under.length && !r.cut.length && r.satz.length <= 22, `Wetter ${sz} · ${size}: Szene „${r.szene}“, Satz „${r.satz}“${r.under.length ? ` – unter der Zeichnung: ${r.under.join(", ")}` : ""}${r.cut.length ? ` – abgeschnitten: ${r.cut.join(", ")}` : ""}`);
    }
  }
};
