// Hallo → Startseite, Bearbeiten-Modus, Wischen zwischen den Seiten
import { BASE, hello, losGehts, newPage, seedFamily, serverMitCode, setDark, swipe } from "../lib.mjs";

export const hallo = async (page, check) => {
  await page.goto(BASE);
  const hi = await page.getByRole("heading", { name: "Moin, ich bin Mia." }).waitFor({ timeout: 5000 }).then(() => true, () => false);
  check(hi, "Hallo-Bildschirm „Moin, ich bin Mia.“");
  // Zustimmung ist hier schon erteilt (Testseite): das Häkchen im Hallo steht schon → Bildschirm 2: „Für wen soll ich sortieren?“
  check(await page.getByRole("checkbox", { name: /^Ich akzeptiere die/ }).isChecked(), "Häkchen steht schon (Zustimmung erteilt)");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  const zeig = page.getByRole("button", { name: "Für die Familie" });
  check(await zeig.waitFor({ timeout: 4000 }).then(() => true, () => false), "nach „Los geht’s“: „Für wen soll ich sortieren?“");
  check(await page.getByRole("heading", { name: "Kein Stress. Ich sortier deinen Alltag, Stück für Stück." }).isVisible(), "Überschrift in der Sprechblase");
  for (const t of ["Für wen soll ich sortieren?", "Nur für mich", "Für uns zwei", "Für die Familie", "Passt den Beispiel-Tag an. Später jederzeit änderbar."]) check(await page.getByText(t, { exact: true }).first().isVisible(), `„${t}“`);
  check((await page.locator("[data-haushalt-wahl] button[aria-pressed=true]").count()) === 0, "nichts vorausgewählt");
  check((await page.locator("[data-zeigmal] .mia-zwinkern-einmal").count()) === 1, "Mia zwinkert einmal");
  check(!(await page.getByRole("heading", { name: "Wie magst du’s?" }).count()), "keine Look-Frage mehr");
  // Zurück-Geste geht einen Schritt zurück, dann wieder vor
  await page.goBack();
  check(await page.getByRole("button", { name: "Los geht’s" }).isVisible(), "Zurück: wieder der Hallo-Bildschirm");
  check(!(await page.locator("[data-zeigmal]").count()), "Zurück: Bildschirm 2 weg");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await zeig.click();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(900);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil") || "{}").look)) === "farbig", "Standard bleibt Farbig");
  check(await page.getByText("So sieht ein Tag aus").isVisible(), "danach die Startseite mit Beispiel-Tag");
  // Pinnwand im Beispiel (Tafel 107/119): Felix vorn, Mathis’ Sprachnachricht, Lisa „Ole: Gummistiefel!“, „Beispiel“
  const pinTile = page.getByRole("region", { name: "Pinnwand" });
  if (await pinTile.count()) {
    check(await pinTile.getByText("Bin um 18 Uhr da").isVisible(), "Pinnwand-Beispiel: Felix’ Zettel vorn");
    // der Fächer ist EIN Link (verdeckte Zettel sind keine eigenen Knöpfe), darin drei Zettel
    const fan = pinTile.getByRole("link", { name: /^Beispiel: / });
    check((await fan.count()) === 1 && (await fan.locator(".zettel").count()) === 3, "Pinnwand-Beispiel: drei Zettel im Fächer");
    check(await pinTile.getByText("Beispiel", { exact: true }).isVisible(), "Pinnwand-Beispiel klein markiert");
  }
  check((await page.locator("[data-jetzt]").count()) > 0, "Jetzt-Karte oben");
  check((await page.locator("[data-mia-knopf].mia-zwinkern-einmal").count()) === 1, "Mia-Knopf zwinkert beim ersten Erscheinen");
  check(!(await page.getByText("Schreiben & sprechen").isVisible()), "in den ersten Sekunden kein weiterer Hinweis");
  // Zurück auf der Startseite führt nicht in den Hallo-Ablauf
  await page.goBack().catch(() => {});
  await page.waitForTimeout(600);
  check(!(await page.locator("[data-zeigmal], [data-zustimmung]").count()) && !(await page.getByRole("button", { name: "Los geht’s" }).count()), "Zurück auf der Startseite: kein Hallo-Schritt");
};

/** Erster Start ganz neu (ohne Zustimmung, A-027): Hallo mit Häkchen → „Für wen?“ → Beispiel-Tag; „Los geht’s“ erst mit Häkchen; auf dem iPhone SE passt beides ohne Scrollen */
export const ersterStart = async (page, check, device) => {
  for (const name of [device, "iPhone SE"]) {
    const p = await newPage(page.context().browser(), name, { consent: false });
    try {
      await p.goto(BASE);
      const los = p.getByRole("button", { name: "Los geht’s" });
      await los.waitFor();
      await p.waitForTimeout(1200);
      for (const t of ["Deine Sachen bleiben auf diesem Handy. Mit Konto teilst du sie mit deinen Leuten.", "Ich bin eine KI und kann mich auch mal irren.", "Deine Daten werden nie verkauft."]) check(await p.getByText(t, { exact: true }).isVisible(), `${name}: „${t}“`);
      check(await los.isDisabled(), `${name}: ohne Häkchen ist „Los geht’s“ aus`);
      const fitHallo = await p.evaluate(() => {
        const main = document.querySelector("main[aria-label=Willkommen]");
        return main.scrollHeight <= main.clientHeight + 1;
      });
      check(fitHallo, `${name}: Hallo mit Zustimmung passt ohne Scrollen`);
      await p.getByText(/^Ich akzeptiere die/).click();
      check(await los.isEnabled(), `${name}: mit Häkchen geht’s`);
      const stand = await p.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.einwilligungen") ?? "null")?.arten?.bedingungen);
      check(stand?.ja === true && typeof stand.at === "string", `${name}: Zustimmung gleich gespeichert`);
      await los.click();
      check(!(await p.getByRole("heading", { name: "Bevor’s losgeht" }).count()), `${name}: kein eigener Schritt „Bevor’s losgeht“`);
      await p.getByRole("button", { name: "Für die Familie" }).waitFor();
      await p.waitForTimeout(1200);
      const fit = await p.locator("[data-zeigmal]").evaluate((el) => ({ fits: el.scrollHeight <= el.clientHeight + 1, buttons: el.querySelectorAll("button").length }));
      check(fit.fits, `${name}: Bildschirm 2 passt ohne Scrollen`);
      check(fit.buttons === 3, `${name}: drei gleichwertige Knöpfe (allein, zu zweit, Familie)`);
      // Zurück: ein Schritt zurück zum Hallo (Häkchen bleibt)
      await p.goBack();
      check(await los.waitFor({ timeout: 3000 }).then(() => true, () => false), `${name}: Zurück führt zum Hallo`);
      check(await los.isEnabled(), `${name}: Häkchen bleibt nach Zurück`);
      await p.goForward().catch(() => {});
      if (!(await p.getByRole("button", { name: "Für die Familie" }).isVisible())) await los.click();
      await p.getByRole("button", { name: "Für die Familie" }).click();
      check(await p.getByRole("tab", { name: "Heute", selected: true }).waitFor({ timeout: 5000 }).then(() => true, () => false), `${name}: danach die Startseite`);
      check(await p.getByText("So sieht ein Tag aus").waitFor({ timeout: 3000 }).then(() => true, () => false), `${name}: mit Beispiel-Tag`);
    } finally {
      await p.context().close();
    }
  }
  // Wer über Anmelden kommt, sieht Bildschirm 2 nie
  const login = await newPage(page.context().browser(), device);
  try {
    await login.goto(BASE);
    await login.getByRole("link", { name: /Schon ein Konto\? Anmelden/ }).click();
    await login.waitForURL(/\/anmelden/, { timeout: 5000 });
    await login.waitForTimeout(800);
    check(!(await login.locator("[data-zeigmal]").count()), "Anmelden: kein „Für wen soll ich sortieren?“");
  } finally {
    await login.context().close();
  }
};

/** Bildschirme bis zur Startseite zählen (Hallo, „Für wen“, Zugangscode) */
async function bildschirmeBisStart(p, wahl) {
  const gesehen = new Set();
  const merken = async () => {
    if (await p.locator("main[aria-label=Willkommen]").isVisible().catch(() => false)) gesehen.add("hallo");
    if (await p.locator("[data-zeigmal]").isVisible().catch(() => false)) gesehen.add("fuerwen");
    if (await p.locator("[data-code-screen]").isVisible().catch(() => false)) gesehen.add("code");
    if (await p.locator("[data-zustimmung]").isVisible().catch(() => false)) gesehen.add("zustimmung");
  };
  await p.goto(BASE);
  await p.getByRole("button", { name: "Los geht’s" }).waitFor();
  await merken();
  await p.getByText(/^Ich akzeptiere die/).click();
  await p.getByRole("button", { name: "Los geht’s" }).click();
  await p.getByRole("button", { name: wahl }).waitFor();
  await merken();
  await p.getByRole("button", { name: wahl }).click();
  await p.getByRole("tab", { name: "Heute", selected: true }).waitFor({ timeout: 5000 });
  await p.waitForTimeout(1500);
  await merken();
  return gesehen;
}

/** A-027: höchstens 3 Bildschirme bis zur Startseite – allein, zu zweit, Familie; ohne Code-Pflicht 2, mit 3 (Zugangscode zuletzt) */
export const dreiBildschirme = async (page, check, device) => {
  const browser = page.context().browser();
  for (const wahl of ["Nur für mich", "Für uns zwei", "Für die Familie"]) {
    for (const mitCode of [false, true]) {
      const p = await newPage(browser, device, { consent: false });
      try {
        if (mitCode) await serverMitCode(p);
        const gesehen = await bildschirmeBisStart(p, wahl);
        const n = gesehen.size;
        check(n <= 3 && !gesehen.has("zustimmung"), `${wahl}${mitCode ? " (mit Zugangscode)" : ""}: ${n} Bildschirme (${[...gesehen].join(" → ")})`);
        check(mitCode ? gesehen.has("code") : !gesehen.has("code"), `${wahl}: Zugangscode ${mitCode ? "als 3. Bildschirm" : "nur wenn nötig (hier nicht)"}`);
        if (mitCode) {
          await p.getByRole("button", { name: "Später" }).click();
          check(await p.locator("[data-code-screen]").waitFor({ state: "detached", timeout: 5000 }).then(() => true, () => false), `${wahl}: „Später“ führt zur Startseite`);
        }
      } finally {
        await p.context().close();
      }
    }
  }
};

/** A-027: Karte „Mia auf den Home-Bildschirm“ – nur im Browser, nie als App, nicht im Beispiel-Tag; „Später“ = nach 2 Tagen einmal wieder; Android mit Installier-Angebot */
export const homeKarte = async (page, check, device) => {
  const browser = page.context().browser();
  const ios = /iPhone/.test(device);
  const karte = (p) => p.locator("[data-home-karte]");
  const p = await newPage(browser, device, { homeKarte: true });
  // Ein echtes Installier-Angebot des Test-Browsers hier ausblenden (das Angebot prüft der Android-Teil unten)
  await p.addInitScript(() => window.addEventListener("beforeinstallprompt", (e) => e.stopImmediatePropagation(), { capture: true }));
  try {
    await hello(p);
    await p.waitForTimeout(1200);
    check(!(await karte(p).count()), "Beispiel-Tag: noch keine Karte");
    // Eigene Startseite (Beispiel-Tag vorbei): beim ersten Öffnen die Karte
    await seedFamily(p);
    await p.reload();
    check(await karte(p).waitFor({ timeout: 6000 }).then(() => true, () => false), "im Browser: Karte oben auf der echten Startseite");
    check((await karte(p).getAttribute("data-home-karte")) === (ios ? "ios-safari" : "android-menue"), ios ? "iPhone/Safari: Teilen → Zum Home-Bildschirm" : "Android ohne Angebot: „Menü ⋮ → App installieren“");
    check((await karte(p).count()) === 1 && (await p.locator("[data-tipp=leiste-neu], [data-tipp=startseite-halten]").count()) === 0, "höchstens EIN Hinweis unter der Jetzt-Karte");
    check((await karte(p).locator("[data-home-skizze] svg").count()) >= 2, "kleine Skizze mit Linien-Icons");
    await karte(p).getByRole("button", { name: "Zeig’s mir" }).click();
    const fenster = p.getByRole("dialog", { name: "Mia auf den Home-Bildschirm" });
    check(await fenster.waitFor({ timeout: 4000 }).then(() => true, () => false), "„Zeig’s mir“ öffnet das Fenster");
    check((await fenster.locator("[data-home-anleitung] li").count()) === 3, "drei Schritte mit Skizzen");
    await p.keyboard.press("Escape");
    await fenster.waitFor({ state: "detached", timeout: 4000 }).catch(() => {});
    await karte(p).getByRole("button", { name: "Später" }).click();
    check(await karte(p).waitFor({ state: "detached", timeout: 4000 }).then(() => true, () => false), "„Später“: Karte weg");
    await p.reload();
    await p.getByRole("tab", { name: "Heute", selected: true }).waitFor();
    await p.waitForTimeout(1000);
    check(!(await karte(p).count()), "nach „Später“: heute nicht wieder");
    // 2 Tage später: einmal wieder, nach dem zweiten „Später“ nie mehr
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("wasgibts.homebildschirm"));
      localStorage.setItem("wasgibts.homebildschirm", JSON.stringify({ ...s, am: "2026-10-01" }));
    });
    await p.reload();
    check(await karte(p).waitFor({ timeout: 6000 }).then(() => true, () => false), "nach 2 Tagen: einmal wieder");
    await karte(p).getByRole("button", { name: "Später" }).click();
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("wasgibts.homebildschirm"));
      localStorage.setItem("wasgibts.homebildschirm", JSON.stringify({ ...s, am: "2026-09-01" }));
    });
    await p.reload();
    await p.getByRole("tab", { name: "Heute", selected: true }).waitFor();
    await p.waitForTimeout(1000);
    check(!(await karte(p).count()), "zweites „Später“: nie mehr");
    // Dauerhaft in Einstellungen → Daten & App
    await p.goto(BASE + "/profil/daten");
    check(await p.getByRole("button", { name: /Mia auf den Home-Bildschirm/ }).waitFor({ timeout: 5000 }).then(() => true, () => false), "Daten & App: „Mia auf den Home-Bildschirm“");
  } finally {
    await p.context().close();
  }

  // Als App (standalone): nie
  const app = await newPage(browser, device, { homeKarte: true });
  try {
    await app.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes("display-mode: standalone") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false } : mm(q));
    });
    await hello(app);
    await seedFamily(app);
    await app.reload();
    await app.waitForTimeout(1200);
    check(!(await karte(app).count()), "als Home-Bildschirm-App: keine Karte");
  } finally {
    await app.context().close();
  }

  // Android: Installier-Angebot abgefangen → „Mia installieren“
  if (!ios) {
    const a = await newPage(browser, device, { homeKarte: true });
    try {
      await hello(a);
      await seedFamily(a);
      await a.reload();
      await a.getByRole("tab", { name: "Heute", selected: true }).waitFor();
      await a.evaluate(() => {
        const e = new Event("beforeinstallprompt", { cancelable: true });
        window.__angebot = { gezeigt: 0 };
        e.prompt = async () => {
          window.__angebot.gezeigt++;
        };
        e.userChoice = Promise.resolve({ outcome: "accepted" });
        window.dispatchEvent(e);
        window.__angebot.abgefangen = e.defaultPrevented;
      });
      check(await a.evaluate(() => window.__angebot.abgefangen), "beforeinstallprompt abgefangen (aufgehoben)");
      const knopf = karte(a).getByRole("button", { name: "Mia installieren" });
      check(await knopf.waitFor({ timeout: 4000 }).then(() => true, () => false), "Android mit Angebot: „Mia installieren“");
      await knopf.click();
      check(await karte(a).waitFor({ state: "detached", timeout: 4000 }).then(() => true, () => false), "installiert: Karte weg");
      check((await a.evaluate(() => window.__angebot.gezeigt)) === 1, "Angebot genau einmal gezeigt");
    } finally {
      await a.context().close();
    }
  }
};

/** Begrüßung nach Tafel 55: 10× frisch, Mia groß, neue Zeile, Marke unten, passt ohne Scrollen */
export const hallo2 = async (page, check) => {
  // 10× frisch: keine zweite Navigation (nur Dokument-Anfragen zählen), Mia genau einmal
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
  check(ok === 10, `10× frisch: eine Navigation, Mia genau einmal (${ok}/10)`);
  await page.waitForTimeout(1500);
  check(await page.getByRole("heading", { name: "Moin, ich bin Mia." }).isVisible(), "„Moin, ich bin Mia.“ (einzige Vorstellung)");
  check(await page.locator("h1 .text-accent").innerText() === "Mia", "„Mia“ in Orange");
  const h1 = await page.locator("h1").evaluate((el) => ({ h: el.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(el).lineHeight), fs: parseFloat(getComputedStyle(el).fontSize), w: el.scrollWidth, cw: document.documentElement.clientWidth }));
  check(h1.h < h1.lh * 1.5 && h1.w <= h1.cw, `Überschrift in einer Zeile (${h1.fs}px)`);
  check((await page.locator("[data-tone]").count()) === 0 && !(await page.getByText("Euer Alltag an einem Ort.").count()), "keine Deko-Kacheln, alte Zeile weg");
  check(!(await page.locator("[data-hello-marke] [data-brand]").count()) && (await page.getByText("Gemacht in Eutin von KARAMBA Eis").isVisible()), "unten ohne kleines Logo: „Gemacht in Eutin von KARAMBA Eis“");
  const zeile = page.getByText("Gemacht in Eutin von KARAMBA Eis");
  check((await zeile.evaluate((el) => el.getClientRects().length)) === 1, "Zeile 1 bricht nicht um");
  const rechtlich = page.locator("[data-hello-marke] nav");
  check((await rechtlich.getByRole("link", { name: "Nutzungsbedingungen" }).isVisible()) && (await rechtlich.getByRole("link", { name: "Datenschutz" }).isVisible()) && (await rechtlich.getByRole("link", { name: "Impressum" }).isVisible()), "darunter „Nutzungsbedingungen · Datenschutz · Impressum“");
  const nb = await rechtlich.boundingBox();
  const unten = page.viewportSize().height - (nb.y + nb.height);
  check(unten >= 30 && unten <= 60, `Zeile 2 sitzt ca. 40 px über der Unterkante (${Math.round(unten)} px)`); // große Handys; auf dem SE (≤ 620 px hoch) etwas weniger, damit alles ins Bild passt
  check(await page.getByText("Ich sortier das.").isVisible(), "Untertitel „Erzähl einfach, was ansteht. / Ich sortier das.“");
  // Tafel 22: mit Konten (Testserver) „Schon ein Konto? Anmelden“ statt „Daten wiederherstellen“
  check(!(await page.getByText(/Daten wiederherstellen/).count()), "kein „Daten wiederherstellen“ mehr auf der Begrüßung");
  await page.getByRole("link", { name: /Schon ein Konto\? Anmelden/ }).click();
  await page.waitForURL(/\/anmelden/, { timeout: 5000 }).catch(() => {});
  check(page.url().includes("/anmelden"), "„Schon ein Konto? Anmelden“ öffnet /anmelden");

  // „Los geht’s“ → „Für wen soll ich sortieren?“ → Startseite (Farbig) mit Marke und Datum im Kopf
  await page.goto(BASE);
  await losGehts(page);
  await page.waitForTimeout(900);
  check(await page.getByRole("tab", { name: "Heute", selected: true }).isVisible(), "„Los geht’s“ → „Für wen soll ich sortieren?“ → Startseite");
  check((await page.evaluate(() => document.documentElement.dataset.look)) === "farbig", "Standard Farbig");
  const head = page.locator("main header").first();
  check((await head.locator("[data-brand=lockup]").isVisible()) && /^\w{2}, \d{1,2}\. \w{3,4}$/.test((await head.locator("p").innerText()).trim()), "Kopf: Marke links, kurzes Datum rechts");

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
        const marke = document.querySelector("[data-hello-marke]");
        return main.scrollHeight <= main.clientHeight + 1 && marke.getBoundingClientRect().bottom <= innerHeight;
      });
      check(fit, `${name} ${dark ? "dunkel" : "hell"}: passt ohne Scrollen, Marke unten sichtbar`);
      await p.context().close();
    }
  }
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
  // Farbe wählen (Tafel 108): ein Tipp = sofort übernommen, „A“ = zurück auf automatisch; Wetter ohne Auswahl
  const farbe = () => page.evaluate(() => JSON.parse(localStorage.getItem("wasgibts.startseite") ?? "{}").tiles?.find((t) => t.id === "pinnwand")?.farbe ?? null);
  check(!(await page.getByRole("radiogroup", { name: "Farbe Wetter" }).count()), "Wetter ohne Farbwahl");
  // Im Bearbeiten wackeln die Kacheln samt Farbreihe – tippen wie ein Finger auf die Mitte
  const tippe = async (name) => {
    const b = await page.getByRole("radio", { name }).boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  };
  await tippe("Pinnwand Farbe Aqua");
  await page.waitForTimeout(300);
  check((await farbe()) === "aqua" && (await page.locator('[data-tone="pinnwand"][data-farbe="aqua"]').count()) > 0, "Pinnwand → Aqua, sofort übernommen");
  check((await page.getByRole("radio", { name: "Pinnwand Farbe Aqua" }).getAttribute("aria-checked")) === "true", "aktuelle Farbe ausgewählt");
  await tippe("Pinnwand Farbe automatisch");
  await page.waitForTimeout(300);
  check((await farbe()) === null && !(await page.locator('[data-tone="pinnwand"][data-farbe]').count()), "„A“ → wieder automatisch");
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

/** Mia für alle: „Nur für mich“ → Profil „single“, Pinnwand-Kachel aus, Beispiel-Tag allein (Laufen, Yoga …) */
export const nurFuerMich = async (page, check) => {
  await page.goto(BASE);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Nur für mich" }).click();
  await page.getByRole("tab", { name: "Heute", selected: true }).waitFor({ timeout: 5000 });
  await page.waitForTimeout(900);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil") || "{}").householdType)) === "single", "Profil: nur für mich");
  check(!(await page.locator('section[aria-label^="Pinnwand"]').count()), "Pinnwand-Kachel aus");
  check(!(await page.getByText(/Kita, Jonne|Laternelaufen|Mathis/).count()), "Beispiel-Tag ohne Familie");
  // Tafel 119: Wetter, Sport, Notizen, Im Haus als XS oben; Beispiel-Inhalte allein
  for (const id of ["wetter", "sport", "notizen", "vorrat"]) check((await page.locator(`[data-unit="${id}"][data-groesse="XS"]`).count()) === 1, `${id} als XS`);
  check(await page.getByText("2 von 3 diese Woche").isVisible(), "Sport-Beispiel „2 von 3 diese Woche“");
  // Name vor Schild (Tafel 133): „Hähnchen“ und das Schild „heute“ (10,5 px)
  const haus = (await page.locator('[data-unit="vorrat"]').innerText()).replace(/\s+/g, " ");
  check(/Hähnchen heute/.test(haus), `Im-Haus-Beispiel „Hähnchen“ + Schild „heute“ (${haus})`);
};
