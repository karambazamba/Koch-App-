// Für das Vorführen: Bearbeiten beenden ganz leicht (Tafel 24, Launch 1.0:
// Fertig oben oder Tipp auf freie Fläche, nie ein Tipp auf eine Kachel) und
// Sprachnachricht antippen statt halten – mit echten Touch-Gesten (CDP).
import { readFileSync, writeFileSync } from "node:fs";
import { devices } from "playwright";
import { BASE, hello, launch, seedFamily, swipe, pinnwandSchreiben } from "../lib.mjs";

const editing = (page) =>
  page.getByRole("button", { name: "Fertig" }).first().isVisible();
const memoCount = (page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wasgibts.pinnwand") ?? "null")?.memos
        ?.length ?? 0,
  );

/** Kurzer Finger-Tipp (Touch) */
const tap = (page, x, y) =>
  swipe(page, { x, y, dx: 0, dy: 0, ms: 60, steps: 1 });

async function openEdit(page) {
  const box = await page
    .getByRole("region", { name: "Pinnwand" })
    .boundingBox();
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const ok = page.getByRole("button", { name: "Verstanden" });
  if (await ok.isVisible().catch(() => false)) await ok.click();
  await page.waitForTimeout(300);
}

export const fertigTippen = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  await openEdit(page);
  check(await editing(page), "Bearbeiten offen");
  // Launch 1.0: genau ein „＋ Kachel“ und ein „Fertig“ (oben), keine Leiste unten
  const kopf = page.locator("[data-edit-leiste]");
  check((await page.getByRole("button", { name: "Fertig" }).count()) === 1 && (await page.getByRole("button", { name: "Kachel", exact: true }).count()) === 1, "ein „＋ Kachel“ und ein „Fertig“");
  // Leiste (mit Mia) blendet im Bearbeiten weich aus: unsichtbar und nicht antippbar
  check(await page.locator("[data-leiste]").evaluate((el) => getComputedStyle(el).opacity === "0" && getComputedStyle(el).pointerEvents === "none").catch(() => true), "Mia-Knopf ruht im Bearbeiten");

  // Tipp auf eine Kachel beendet NICHT
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
  const tile = await page.locator("[data-unit]").nth(2).boundingBox();
  await tap(page, tile.x + tile.width / 2, Math.max(tile.y + 20, 140));
  await page.waitForTimeout(500);
  check(await editing(page), "kurzer Tipp auf eine Kachel = bleibt im Bearbeiten");

  // Tipp auf freie Fläche (unter den Kacheln) = fertig
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const vp = page.viewportSize();
  const frei = await page.evaluate(() => {
    const b = document.querySelector("[data-no-swipe]")?.getBoundingClientRect();
    return b ? Math.min(window.innerHeight - 20, b.bottom + 30) : window.innerHeight - 60;
  });
  await tap(page, vp.width / 2, frei);
  await page.waitForTimeout(500);
  check(!(await editing(page)), "Tipp auf freie Fläche = fertig");
  check(await page.getByText("✓ Gespeichert").isVisible(), "„✓ Gespeichert“");

  // Fertig oben
  await page.evaluate(() => window.scrollTo(0, 0));
  await openEdit(page);
  await kopf.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  check(!(await editing(page)), "Fertig = fertig");

  // Aussehen (leiser Link unten im Board): Farbig | Schlicht wirkt sofort, Bearbeiten bleibt offen
  await openEdit(page);
  await page.getByRole("button", { name: "Aussehen" }).click();
  await page.waitForTimeout(500);
  const sheet = page.getByRole("dialog", { name: "Aussehen" });
  check(await sheet.isVisible(), "„Aussehen“ öffnet das Fenster");
  await sheet.getByRole("radio", { name: /^Schlicht/ }).click();
  await page.waitForTimeout(300);
  check((await page.evaluate(() => document.documentElement.dataset.look)) === "schlicht", "Schlicht wirkt sofort");
  await sheet.getByRole("radio", { name: /^Farbig/ }).click();
  await page.waitForTimeout(300);
  check((await page.evaluate(() => document.documentElement.dataset.look)) === "farbig", "… und zurück zu Farbig");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  check(await editing(page), "Fenster zu – Bearbeiten bleibt offen");
  await page.evaluate(() => window.scrollTo(0, 0));
  await kopf.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);

  // XS · S · M beendet nicht
  await openEdit(page);
  const size = page.getByRole("radio", { name: /mittel$/ }).first();
  const sb = await size.boundingBox();
  await tap(page, sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.waitForTimeout(400);
  check(await editing(page), "Tipp auf XS · S · M beendet nicht");

  // Festhalten hebt an, Loslassen beendet nicht
  const t2 = await page.locator("[data-unit]").nth(1).boundingBox();
  await swipe(page, {
    x: t2.x + t2.width / 2,
    y: t2.y + t2.height / 2,
    dx: 0,
    dy: 30,
    ms: 900,
    steps: 10,
  });
  await page.waitForTimeout(400);
  check(await editing(page), "Festhalten + ziehen beendet nicht");

  // Schwung und dann tippen: hält nur an
  const vh = page.viewportSize().height;
  await swipe(page, {
    x: 200,
    y: vh * 0.75,
    dx: 0,
    dy: -300,
    ms: 80,
    steps: 4,
  });
  await tap(page, 200, vh * 0.5);
  await page.waitForTimeout(400);
  check(await editing(page), "Tipp in den Schwung hält nur an");
};

/** Seite mit Schein-Mikrofon (ohne feste Uhr – die Aufnahme braucht echte Zeit) */
async function micPage(device) {
  const browser = await launch([
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
  ]);
  const ctx = await browser.newContext({
    ...devices[device],
    timezoneId: "Europe/Berlin",
    locale: "de-DE",
    permissions: ["microphone"],
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  return { page, browser };
}

export const memoAntippen = async (_page, check, device) => {
  const { page, browser } = await micPage(device);
  try {
    await hello(page);
    await seedFamily(page);
    await page.goto(BASE + "/pinnwand");
    await page.waitForTimeout(900);
    // Kühlschranktür (Tafel 106): Sprachnachricht über „Neuer Zettel“ → „Sprachnachricht“;
    // nach dem Senden schließt das Fenster, darum je Schritt neu öffnen
    const micBox = async () => {
      const sheet = page.getByRole("dialog", { name: "Neuer Zettel" });
      if (!(await sheet.count())) {
        await page.getByRole("button", { name: "Neuer Zettel" }).first().click();
        await sheet.waitFor({ timeout: 5000 });
        await sheet.getByRole("radio", { name: "Sprachnachricht" }).click();
      }
      return sheet.getByRole("button", { name: "Aufnahme starten" }).boundingBox();
    };

    // Antippen → 3 s → Senden
    let box = await micBox();
    await tap(page, box.x + box.width / 2, box.y + box.height / 2);
    await page
      .getByRole("button", { name: "Senden" })
      .last()
      .waitFor({ timeout: 5000 });
    check(
      await page.getByRole("button", { name: "Verwerfen" }).isVisible(),
      "Aufnahme-Leiste: Verwerfen, Zeit, Senden",
    );
    const send = await page
      .getByRole("button", { name: "Senden" })
      .last()
      .boundingBox();
    check(
      send.width >= 48 && send.height >= 48,
      `Senden-Knopf mind. 48 px (${Math.round(send.width)})`,
    );
    await page.waitForTimeout(3000);
    check(
      await page.evaluate(() =>
        document.documentElement.hasAttribute("data-no-swipe"),
      ),
      "während der Aufnahme: kein Wischen",
    );
    await page.getByRole("button", { name: "Senden" }).last().click();
    await page.waitForTimeout(800);
    check((await memoCount(page)) === 1, "antippen → senden: Memo da");

    // Antippen → Verwerfen
    box = await micBox();
    await tap(page, box.x + box.width / 2, box.y + box.height / 2);
    await page
      .getByRole("button", { name: "Verwerfen" })
      .waitFor({ timeout: 5000 });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Verwerfen" }).click();
    await page.waitForTimeout(600);
    check((await memoCount(page)) === 1, "antippen → verwerfen: kein Memo");

    // Halten → loslassen = senden
    box = await micBox();
    await swipe(page, {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      dx: 0,
      dy: 0,
      ms: 2000,
      steps: 10,
    });
    await page.waitForTimeout(900);
    check((await memoCount(page)) === 2, "halten → loslassen: gesendet");

    // Halten → hochschieben = frei sprechen
    box = await micBox();
    await swipe(page, {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      dx: 0,
      dy: -90,
      ms: 1500,
      steps: 10,
    });
    await page.waitForTimeout(500);
    check(
      await page.getByRole("button", { name: "Verwerfen" }).isVisible(),
      "halten → hochschieben: läuft frei weiter",
    );
    await page.waitForTimeout(800);

    // App verlassen → anhalten, Frage beim Zurückkommen
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
    });
    await page.waitForTimeout(600);
    check(
      await page
        .getByText("Memo fertig aufgenommen – Senden oder Verwerfen?")
        .isVisible(),
      "App verlassen → Frage beim Zurückkommen",
    );
    await page.getByRole("button", { name: "Senden" }).last().click();
    await page.waitForTimeout(800);
    check((await memoCount(page)) === 3, "danach senden geht");
    check(!page.errors.length, `keine Fehler ${page.errors.join(" | ")}`);
  } finally {
    await browser.close();
  }
};

/** Netz aus: App startet aus dem Speicher, Eintragen geht, nichts kaputt */
export const offline = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE);
  await page
    .waitForFunction(() => navigator.serviceWorker?.controller, null, {
      timeout: 15000,
    })
    .catch(() => {});
  // Precache fertig (alle Seiten liegen bereit)
  await page
    .waitForFunction(
      async () =>
        (await caches.keys()).length > 0 &&
        (await (await caches.open((await caches.keys())[0])).keys()).length >
          40,
      null,
      { timeout: 20000, polling: 500 },
    )
    .catch(() => {});
  await page.context().setOffline(true);
  try {
    await page.reload();
    await page
      .getByRole("tab", { name: "Heute", selected: true })
      .waitFor({ timeout: 8000 });
    check(true, "offline: Startseite startet");
    await page.goto(BASE + "/pinnwand");
    await pinnwandSchreiben(page, "Offline geschrieben");
    check(
      await page.getByText("Offline geschrieben", { exact: true }).first().isVisible(),
      "offline: Eintragen geht",
    );
    check(
      !page.errors.filter(
        (e) =>
          !/Failed to fetch|NetworkError|ERR_INTERNET_DISCONNECTED|net::/.test(
            e,
          ),
      ).length,
      `offline: keine echten Fehler ${page.errors.join(" | ")}`,
    );
    page.errors.length = 0;
  } finally {
    await page.context().setOffline(false);
  }
};

/** Neue Version: Hinweis erscheint und lädt sauber */
export const neueVersion = async (page, check) => {
  await hello(page);
  await page
    .waitForFunction(() => navigator.serviceWorker?.controller, null, {
      timeout: 15000,
    })
    .catch(() => {});
  // Wie eine neue Auslieferung: sw.js ändert sich (danach wieder wie vorher)
  const swFile = new URL("../../public/sw.js", import.meta.url);
  const original = readFileSync(swFile, "utf8");
  writeFileSync(swFile, original + "\n// neue Version für den Test\n");
  try {
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange")),
    );
    const hint = page.getByRole("button", { name: /Neue Version da/ });
    check(
      await hint.waitFor({ timeout: 20000 }).then(
        () => true,
        () => false,
      ),
      "„Neue Version da“ erscheint",
    );
    const nav = page.waitForEvent("framenavigated", { timeout: 15000 }).then(
      () => true,
      () => false,
    );
    await hint.click();
    check(await nav, "Antippen lädt neu");
    await page
      .getByRole("tab", { name: "Heute", selected: true })
      .waitFor({ timeout: 10000 });
    check(!(await hint.isVisible()), "danach kein Hinweis mehr");
  } finally {
    writeFileSync(swFile, original);
  }
};

/** Stammliste (seit „Einkauf neu“ im „···“ der Seite „Einkauf“): Standard-Stammartikel sichtbar */
export const stammartikel = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1000);
  check(!(await page.locator("[data-bald-faellig]").count()), "keine Extra-Zeile „Bald wieder fällig“ mehr");
  await page.getByRole("button", { name: "Mehr" }).tap();
  await page.getByRole("dialog", { name: "Einkauf" }).getByRole("button", { name: "Stammliste" }).tap();
  const sheet = page.getByRole("dialog", { name: "Stammliste" });
  check(await sheet.waitFor({ timeout: 3000 }).then(() => true, () => false), "„···“ → „Stammliste“");
  check(await sheet.getByText("Brot").first().isVisible(), "Stammliste mit Brot");
};
