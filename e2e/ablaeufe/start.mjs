// Hallo → Startseite, Bearbeiten-Modus, Wischen zwischen den Seiten
import { BASE, hello, seedFamily, swipe } from "../lib.mjs";

export const hallo = async (page, check) => {
  await page.goto(BASE);
  const hi = await page.getByText("Hallo, ich bin Mia.").waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(hi, "Hallo-Bildschirm „Hallo, ich bin Mia.“");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.waitForTimeout(900);
  check(await page.getByRole("tab", { name: "Heute", selected: true }).isVisible(), "danach die Startseite (Heute)");
  check(await page.getByText("So sieht ein Tag aus").isVisible(), "Beispiel-Tag mit „So sieht ein Tag aus“");
  check((await page.locator("[data-jetzt]").count()) > 0, "Jetzt-Karte oben");
};

export const bearbeiten = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const tile = page.getByRole("region", { name: "Pinnwand" });
  const box = await tile.boundingBox();
  await page.mouse.move(box.x + 40, box.y + box.height - 12);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check(await page.getByText("Startseite bearbeiten").first().isVisible(), "lange drücken = Startseite bearbeiten");
  check(await page.getByRole("button", { name: /Kachel/ }).first().isVisible(), "„+ Kachel“ im Kopf");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  check(!(await page.getByRole("button", { name: "Fertig" }).isVisible()), "„Fertig“ beendet");
};

/** Bearbeiten-Modus öffnen (lange auf die Pinnwand drücken) */
const openEdit = async (page) => {
  const box = await page.getByRole("region", { name: "Pinnwand" }).boundingBox();
  await page.mouse.move(box.x + 40, box.y + box.height - 12);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(600);
};

/** Tipp „Neue Kacheln holen“: einmalig, Spitze zur Knopf-Mitte, drei Wege zu schließen */
export const kachelTipp = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  await openEdit(page);
  const card = page.getByRole("dialog", { name: "Neue Kacheln holen" });
  check(await card.isVisible(), "Tipp erscheint beim ersten Bearbeiten");
  check(await page.evaluate(() => document.activeElement?.textContent?.trim()) === "Verstanden", "Fokus zuerst auf „Verstanden“");
  const button = await page.locator("header").getByRole("button", { name: /Kachel/ }).boundingBox();
  const arrow = await card.locator("span[aria-hidden]").first().boundingBox();
  const cardBox = await card.boundingBox();
  const vw = page.viewportSize().width;
  check(Math.abs(arrow.x + arrow.width / 2 - (button.x + button.width / 2)) <= 2, "Spitze zeigt auf die Mitte von „+ Kachel“");
  check(Math.round(cardBox.x) === 16 && Math.round(vw - cardBox.x - cardBox.width) === 16, "Karte 16 px vom Rand");
  check(await page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.einmalhinweise") ?? "{}").seen?.includes("kachel-hinzufuegen")), "als gesehen gemerkt");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.waitForTimeout(400);
  check(!(await card.isVisible()), "„Verstanden“ schließt");
  check(await page.getByRole("button", { name: "Fertig" }).isVisible(), "Bearbeiten bleibt offen");
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);
  await openEdit(page);
  check(!(await card.isVisible()), "kommt nicht wieder");
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);

  // Zurücksetzen (wie „Tipps wieder zeigen“), dann auf die Abdunklung tippen
  await page.evaluate(() => localStorage.setItem("wasgibts.einmalhinweise", JSON.stringify({ version: 1, seen: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  await openEdit(page);
  check(await card.isVisible(), "nach dem Zurücksetzen wieder da");
  await page.mouse.click(vw / 2, page.viewportSize().height - 40);
  await page.waitForTimeout(400);
  check(!(await card.isVisible()), "Tipp auf die Abdunklung schließt");
  check(await page.getByRole("button", { name: "Fertig" }).isVisible(), "… und Bearbeiten bleibt offen");
  await page.getByRole("button", { name: "Fertig" }).click();
  await page.waitForTimeout(400);

  // Noch einmal: direkt auf das hervorgehobene „+ Kachel“
  await page.evaluate(() => localStorage.setItem("wasgibts.einmalhinweise", JSON.stringify({ version: 1, seen: [] })));
  await page.reload();
  await page.waitForTimeout(900);
  await openEdit(page);
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
  await page.waitForTimeout(600);
  check(!(await card.isVisible()), "„+ Kachel“ schließt den Tipp");
  check(await page.getByRole("dialog", { name: "Kachel hinzufügen" }).isVisible(), "… und öffnet sofort die Auswahl");
};

export const wischen = async (page, check) => {
  await hello(page);
  const vw = page.viewportSize().width;
  await swipe(page, { x: vw * 0.85, y: 420, dx: -vw * 0.6 });
  await page.waitForTimeout(700);
  check(await page.getByRole("tab", { name: "Essen", selected: true }).isVisible(), "nach links wischen → Essen");
  await swipe(page, { x: vw * 0.15, y: 420, dx: vw * 0.6 });
  await page.waitForTimeout(700);
  await swipe(page, { x: vw * 0.15, y: 420, dx: vw * 0.6 });
  await page.waitForTimeout(700);
  check(await page.getByRole("tab", { name: "Kalender", selected: true }).isVisible(), "zweimal nach rechts → Kalender");
};

// /profil/wochenende → /profil/kochstil; ohne Baustein „Kochstil“ führt die weiter zur Startseite
export const umleitungen = async (page, check) => {
  await hello(page);
  for (const [from, to] of [["/ideen", "/?seite=essen"], ["/schnellkueche", "/?seite=essen"], ["/profil/lotte", "/profil/kuechenhelfer"], ["/profil/farbe", "/profil/kuechenhelfer"], ["/profil/vorlesen", "/profil/kuechenhelfer"], ["/profil/ansicht", "/profil"], ["/profil/darstellung", "/profil"], ["/profil/wochenende", "/"]]) {
    await page.goto(BASE + from);
    await page.waitForTimeout(300);
    const url = new URL(page.url());
    check(url.pathname + url.search === to, `${from} → ${to} (${url.pathname + url.search})`);
  }
};
