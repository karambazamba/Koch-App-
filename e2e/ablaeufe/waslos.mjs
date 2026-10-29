// „Was los?“ (A-055, Tafel 142) mit Testdaten (TIPS_SOURCE=demo im
// Testserver, nie in Produktion): Einstellungen → „Anzeigen“ öffnet das
// Fenster „Was ist los in Eutin?“; Reiter Heute · Wochenende · 2 Wochen,
// Filter-Chips (Familie: „Für Kinder“ zuerst), Kalender-Knopf trägt sofort ein
// (Raum Familie, Ergebnis-Karte „Eingetragen“), Detail mit Pinnwand-Zettel
// „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“ und Originallink, Quelle
// und „ohne Gewähr“. Kein Text mit „…“ oder abgeschnitten – auch auf dem SE.
import { BASE, hello, newPage, seedFamily, store } from "../lib.mjs";

const fenster = (page) => page.locator("[role=dialog]:has([data-was-los-fenster])");

/** Fenster über Einstellungen → „Was los?“ → „Anzeigen“ öffnen */
async function wasLosOeffnen(page, reiter = "Heute") {
  await page.goto(BASE + "/profil/regiontipps");
  await page.getByRole("button", { name: "Anzeigen" }).click();
  await fenster(page).waitFor({ timeout: 6000 });
  await page.locator("[data-waslos-zeile]").first().waitFor({ timeout: 6000 });
  if (reiter !== "Heute") await fenster(page).getByRole("radio", { name: reiter }).click();
  await page.waitForTimeout(500);
}

/** Abgeschnittene Texte im offenen Fenster („…“ am Ende oder weggeschnitten) */
function abgeschnittenImFenster() {
  const out = [];
  for (const dialog of document.querySelectorAll("[role=dialog]")) {
    const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      const el = node.parentElement;
      if (!text || !el || el.closest(".sr-only, [aria-hidden=true]")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (/(…|\.\.\.)$/.test(text)) out.push(`„${text}“ endet auf …`);
      const s = getComputedStyle(el);
      if (s.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1) out.push(`„${text}“ seitlich abgeschnitten`);
      if (s.webkitLineClamp && s.webkitLineClamp !== "none" && el.scrollHeight > el.clientHeight + 1) out.push(`„${text}“ unten abgeschnitten`);
      if (r.right > window.innerWidth + 1) out.push(`„${text}“ ragt aus dem Bild`);
    }
  }
  return out;
}

async function nichtsAbgeschnitten(page, check, wo) {
  const weg = await page.evaluate(abgeschnittenImFenster);
  check(weg.length === 0, `${wo}: nichts abgeschnitten ${weg.join(" | ")}`);
}

async function durchgehen(page, check, device) {
  await hello(page);
  await seedFamily(page);
  await wasLosOeffnen(page);
  const f = fenster(page);
  check(await f.getByRole("heading", { name: "Was ist los in Eutin?" }).isVisible(), `${device}: Titel „Was ist los in Eutin?“`);
  check(await f.getByText("Veranstaltungen · bis 15 km").isVisible(), `${device}: Unterzeile „Veranstaltungen · bis 15 km“`);
  // Heute (Mi 10:30): ganztags zuerst, dann nach Uhrzeit
  const heute = await f.locator("[data-waslos-zeile]").evaluateAll((els) => els.map((e) => e.getAttribute("data-waslos-zeile")));
  check(heute.join() === "demo-fotografien,demo-beletage,demo-puder,demo-museum", `${device}: Heute in Reihenfolge (${heute.join(", ")})`);
  check((await f.locator("h3").first().textContent())?.trim() === "Heute · Mi 21. Okt", `${device}: Abschnitt „HEUTE · MI 21. OKT“`);
  check(!(await f.getByRole("group", { name: "Filter" }).count()), `${device}: Heute ohne Filter-Chips`);
  check(await f.locator("[data-quelle]").getByText(/Kreis Ostholstein/).isVisible(), `${device}: Quellenzeile`);
  await nichtsAbgeschnitten(page, check, `${device} · Heute`);

  // Wochenende: Chips, Familie „Für Kinder“ zuerst; Filter
  await f.getByRole("radio", { name: "Wochenende" }).click();
  const chips = await f.getByRole("group", { name: "Filter" }).getByRole("button").allInnerTexts();
  check(chips.join() === "Alles,Für Kinder,Kultur,Draußen,Märkte", `${device}: Chips ${chips.join(" · ")}`);
  const filter = f.getByRole("group", { name: "Filter" });
  await filter.getByRole("button", { name: "Für Kinder", exact: true }).click();
  const kinder = await f.locator("[data-waslos-zeile]").evaluateAll((els) => els.map((e) => e.getAttribute("data-waslos-zeile")));
  check(kinder.join() === "demo-kino,demo-herbstmarkt,demo-laternen", `${device}: Für Kinder am Wochenende (${kinder.join(", ")})`);
  check((await f.getByText("für Kinder", { exact: true }).count()) === 3, `${device}: Schild „für Kinder“ an jeder Zeile`);
  await filter.getByRole("button", { name: "Märkte", exact: true }).click();
  check((await f.locator("[data-waslos-zeile]").count()) === 1, `${device}: Märkte = Herbstmarkt`);
  await nichtsAbgeschnitten(page, check, `${device} · Wochenende`);

  // 2 Wochen, Alles: nichts aus Heiligenhafen (außerhalb 15 km), Wochenmarkt in Malente
  await f.getByRole("radio", { name: "2 Wochen" }).click();
  await filter.getByRole("button", { name: "Alles", exact: true }).click();
  check(await f.getByText("Wochenmarkt", { exact: true }).isVisible(), `${device}: 2 Wochen mit Wochenmarkt`);
  check(!(await f.getByText("Lichterfahrt im Hafen").count()), `${device}: nur bis 15 km`);
  await nichtsAbgeschnitten(page, check, `${device} · 2 Wochen`);

  // Kalender-Knopf: sofort eingetragen, Raum Familie, Ergebnis-Karte
  await f.locator('[data-waslos-zeile="demo-nachtwaechter"] [data-kalender-knopf]').click();
  await f.locator("[data-ergebnis-eingetragen]").waitFor({ timeout: 3000 });
  check(await f.locator("[data-ergebnis-eingetragen]").getByText("Eingetragen").isVisible(), `${device}: Ergebnis-Karte „Eingetragen“`);
  const termin = (await store(page, "wasgibts.eintraege")).entries.find((e) => e.data.title === "Nachtwächter-Rundgang");
  check(termin?.raum === "familie" && termin.data.date === "2026-10-24" && termin.data.start === "17:00" && /^https:\/\/www\.kreis-oh\.de\//.test(termin.data.link ?? ""), `${device}: Familientermin Sa 17:00 mit Link`);
  check(await f.locator('[data-waslos-zeile="demo-nachtwaechter"] [data-kalender-knopf]').isDisabled(), `${device}: Knopf zeigt danach das Häkchen`);

  // Detail: Pinnwand-Zettel und Originallink
  await f.locator('[data-waslos-zeile="demo-nachtwaechter"] button').first().click();
  const detail = page.locator("[role=dialog]:has([data-was-los-detail])");
  await detail.waitFor({ timeout: 4000 });
  check(await detail.getByText("Sa 24. Okt · 17:00").isVisible(), `${device}: Detail „SA 24. OKT · 17:00“`);
  check(await detail.getByRole("button", { name: "Im Kalender" }).isDisabled(), `${device}: Detail weiß, dass es schon im Kalender steht`);
  check((await detail.locator("[data-zettel-vorschau]").textContent())?.trim() === "Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?", `${device}: Zettel-Vorschau`);
  await detail.getByRole("button", { name: "An die Pinnwand" }).click();
  const pins = (await store(page, "wasgibts.pinnwand")).messages;
  check(pins.some((m) => m.data.text === "Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?"), `${device}: Zettel hängt an der Pinnwand`);
  const link = detail.locator("[data-original-link]");
  check((await link.getAttribute("href"))?.startsWith("https://www.kreis-oh.de/") && (await link.getAttribute("target")) === "_blank", `${device}: „Mehr beim Kreis Ostholstein“ öffnet die Originalseite`);
  check(await detail.getByText("Angaben vom Kreis Ostholstein, ohne Gewähr").isVisible(), `${device}: „ohne Gewähr“`);
  await nichtsAbgeschnitten(page, check, `${device} · Detail`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(!(await page.locator("[data-was-los-fenster]").count()), `${device}: Fenster schließt`);

  // Baustein aus → Einstellungen ohne „Anzeigen“, Zeile in den Einstellungen weg
  await page.getByRole("switch", { name: "Was los?" }).uncheck({ force: true });
  await page.waitForTimeout(300);
  check(!(await page.getByRole("button", { name: "Anzeigen" }).count()), `${device}: aus = nichts mehr zu sehen`);
  check((await store(page, "wasgibts.funktionen")).aus?.includes("regiontipps"), `${device}: selbst aus bleibt aus`);
}

/** Hilfen für `npm run bilder` (als Objekt, damit der Durchklick sie nicht für einen Ablauf hält) */
export const WAS_LOS = { oeffnen: wasLosOeffnen };

export const wasLos = async (page, check, device) => {
  await durchgehen(page, check, device);
  // iPhone SE (320 px) einmal mit – im Lauf des 15 Pro
  if (device !== "iPhone 15 Pro") return;
  const se = await newPage(page.context().browser(), "iPhone SE");
  try {
    await durchgehen(se, check, "iPhone SE");
    check(!se.errors.length, `iPhone SE: keine Fehler ${se.errors.join(" | ")}`);
  } finally {
    await se.context().close();
  }
};
