// Nichts abgeschnitten (A-045, Tafel 133): Startseite mit Beispiel-Tag und
// mit Familie (Gericht mit Zutaten für die Liste, Im Haus mit „Würstchen“,
// langer Name „Gemüselasagne mit Béchamel“, abends „KOCHIDEE · MORGEN DO“) auf
// iPhone SE (320 px), 15 Pro und Pixel 7, jede Kachel einmal in XS, S und M
// (wo es die Größe gibt, sonst die nächste erlaubte; Raster A-023). Kein sichtbarer Text in einer Kachel endet auf „…“
// oder wird weggeschnitten (`abgeschnitteneTexte`); frei Eingegebenes
// (`data-freitext`) zählt nicht. Die Wundertüte (A-022) ist mit dabei, jede
// Karte ihres Pools prüft `wundertueteAlle`. Dazu Tafel 134: Essen-Kachel ohne große
// Knöpfe, „Was anderes?“ oben links, „Wochenplan ›“ unten rechts, kein
// oranger Kreis.
import { hello, newPage, seedFamily } from "../lib.mjs";
import { abgeschnitteneTexte } from "../regeln.mjs";
import { RECIPE_DATA } from "./essen.mjs";

/** Kacheln der Startseite (ohne „bald“ und ohne die zum Launch ausgeblendeten) mit ihren Größen */
const KACHELN = [
  ["pinnwand", ["S", "M"]],
  ["wetter", ["XS", "S", "M"]],
  ["termine", ["S", "M"]],
  ["aufgaben", ["S", "M"]],
  ["essen", ["S", "M"]],
  ["einkauf", ["S", "M"]],
  ["timer", ["XS", "S"]],
  ["sport", ["XS", "S"]],
  ["vorrat", ["S", "M"]],
  ["notizen", ["XS", "S", "M"]],
  ["wundertuete", ["S", "M"]],
];
/** Nächste erlaubte Größe (wie die Migration der Startseite) */
const naechste = (sizes, size) => (sizes.includes(size) ? size : size === "XS" ? sizes[0] : sizes[sizes.length - 1]);
/** Startseite v10 (A-050): alle Kacheln sichtbar (auch Sport/Timer XS und Im Haus – gewählt), dazu die Kreise oben */
const layout = (size) => ({ version: 10, tipSeen: true, tiles: KACHELN.map(([id, sizes]) => ({ id, visible: true, size: naechste(sizes, size) })), kreise: [] });

const WOCHE = "2026-10-19";
const LANG = "Gemüselasagne mit Béchamel";
const FAMILIE = {
  ...RECIPE_DATA,
  "wasgibts.wochenplan": { version: 3, weeks: { [WOCHE]: { Mittwoch: { kind: "text", title: "Spaghetti Bolognese", category: "fleisch" } } } },
  "wasgibts.vorrat": {
    version: 2,
    items: [
      { id: "p1", name: "Hähnchen", amount: null, unit: "", addedAt: "2026-10-18", place: "kuehlschrank" },
      { id: "p2", name: "Würstchen", amount: null, unit: "", addedAt: "2026-10-19", place: "kuehlschrank" },
      { id: "p3", name: "Joghurt", amount: null, unit: "", addedAt: "2026-10-16", place: "kuehlschrank" },
      { id: "p4", name: "Paprika", amount: 2, unit: "Stück", addedAt: "2026-10-18", place: "kuehlschrank" },
      { id: "p5", name: "Reis", amount: 500, unit: "g", addedAt: "2026-10-10", place: "schrank" },
    ],
  },
  "wasgibts.funktionen": { version: 2, on: ["vorrat", "rezepte", "wochenplan", "sport", "notizen", "pinnwand", "wundertuete"] },
  // Kochidee-Pille sichtbar (ab dem 3. Nutzungstag)
  "wasgibts.kochtipp": { version: 1, days: ["2026-10-19", "2026-10-20", "2026-10-21"], unlocked: true, popped: true, last: null, shown: [] },
};

const essen = (page) => page.locator("[role=tabpanel]:not([inert]) [data-essen-kachel]").first();

/** Einmal laden und alle Kacheln prüfen */
async function pruefen(page, check, wo, size) {
  await page.evaluate((l) => localStorage.setItem("wasgibts.startseite", JSON.stringify(l)), layout(size));
  await page.reload();
  await page.locator("[role=tabpanel]:not([inert]) [data-unit]").first().waitFor();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const funde = await page.evaluate(abgeschnitteneTexte);
  check(!funde.length, `${wo} · ${size}: nichts abgeschnitten${funde.length ? ` – ${funde.join(" | ")}` : ""}`);
  return funde;
}

/** Tafel 134: keine großen Knöpfe, unten rechts „Wochenplan ›“ (Tippfläche ≥ 44 px), oben links „Was anderes?“, kein oranger Kreis */
async function essenPillen(page, check, wo, size) {
  const tile = essen(page);
  if (!(await tile.count())) return;
  check(!(await tile.locator("[data-rezept], [data-kachel-knoepfe]").count()), `${wo} · ${size}: keine großen Knöpfe`);
  const pille = tile.locator("[data-essen-pille] > *");
  const text = (await pille.innerText().catch(() => "")).trim();
  const box = await pille.boundingBox();
  check(/^(Wochenplan|Woche|Weiter kochen|Weiter) ›$/.test(text) && box && box.height >= 44, `${wo} · ${size}: Pille unten rechts „${text}“ ≥ 44 px`);
  const oben = tile.locator("[data-kachel-pille]");
  if (await oben.count()) check((await oben.innerText()).trim() === "Was anderes?", `${wo} · ${size}: oben links „Was anderes?“`);
  check(!(await tile.locator(".bg-accent.rounded-full").count()), `${wo} · ${size}: kein oranger Kreis`);
}

async function durchgehen(page, check, wo) {
  // Beispiel-Tag
  await hello(page);
  for (const size of ["XS", "S", "M"]) {
    await pruefen(page, check, `${wo} · Beispiel-Tag`, size);
    await essenPillen(page, check, `${wo} · Beispiel-Tag`, size);
  }
  // Familie mit Gericht, Vorrat und Kochidee
  await seedFamily(page, FAMILIE);
  for (const size of ["XS", "S", "M"]) {
    await pruefen(page, check, `${wo} · Familie`, size);
    await essenPillen(page, check, `${wo} · Familie`, size);
    // Im Haus in S/M (bei XS die nächste erlaubte: S) zeigt die Namen ganz
    {
      const haus = page.locator("[role=tabpanel]:not([inert]) [data-tile~=vorrat]");
      const hausText = await haus.innerText();
      // Feste Fläche (Raster): zwei Sachen + „Was koch ich daraus?“; jede gezeigte steht ganz da, nie „Würstc…“
      check(/Hähnchen/.test(hausText) && !/Würstc(?!hen)|…/.test(hausText), `${wo} · ${size}: Namen ganz in Im Haus (${hausText.replace(/\s+/g, " ")})`);
    }
  }
  // Langer Name (Tafel 134): „Gemüselasagne mit Béchamel“ ganz, in S und M
  await seedFamily(page, { ...FAMILIE, "wasgibts.wochenplan": { version: 3, weeks: { [WOCHE]: { Mittwoch: { kind: "text", title: LANG, category: "vegetarisch" } } } } });
  for (const size of ["S", "M"]) {
    await pruefen(page, check, `${wo} · langer Name`, size);
    check((await essen(page).locator("[data-titel]").innerText()).replace(/\s+/g, " ").replace(/\u00ad/g, "").trim() === LANG, `${wo} · ${size}: „${LANG}“ ganz`);
  }
  // Abends: Kachel zeigt morgen – Vorschlag „KOCHIDEE · MORGEN DO“ mit „Was anderes?“
  await seedFamily(page, FAMILIE);
  await page.clock.setFixedTime(new Date("2026-10-21T20:45:00+02:00"));
  for (const size of ["S", "M"]) {
    await pruefen(page, check, `${wo} · Familie abends`, size);
    await essenPillen(page, check, `${wo} · Familie abends`, size);
    const kopf = (await essen(page).locator("[data-kopf]").innerText()).trim();
    check(/^(Kochidee · Morgen Do|Morgen · Do|Essen)$/i.test(kopf), `${wo} · ${size}: Statuszeile abends „${kopf}“`);
  }
  await page.clock.setFixedTime(new Date("2026-10-21T10:30:00+02:00"));
}

export const nichtsAbgeschnitten = async (page, check, device) => {
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
