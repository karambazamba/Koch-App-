// Hallo → Startseite, Bearbeiten-Modus, Wischen zwischen den Seiten
import { BASE, hello, launch, newPage, seedFamily, setDark, swipe } from "../lib.mjs";

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

/** Schein-Spracherkennung (Chromium ohne Netz kann nicht wirklich zuhören) */
const FAKE_SPEECH = () => {
  window.SpeechRecognition = class {
    start() {
      window.__zuhoeren = (window.__zuhoeren ?? 0) + 1;
    }
    stop() {
      this.onend?.();
    }
    abort() {
      this.onend?.();
    }
  };
};

/** Begrüßung neu (Tafel 19): 10× frisch, passt ohne Scrollen, Mikro unten in der Leiste, Link */
export const hallo2 = async (page, check, device) => {
  // 10× frisch: keine zweite Navigation (nur Dokument-Anfragen zählen), Begleitung genau einmal
  let navs = 0;
  page.on("request", (r) => r.isNavigationRequest() && r.frame() === page.mainFrame() && navs++);
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    navs = 0;
    await page.goto(BASE);
    const face = page.locator("[data-hello=laeuft]");
    await face.waitFor({ timeout: 6000 }).catch(() => {});
    const handle = await face.elementHandle().catch(() => null);
    await page.waitForTimeout(1200);
    const same = Boolean(handle && (await handle.evaluate((el) => el.isConnected)));
    if (same && (await page.locator("[data-hello]").count()) === 1 && navs === 1) ok++;
  }
  check(ok === 10, `10× frisch: eine Navigation, Begleitung genau einmal (${ok}/10)`);
  await page.waitForTimeout(1500);
  check((await page.locator("[data-tone]").count()) === 3, "drei Kacheln (Termine, Essen, Einkauf)");
  check(await page.getByText("Euer Alltag an einem Ort.").isVisible(), "Zeile „Euer Alltag an einem Ort.“");
  check(!(await page.getByText("Ich behalte euren Alltag im Blick.").count()) && !(await page.getByText("Ich habe eine Sicherung").count()), "alte Texte sind weg");
  check(!(await page.getByText("Einfach mit mir sprechen").count()), "Sprech-Chip ist weg");
  const talk = page.getByRole("button", { name: "Mit Mia sprechen" });
  check(await talk.isVisible(), "Mikro unten „Mit Mia sprechen“");
  const box = await talk.boundingBox();
  const losBox = await page.getByRole("button", { name: "Los geht’s" }).boundingBox();
  check(box.height >= 44 && box.width >= 44 && box.y > losBox.y, `Mikro unten unter „Los geht’s“, mind. 44 px (${Math.round(box.height)} px)`);
  check(!(await page.getByText(/Anmelden/).count()), "kein Anmelden-Link auf der Begrüßung");

  // Link → Daten & App
  await page.getByRole("link", { name: /Daten wiederherstellen/ }).click();
  await page.waitForURL(/\/profil\/daten/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/profil/daten"), "Link öffnet /profil/daten");

  // „Los geht’s“ → Startseite
  await page.goto(BASE);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.waitForTimeout(900);
  check(await page.getByRole("tab", { name: "Heute", selected: true }).isVisible(), "„Los geht’s“ → Startseite");

  // Passt ohne Scrollen: SE, 15 Pro, Pro Max, Pixel 7 – hell und dunkel
  const browser = page.context().browser();
  for (const name of ["iPhone SE", "iPhone 15 Pro", "iPhone 15 Pro Max", "Pixel 7"]) {
    for (const dark of [false, true]) {
      const p = await newPage(browser, name, { dark });
      await p.goto(BASE);
      await p.getByRole("button", { name: "Los geht’s" }).waitFor();
      await p.waitForTimeout(400);
      const fit = await p.evaluate(() => {
        const main = document.querySelector("main[aria-label=Willkommen]");
        const link = [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Daten wiederherstellen"));
        const mic = document.querySelector("button[aria-label^='Mit ']");
        return main.scrollHeight <= main.clientHeight + 1 && link.getBoundingClientRect().bottom <= innerHeight && mic.getBoundingClientRect().bottom <= innerHeight;
      });
      check(fit, `${name} ${dark ? "dunkel" : "hell"}: passt ohne Scrollen, Mikro unten sichtbar`);
      await p.context().close();
    }
  }

  // Mikro mit (Schein-)Mikrofon → Startseite + Leiste hört zu
  const micBrowser = await launch(["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]);
  const withMic = await newPage(micBrowser, device, { permissions: ["microphone"] });
  await withMic.addInitScript(FAKE_SPEECH);
  await withMic.goto(BASE);
  await withMic.getByRole("button", { name: "Mit Mia sprechen" }).click();
  await withMic.waitForTimeout(1500);
  check(await withMic.getByRole("tab", { name: "Heute", selected: true }).isVisible(), "Mikro → Startseite");
  check(await withMic.getByRole("button", { name: "Zuhören beenden" }).isVisible(), "… und die Leiste hört zu");
  check(!withMic.errors.length, `Mikro: keine Fehler ${withMic.errors.join(" | ")}`);
  await micBrowser.close();

  // Mikrofon abgelehnt → Startseite, Leiste zum Tippen, freundlicher Satz
  const denied = await newPage(browser, device);
  await denied.addInitScript(FAKE_SPEECH);
  await denied.goto(BASE);
  await denied.getByRole("button", { name: "Mit Mia sprechen" }).click();
  await denied.waitForTimeout(1500);
  check(await denied.getByRole("tab", { name: "Heute", selected: true }).isVisible(), "abgelehnt → Startseite");
  check(await denied.getByRole("textbox").last().isVisible(), "… Leiste offen zum Tippen");
  check(await denied.getByText(/Mikrofon ist noch aus/).isVisible(), "… mit freundlichem Satz");
  check(!(await denied.evaluate(() => window.__zuhoeren ?? 0)), "… und hört nicht zu");
  await denied.context().close();
};

export const bearbeiten = async (page, check) => {
  await hello(page);
  await seedFamily(page);
  await page.reload();
  await page.waitForTimeout(900);
  const tile = page.getByRole("region", { name: "Pinnwand" });
  const box = await tile.boundingBox();
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(500);
  check(await page.getByText("Startseite bearbeiten").first().isVisible(), "lange drücken = Startseite bearbeiten");
  check(await page.getByRole("button", { name: /Kachel/ }).first().isVisible(), "„+ Kachel“ im Kopf");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);
  check(!(await page.getByRole("button", { name: "Fertig" }).first().isVisible()), "„Fertig“ beendet");
};

/** Bearbeiten-Modus öffnen (lange auf die Pinnwand drücken) */
const openEdit = async (page) => {
  const box = await page.getByRole("region", { name: "Pinnwand" }).boundingBox();
  await page.mouse.move(box.x + 8, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  await page.waitForTimeout(600);
};

/** Tipp „Neue Kacheln holen“: einmalig, Spitze zur Knopf-Mitte, alle Wege zu schließen */
const TIP_KEY = "wasgibts.einmalhinweise";
const resetTip = (page) => page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ version: 1, seen: [] })), TIP_KEY);
const tipSeen = (page) => page.evaluate((k) => Boolean(JSON.parse(localStorage.getItem(k) ?? "{}").seen?.includes("kachel-tipp")), TIP_KEY);
const tipCard = (page) => page.getByRole("dialog", { name: "Neue Kacheln holen" });
const addButton = (page) => page.locator("header").getByRole("button", { name: /Kachel/ });
const editOpen = (page) => page.getByRole("button", { name: "Fertig" }).first().isVisible();
const focused = (page) => page.evaluate(() => document.activeElement?.textContent?.trim());

/** Spitze trifft die Mitte des echten Knopfs, Karte 16 px vom Rand */
async function tipGeometry(page, check, label) {
  const card = tipCard(page);
  await card.waitFor({ timeout: 3000 });
  const button = await addButton(page).boundingBox();
  const arrow = await card.locator("span[aria-hidden]").first().boundingBox();
  const box = await card.boundingBox();
  const vw = page.viewportSize().width;
  check(Math.abs(arrow.x + arrow.width / 2 - (button.x + button.width / 2)) <= 2, `${label}: Spitze zeigt auf die Mitte von „+ Kachel“`);
  check(Math.round(box.x) === 16 && Math.round(vw - box.x - box.width) === 16, `${label}: Karte 16 px vom Rand`);
  check(box.y > button.y + button.height, `${label}: Karte direkt unter dem Knopf`);
  check(box.y + box.height <= page.viewportSize().height, `${label}: Karte ganz sichtbar`);
}

/** Frisch auf die Startseite mit Familie, Tipp zurückgesetzt, Bearbeiten öffnen */
async function freshEdit(page, first = false) {
  if (first) {
    await hello(page);
    await seedFamily(page);
  } else await resetTip(page);
  await page.reload();
  await page.waitForTimeout(900);
  await openEdit(page);
}

export const kachelTipp = async (page, check, device) => {
  await freshEdit(page, true);
  const card = tipCard(page);
  check(await card.isVisible(), "Tipp erscheint beim ersten Bearbeiten");
  await tipGeometry(page, check, "hell");
  check((await focused(page)) === "Verstanden", "Fokus zuerst auf „Verstanden“");
  await page.keyboard.press("Tab");
  check((await focused(page)) === "Kachel", "Tab → „+ Kachel“ (Fokus bleibt im Tipp)");
  await page.keyboard.press("Tab");
  check((await focused(page)) === "Verstanden", "Tab → wieder „Verstanden“");
  check(await page.evaluate(() => document.body.style.overflow === "hidden"), "Seite scrollt nicht");
  check(!(await tipSeen(page)), "erst beim Schließen als gesehen gemerkt");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.waitForTimeout(400);
  check(!(await card.isVisible()), "„Verstanden“ schließt");
  check(await tipSeen(page), "… und merkt „kachel-tipp“");
  check((await focused(page)) === "Kachel", "Fokus zurück auf „+ Kachel“");
  check(await editOpen(page), "Bearbeiten bleibt offen");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);
  await openEdit(page);
  check(!(await card.isVisible()), "zweites Öffnen ohne Tipp");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);

  // Abdunklung
  await freshEdit(page);
  check(await card.isVisible(), "nach dem Zurücksetzen wieder da");
  await page.mouse.click(page.viewportSize().width / 2, page.viewportSize().height - 40);
  await page.waitForTimeout(400);
  check(!(await card.isVisible()), "Tipp auf die Abdunklung schließt");
  check(await editOpen(page), "… und Bearbeiten bleibt offen");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);

  // Zurück-Geste
  await freshEdit(page);
  await page.goBack();
  await page.waitForTimeout(500);
  check(!(await card.isVisible()), "Zurück schließt den Tipp");
  check(await editOpen(page), "… und Bearbeiten bleibt offen");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);

  // Escape
  await freshEdit(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(!(await card.isVisible()) && (await editOpen(page)), "Escape schließt, Bearbeiten bleibt");
  await page.getByRole("button", { name: "Fertig" }).first().click();
  await page.waitForTimeout(400);

  // Direkt auf den hervorgehobenen echten „+ Kachel“
  await freshEdit(page);
  const button = await addButton(page).boundingBox();
  await page.mouse.click(button.x + button.width / 2, button.y + button.height / 2);
  await page.waitForTimeout(600);
  check(!(await card.isVisible()), "„+ Kachel“ schließt den Tipp");
  check(await page.getByRole("dialog", { name: "Kachel hinzufügen" }).isVisible(), "… und öffnet sofort die Auswahl");
  await page.goBack();
  await page.waitForTimeout(500);
  check(!(await page.getByRole("dialog", { name: "Kachel hinzufügen" }).isVisible()) && (await editOpen(page)), "Zurück schließt die Auswahl, Bearbeiten bleibt");

  // Zurücksetzen in Daten & App (nur im Testmodus sichtbar)
  await page.goto(BASE + "/profil/daten");
  await page.getByRole("button", { name: "Einmal-Hinweise zurücksetzen" }).click();
  await page.waitForTimeout(300);
  check(!(await tipSeen(page)), "„Einmal-Hinweise zurücksetzen“ in Daten & App");

  // Dunkel auf diesem Gerät, hell und dunkel auf dem iPhone SE
  const browser = page.context().browser();
  for (const [name, dark] of [[device, true], ["iPhone SE", false], ["iPhone SE", true]]) {
    if (!name) continue;
    const other = await newPage(browser, name, { dark });
    await hello(other);
    await seedFamily(other);
    if (dark) await setDark(other);
    await other.reload();
    await other.waitForTimeout(900);
    await openEdit(other);
    await tipGeometry(other, check, `${name} ${dark ? "dunkel" : "hell"}`);
    check(!other.errors.length, `${name} ${dark ? "dunkel" : "hell"}: keine Fehler ${other.errors.join(" | ")}`);
    await other.context().close();
  }
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
