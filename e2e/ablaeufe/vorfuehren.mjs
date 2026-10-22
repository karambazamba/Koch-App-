// Für das Vorführen: Bearbeiten beenden ganz leicht (Tafel 24) und
// Sprachnachricht antippen statt halten – mit echten Touch-Gesten (CDP).
import { readFileSync, writeFileSync } from "node:fs";
import { devices } from "playwright";
import { BASE, hello, launch, seedFamily, swipe } from "../lib.mjs";

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
  const bar = page
    .locator("[data-keep-edit]")
    .filter({ hasText: "Irgendwo tippen = fertig" });
  check(
    await bar.isVisible(),
    "Fertig-Leiste unten mit „Irgendwo tippen = fertig“",
  );
  check(
    !(await page.locator("[data-begleitung-leiste]").isVisible()) ||
      (await bar.boundingBox()).y >=
        (await page.locator("[data-begleitung-leiste]").boundingBox()).y - 1,
    "Fertig-Leiste liegt über der Mia-Leiste",
  );

  // Mitte der Seite: Tipp auf eine Kachel beendet
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);
  const tile = await page.locator("[data-unit]").nth(2).boundingBox();
  await tap(page, tile.x + tile.width / 2, Math.max(tile.y + 20, 140));
  await page.waitForTimeout(500);
  check(!(await editing(page)), "kurzer Tipp auf eine Kachel = fertig");
  check(await page.getByText("✓ Gespeichert").isVisible(), "„✓ Gespeichert“");

  // Fertig unten
  await page.evaluate(() => window.scrollTo(0, 0));
  await openEdit(page);
  await bar.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  check(!(await editing(page)), "Fertig unten = fertig");

  // S/M/L beendet nicht
  await openEdit(page);
  const size = page.getByRole("radio", { name: /mittel$/ }).first();
  const sb = await size.boundingBox();
  await tap(page, sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.waitForTimeout(400);
  check(await editing(page), "Tipp auf S/M/L beendet nicht");

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
    const mic = page.getByRole("button", { name: "Aufnahme starten" });

    // Antippen → 3 s → Senden
    const box = await mic.boundingBox();
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
    await tap(page, box.x + box.width / 2, box.y + box.height / 2);
    await page
      .getByRole("button", { name: "Verwerfen" })
      .waitFor({ timeout: 5000 });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Verwerfen" }).click();
    await page.waitForTimeout(600);
    check((await memoCount(page)) === 1, "antippen → verwerfen: kein Memo");

    // Halten → loslassen = senden
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
    await page
      .getByRole("textbox", { name: "Nachricht an alle" })
      .fill("Offline geschrieben");
    await page.getByRole("button", { name: "Anheften" }).click();
    await page.waitForTimeout(400);
    check(
      await page.getByText("Offline geschrieben").isVisible(),
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

/** Stammartikel-Chips lassen sich antippen (die vergrößerte Tippfläche lag darüber) */
export const stammartikel = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.goto(BASE + "/einkaufsliste");
  await page.waitForTimeout(1000);
  const items = () => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("wasgibts.einkaufsliste") ?? "{}").weeks ?? {}).flatMap((w) => w.manual.map((i) => i.name)));
  await page.getByRole("button", { name: "Brot übernehmen" }).tap();
  await page.waitForTimeout(600);
  check((await items()).includes("Brot"), "„+ Brot“ antippen setzt Brot auf die Liste");
  await page.getByRole("button", { name: "Käse diesmal nicht" }).tap();
  await page.waitForTimeout(600);
  check(!(await page.getByRole("button", { name: "Käse übernehmen" }).isVisible()), "„×“ beim Käse: diesmal nicht");
};
