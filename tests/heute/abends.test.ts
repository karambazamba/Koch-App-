// Tafel 98 „Abends: nichts doppelt“: kein Streifen „Ausblick morgen“ mehr,
// die Kacheln zeigen morgen, die Jetzt-Karte sagt abends EIN Thema in fester
// Reihenfolge a–e (Jahrestag/Geburtstag, Regen mit Plan, früher Termin, Essen
// mit Vorlauf, sonst ruhig). Ganztägige Termine: „Ganztägig“, besondere Tage
// mit Herz bzw. Geschenk in Rosé.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { jetztTopics, TITLE_MAX, type JetztInput, type JetztTermin } from "@/lib/heute/jetztTopics";
import { isAbend } from "@/lib/heute/abendThema";
import { kidsWay, vorlaufVon } from "@/lib/heute/abendDaten";
import { vorlaufHinweis } from "@/lib/essen/vorlauf";
import { anlassOf, eigenerJahrestag, ganztagAnzeige } from "@/lib/kalender/anlass";
import { HOME_TILES } from "@/lib/core/homeLayout";
import { STORAGE } from "@/lib/core/storage";
import { termineTile } from "@/lib/heute/termineKachel";
import { foodTileView } from "@/lib/heute/essenKachel";
import { jetztInput as base, jetztTermin as termin, termin as dayTermin } from "../helpers";
import { itemsForDay } from "@/lib/kalender/model";

const H = (h: number, m = 0) => h * 60 + m;
/** Morgen ist Do, 22.10.2026 (Werktag) */
const MORGEN = "2026-10-22";
const t = (title: string, time: string, extra: Partial<JetztTermin> = {}) => termin(title, time, extra, MORGEN);
const abend = (items: JetztTermin[], extra: Partial<JetztInput> = {}) => base(H(20), { tomorrow: { label: "Morgen · Do", date: MORGEN, items }, ...extra });
const one = (x: JetztInput) => {
  const list = jetztTopics(x);
  expect(list).toHaveLength(1);
  return list[0];
};

describe("Abends: kein Streifen „Ausblick morgen“", () => {
  it("keine Kachel „morgen“ in der Auswahl, Startseite rendert keinen Streifen", () => {
    expect(HOME_TILES.map((x) => x.id as string)).not.toContain("morgen");
    expect(HOME_TILES.some((x) => /ausblick/i.test(x.label))).toBe(false);
    for (const f of ["src/components/heute/TodayPage.tsx", "src/components/heute/HomeTiles.tsx", "src/components/heute/TilePicker.tsx"]) expect(readFileSync(f, "utf8")).not.toMatch(/Ausblick|MorgenTile/);
  });

  it("Speicher-Verzeichnis kennt die neue Version der Startseite", () => {
    expect(STORAGE.find((k) => k.key === "wasgibts.startseite")?.version).toBe(8);
  });

  it("die Kacheln zeigen abends schon morgen (Termine „Morgen · Do“, Essen morgen)", () => {
    const morgen = itemsForDay([dayTermin({ title: "Hochzeitstag", date: MORGEN, start: "" }), dayTermin({ title: "Kurosch und Tim", date: MORGEN, start: "09:15" })], MORGEN, "2026-10-21");
    expect(termineTile([], morgen, MORGEN, H(19, 3)).label).toBe("Morgen · Do");
    expect(foodTileView({ over: true, today: null, tomorrow: "Gemüselasagne", idea: null, away: null, ideas: 0 })).toEqual({ kind: "geplant", title: "Gemüselasagne", when: "morgen" });
  });
});

describe("Jetzt-Karte abends: EIN Thema in fester Reihenfolge", () => {
  it("a) Hochzeitstag morgen: „euer“, allein „dein“, mit Herz-Thema", () => {
    const x = abend([t("Hochzeitstag", "", { anlass: "jahrestag" }), t("Zahnarzt", "08:00")], { tomorrowRain: true, kidsWay: "Kita" });
    expect(one(x)).toMatchObject({ kind: "jahrestag", title: "Morgen ist euer Hochzeitstag.", detail: "Was Schönes geplant?", button: "Erledigt" });
    expect(one({ ...x, solo: true }).title).toBe("Morgen ist dein Hochzeitstag.");
    // Jahrestag anderer: kein „euer“
    expect(one(abend([t("Hochzeitstag Oma und Opa", "", { anlass: "jahrestag" })])).title).toBe("Morgen: Hochzeitstag Oma und Opa");
  });

  it("a) Geburtstag morgen mit Namen", () => {
    expect(one(abend([t("Geburtstag Lisa", "", { anlass: "geburtstag" })]))).toMatchObject({ kind: "geburtstag", title: "Morgen hat Lisa Geburtstag." });
  });

  it("b) Regen morgen früh nur mit Plan: Kita (werktags) oder früher Termin", () => {
    expect(one(abend([], { tomorrowRain: true, kidsWay: "Kita" }))).toMatchObject({ kind: "morgenwetter", title: "Morgen früh Regen.", detail: "Jacken für die Kita raus." });
    expect(one(abend([], { tomorrowRain: true, kidsWay: "Schule" })).detail).toBe("Jacken für die Schule raus.");
    // Ohne Plan kein Wetter
    expect(one(abend([], { tomorrowRain: true })).kind).toBe("abend");
    // Samstag: keine Kita
    const sa = base(H(20), { today: "2026-10-23", tomorrow: { label: "Morgen · Sa", date: "2026-10-24", items: [] }, tomorrowRain: true, kidsWay: "Kita" });
    expect(one(sa).kind).toBe("abend");
    // Früher Termin als Plan
    expect(one(abend([t("Zahnarzt", "08:00")], { tomorrowRain: true }))).toMatchObject({ kind: "morgenwetter", detail: "Schirm für Zahnarzt bereitlegen?" });
  });

  it("c) früher Termin vor 9 Uhr: Wecker eine Stunde vorher", () => {
    expect(one(abend([t("Zahnarzt", "08:00")]))).toMatchObject({ kind: "frueh", title: "Morgen 8 Uhr Zahnarzt.", detail: "Wecker auf 7?" });
    expect(one(abend([t("Flug", "07:30")]))).toMatchObject({ title: "Morgen 7:30 Flug.", detail: "Wecker auf 6:30?" });
    expect(one(abend([t("Kurosch und Tim", "09:15")])).kind).toBe("abend");
  });

  it("d) Essen mit Vorlauf", () => {
    const x = abend([t("Kurosch und Tim", "09:15")], { tomorrowDish: { name: "Gulasch", prep: "Fleisch heute aus dem Gefrierfach." } });
    expect(one(x)).toMatchObject({ kind: "vorlauf", title: "Morgen gibt’s Gulasch.", detail: "Fleisch heute aus dem Gefrierfach." });
    // früher Termin geht vor
    expect(one({ ...x, tomorrow: { ...x.tomorrow, items: [t("Zahnarzt", "08:00")] } }).kind).toBe("frueh");
  });

  it("e) sonst: „Morgen ist ruhig. Schönen Abend.“ – mit Terminen „alles sortiert“", () => {
    expect(one(abend([]))).toMatchObject({ kind: "abend", title: "Morgen ist ruhig.", detail: "Schönen Abend.", button: null });
    expect(one(abend([t("Kurosch und Tim", "09:15")])).title).toBe("Für morgen ist alles sortiert.");
  });

  it("weggelegt (Erledigt) → das nächste in der Reihenfolge", () => {
    const x = abend([t("Hochzeitstag", "", { anlass: "jahrestag" }), t("Zahnarzt", "08:00")]);
    expect(one({ ...x, hidden: [`jahrestag:Hochzeitstag@${MORGEN}`] }).kind).toBe("frueh");
  });

  it("nie ein Thema, das eine Kachel schon zeigt (Pinnwand, Aufgaben, Termin-Zeile, Einkauf)", () => {
    const x = abend([t("Kurosch und Tim", "09:15")], {
      pin: { id: "p", author: "Lisa", text: "Hi", when: "19:50" },
      urgent: [{ key: "a", title: "Volksbank Ausgleich" }],
      shop: { shop: "Edeka", names: ["Milch", "Brot"] },
      weekCheck: "2026-10-19",
    });
    const t1 = one(x);
    expect(t1.kind).toBe("abend");
    expect(t1.title).not.toMatch(/Kurosch|Lisa|Volksbank|Edeka|Morgen · /);
  });

  it("Laufendes geht vor (Timer), trotzdem nur eins", () => {
    expect(one(abend([t("Zahnarzt", "08:00")], { timer: { name: "Tee", left: "2 Min" }, tiles: [] })).kind).toBe("timer");
  });

  it("wann abends: ab Feierabend, wenn heute nichts mehr kommt; ab 19 Uhr sowieso; nachts nicht", () => {
    expect(isAbend(base(H(17, 30)))).toBe(false);
    expect(isAbend(base(H(17, 30), { evening: true }))).toBe(true);
    expect(isAbend(base(H(17, 30), { evening: true, upcoming: [termin("Elternabend", "19:30")] }))).toBe(false);
    expect(isAbend(base(H(17, 30), { evening: true, dish: { name: "Pasta", clock: "18:30", minutes: 30, ready: true, missing: [] } }))).toBe(false);
    expect(isAbend(base(H(19)))).toBe(true);
    expect(isAbend(base(H(22, 30)))).toBe(false);
    expect(isAbend(base(H(5)))).toBe(false);
  });

  it("nachts (22–6) wie bisher nur Erinnerung/Timer – kein Abend-Thema", () => {
    const night = base(H(23), { tomorrow: { label: "Morgen · Do", date: MORGEN, items: [t("Zahnarzt", "08:00")] }, reminder: { key: "r", text: "Müll raus" } });
    expect(jetztTopics(night).map((x) => x.kind)).toEqual(["erinnerung"]);
    expect(jetztTopics({ ...night, reminder: null }).map((x) => x.kind)).toEqual(["ruhig"]);
  });

  it("Zeile 1 ≤ 32 Zeichen, nie „°“, keine Druck-Wörter, keine Emojis, nie Gedankenstrich", () => {
    const xs = [
      abend([t("Hochzeitstag", "", { anlass: "jahrestag" })]),
      abend([t("Geburtstag von Großtante Hildegard", "", { anlass: "geburtstag" })]),
      abend([], { tomorrowRain: true, kidsWay: "Kita" }),
      abend([t("Zahnarzt Jonne mit Versichertenkarte", "08:00")]),
      abend([], { tomorrowDish: { name: "Rinderrouladen mit Rotkohl und Klößen", prep: "Heute schon marinieren, dann zieht’s über Nacht." } }),
      abend([]),
    ];
    for (const x of xs) {
      const top = one(x);
      expect(top.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(`${top.title} ${top.detail}`).not.toMatch(/°|vergiss|musst|solltest|fehlt|offen|überfällig|\p{Extended_Pictographic}| – /iu);
    }
  });
});

describe("Essen mit Vorlauf", () => {
  it("Fleisch/Fisch aus dem Tiefkühler, Marinieren über Nacht, Teig über Nacht", () => {
    expect(vorlaufHinweis({ ingredients: ["Rindergulasch", "Zwiebeln"], steps: ["Anbraten"], frozen: ["Rindergulasch"] })).toBe("Rindergulasch heute aus dem Gefrierfach.");
    expect(vorlaufHinweis({ ingredients: ["TK-Lachs", "Reis"], steps: [], frozen: [] })).toBe("Lachs heute aus dem Gefrierfach.");
    // TK-Erbsen brauchen keinen Vorlauf
    expect(vorlaufHinweis({ ingredients: ["Erbsen"], steps: [], frozen: ["Erbsen"] })).toBeNull();
    expect(vorlaufHinweis({ ingredients: ["Hähnchen"], steps: ["Hähnchen über Nacht marinieren."], frozen: [] })).toBe("Heute schon marinieren, dann zieht’s über Nacht.");
    expect(vorlaufHinweis({ ingredients: ["Hähnchen"], steps: ["15 Minuten marinieren."], frozen: [] })).toBeNull();
    expect(vorlaufHinweis({ ingredients: ["Mehl"], steps: ["Teig 12 Stunden gehen lassen."], frozen: [] })).toBe("Teig heute schon ansetzen, dann geht er über Nacht.");
    expect(vorlaufHinweis({ ingredients: ["Mehl"], steps: ["Teig 1 Stunde gehen lassen."], frozen: [] })).toBeNull();
  });

  it("Gericht von morgen aus dem Plan (nur mit Rezept)", () => {
    const recipe = { id: "r1", title: "Gulasch", ingredients: [{ name: "Rindfleisch" }], steps: ["Schmoren"] };
    const tomorrow = { away: false, paused: false, slot: { entry: { kind: "recipe", recipeId: "r1", title: "Gulasch" } } };
    const data = { tomorrow, recipes: { r1: recipe } } as unknown as Parameters<typeof vorlaufVon>[0];
    expect(vorlaufVon(data, [{ name: "Rindfleisch", place: "tiefkuehler" }] as never)).toEqual({ name: "Gulasch", prep: "Rindfleisch heute aus dem Gefrierfach." });
    expect(vorlaufVon(data, [{ name: "Rindfleisch", place: "kuehlschrank" }] as never)).toBeNull();
    expect(vorlaufVon({ ...data, tomorrow: undefined }, [])).toBeNull();
  });

  it("Weg der Kinder: Kita vor Schule, ohne Kinder keiner", () => {
    expect(kidsWay([{ role: "erwachsen" }])).toBeNull();
    expect(kidsWay([{ role: "kind", ageGroup: "schulkind" }])).toBe("Schule");
    expect(kidsWay([{ role: "kind", ageGroup: "schulkind" }, { role: "kind", ageGroup: "kitakind" }])).toBe("Kita");
  });
});

describe("Ganztägige Termine", () => {
  it("„Ganztägig“ statt „Tag“; besondere Tage mit Geschenk bzw. Herz in Rosé", () => {
    expect(ganztagAnzeige("Elternsprechtag", null, false)).toEqual({ symbol: null, text: "Ganztägig", rose: false });
    expect(ganztagAnzeige("Hochzeitstag", null, false)).toEqual({ symbol: "Heart", text: "Ganztägig", rose: true });
    expect(ganztagAnzeige("Lisa", "Geburtstag", false)).toEqual({ symbol: "Gift", text: "Ganztägig", rose: true });
    // halbe Kachel: nur das Symbol
    expect(ganztagAnzeige("Ausflug", null, true)).toEqual({ symbol: "CalendarDays", text: null, rose: false });
    expect(readFileSync("src/components/heute/MiniCards.tsx", "utf8")).not.toMatch(/: "Tag"/);
  });

  it("Anlass am Stichwort oder Etikett", () => {
    expect(anlassOf("Omas Geburtstag")).toBe("geburtstag");
    expect(anlassOf("Unser Jahrestag")).toBe("jahrestag");
    expect(anlassOf("Feier", "Hochzeitstag")).toBe("jahrestag");
    expect(anlassOf("Zahnarzt")).toBeNull();
    expect(eigenerJahrestag("Unser Hochzeitstag")).toBe("Hochzeitstag");
    expect(eigenerJahrestag("Hochzeitstag Oma und Opa")).toBeNull();
  });
});
