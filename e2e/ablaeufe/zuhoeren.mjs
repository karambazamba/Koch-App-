// Mia hört zuverlässig zu (simulierte Erkennungs-Ereignisse): kurze Pause
// schickt nichts ab, nichts geht verloren (unfertiger Teil, neu begonnene
// Ergebnisliste), „Okay“ wird nie abgeschnitten, Weiterreden während Mia
// antwortet, lange Live-Blase bleibt über Mia sichtbar.
import { BASE, FAKE_HOEREN, FAKE_VOICES, hello, seedFamily } from "../lib.mjs";

const sag = (page, list, ab = 0) => page.evaluate(([l, a]) => window.__sag(l, a), [list, ab]);
/** Abgeschickte eigene Nachrichten (nicht die Live- oder „wartet“-Blase) */
const eigene = (page) => page.locator("[data-gespraech] .bg-accent.rounded-br-md").evaluateAll((els) => els.filter((e) => !e.closest("[data-eigene-blase]")).map((e) => e.textContent.trim()));

async function oeffnen(page) {
  // Die Bühne kann vom letzten Mal noch offen sein – dann Mia antippen statt den Knopf
  if (await page.locator("[data-buehne-mia]").count()) {
    if (!(await page.evaluate(() => window.__rec?.running))) await page.locator("[data-buehne-mia]").click({ force: true });
  } else {
    await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
    await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  }
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 5000 });
}

export const zuhoeren = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await page.addInitScript(FAKE_VOICES);
  await hello(page);
  // Mikro schon einmal gefragt; Vorlesen aus (Mikro bleibt an, während Mia antwortet)
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] }, "wasgibts.vorlesen": { version: 1, mode: "aus", voice: "", rate: "normal" } });
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await oeffnen(page);

  // 1. Pause mitten im Satz: der Browser beendet, Mia hört still weiter, nichts geht raus
  await sag(page, [["Was gibt es", true]]);
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__ende());
  await page.waitForTimeout(400);
  check((await eigene(page)).length === 0, "Pause 1 s: keine Nachricht");
  check((await page.evaluate(() => window.__starts)) === 2, "nach dem Browser-Ende still neu gestartet (1 Neustart)");
  await sag(page, [["morgen bei uns zum Essen", true]]);
  await page.waitForTimeout(1200);
  check((await eigene(page)).length === 0, "1,2 s nach dem letzten Wort: noch nicht abgeschickt");
  check((await page.locator("[data-pause-ring]").count()) === 1, "Ring läuft ab, Mia wartet");
  // Ring mittig um Mia (± 1 px), rundum 8 px Abstand
  const ring = await page.locator("[data-pause-ring]").boundingBox();
  const mia = await page.locator("[data-buehne-mia]").boundingBox();
  const mitte = (b) => [b.x + b.width / 2, b.y + b.height / 2];
  const [rx, ry] = mitte(ring);
  const [mx, my] = mitte(mia);
  check(Math.abs(rx - mx) <= 1 && Math.abs(ry - my) <= 1 && Math.abs(ring.width - mia.width - 16) <= 1, `Ring mittig um Mia (${Math.round(rx - mx)}/${Math.round(ry - my)} px)`);
  await page.waitForTimeout(2000);
  check((await eigene(page)).includes("Was gibt es morgen bei uns zum Essen"), "nach 2,5 s Stille: der ganze Satz, angehängt");

  // 2. Weiterreden, während Mia antwortet → „wartet“, danach abgeschickt
  await page.route("**/api/lotte", async (route) => {
    await new Promise((r) => setTimeout(r, 4500));
    await route.continue().catch(() => {});
  });
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 8000 }).catch(() => {});
  await sag(page, [["Was steht morgen an", true]]);
  await page.waitForTimeout(2800);
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 5000 }).catch(() => {});
  await sag(page, [["und übermorgen", true]]);
  await page.waitForTimeout(2800);
  check(await page.locator("[data-eigene-blase=wartet]").first().isVisible().catch(() => false), "während Mia antwortet: Blase „wartet“");
  await page.waitForFunction(() => [...document.querySelectorAll("[data-gespraech] .bg-accent.rounded-br-md")].some((e) => e.textContent.trim() === "und übermorgen" && !e.closest("[data-eigene-blase]")), null, { timeout: 15000 }).then(
    () => check(true, "nach Mias Antwort abgeschickt"),
    () => check(false, "nach Mias Antwort abgeschickt"),
  );
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // 3. Ende ohne fertigen Abschnitt: der letzte Teil kommt mit (Mia antippen = fertig)
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await oeffnen(page);
  await sag(page, [["Was koche ich", true], [" heute Abend", false]]);
  await page.locator("[data-buehne-mia]").click({ force: true });
  await page.waitForTimeout(600);
  check((await eigene(page)).includes("Was koche ich heute Abend"), "Antippen: fertige Teile + unfertiger Rest");

  // 4. Ergebnisliste beginnt neu bei Index 0 → nichts überschrieben
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await oeffnen(page);
  await sag(page, [["Wie wird", true]]);
  await sag(page, [["Wie wird", true], ["das Wetter", true]], 1);
  await sag(page, [["morgen früh", false]], 0);
  await sag(page, [["morgen früh in Eutin", true]], 0);
  await page.waitForTimeout(3000);
  check((await eigene(page)).includes("Wie wird das Wetter morgen früh in Eutin"), "neu begonnene Liste: angehängt, nichts überschrieben");

  // 5. „Okay“, dann „Okay ich möchte …“ → nichts abgeschnitten
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await oeffnen(page);
  await sag(page, [["Okay", true]]);
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => window.__rec?.running, null, { timeout: 8000 }).catch(() => {});
  await sag(page, [["Okay was steht morgen an", true]]);
  await page.waitForTimeout(3000);
  const mine = await eigene(page);
  check(mine.includes("Okay") && mine.includes("Okay was steht morgen an"), "„Okay“ allein und danach „Okay ich möchte …“ vollständig");

  // 6. Lange Live-Blase bleibt über Mia sichtbar
  await page.goto(BASE);
  await page.waitForTimeout(900);
  await oeffnen(page);
  const lang = Array.from({ length: 40 }, (_, i) => `Satz ${i + 1} mit ein paar Wörtern mehr`).join(" ");
  await sag(page, [[lang, false]]);
  await page.waitForTimeout(500);
  const pos = await page.evaluate(() => {
    const live = document.querySelector("[data-eigene-blase=live]")?.getBoundingClientRect();
    const mia = document.querySelector("[data-buehne-mia]")?.getBoundingClientRect();
    return live && mia ? { bottom: live.bottom, top: live.top, miaTop: mia.top, h: innerHeight } : null;
  });
  check(Boolean(pos) && pos.bottom <= pos.miaTop + 1 && pos.top >= 0, "lange Live-Blase: ganz sichtbar und über Mia");
};

/** „Lieber schreiben“ schließt sich nicht von selbst: Layout-Sprung lässt es offen, echter Fokusverlust (leer) führt zurück zu Mia */
export const lieberTippen = async (page, check) => {
  await page.addInitScript(FAKE_HOEREN);
  await hello(page);
  await seedFamily(page, { "wasgibts.einmalhinweise": { version: 1, seen: ["mikro-gefragt", "mia-knopf"] } });
  await page.reload();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Sag .*was ansteht/ }).first().click();
  await page.getByRole("dialog").last().waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Lieber schreiben", exact: true }).click();
  const box = page.getByRole("textbox", { name: "Nachricht schreiben" });
  await box.waitFor({ timeout: 5000 });
  await box.focus();
  // Safari schiebt die Seite beim Öffnen der Tastatur hoch: Sprünge des sichtbaren Bereichs nachstellen
  await page.evaluate(() => {
    for (const t of ["resize", "scroll", "resize"]) window.visualViewport?.dispatchEvent(new Event(t));
    window.scrollTo(0, 120);
  });
  await page.waitForTimeout(700);
  check(await box.isVisible(), "Layout-Sprung: Tippen bleibt offen");
  await box.fill("Was gibt es heute");
  await box.press("Enter");
  await page.waitForTimeout(800);
  check(await page.locator("[data-gespraech] .bg-accent.rounded-br-md").filter({ hasText: "Was gibt es heute" }).count() > 0, "tippen → abschicken");
  // Feld leer, echter Fokusverlust → nach 300 ms zurück zu Mia
  await box.focus();
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForTimeout(150);
  check(await box.isVisible(), "kurz nach dem Fokusverlust noch offen");
  await page.waitForTimeout(400);
  check(!(await box.isVisible().catch(() => false)), "leer + Fokus weg → zurück zu Mia");
  // „Lieber sprechen“ als klarer Weg zurück
  await page.getByRole("button", { name: "Lieber schreiben", exact: true }).click();
  await box.waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Lieber sprechen" }).click();
  await page.waitForTimeout(500);
  check(await page.evaluate(() => Boolean(window.__rec?.running)), "„Lieber sprechen“: Mia hört zu");
};
