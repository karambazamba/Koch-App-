// A-040 „Einkaufsliste nur mit Namen“ (Tafel 127) und A-041 „Abhaken wie
// Aufgaben, Mia merkt sich den Laden“ (Tafel 128): Abhaken (1 s, zurück,
// „Im Wagen“), Laden lernen (Tomaten 2× bei Rewe → „wie immer“, Korrektur,
// 90-Tage-Regel), „Oft bei Rewe“, Löschen in den Einstellungen, Wochenplan
// als Angebot („Alle dazu“, Salz blass), Migration v7 → v8 und die Tipps
// beim ersten Mal (je Stelle genau einmal, „Alles klar“, zurückholen).
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import type { Recipe } from "@/lib/essen/cookbook";
import type { PlanDay, PlanWeek, ResolvedEntry } from "@/lib/essen/mealPlan";
import type { AssistantData } from "@/lib/begleitung/ops";
import { at, atFresh, fakeWindow } from "../helpers";

const W = "2026-10-19";
const T = "2026-10-20";
const KEY = "wasgibts.einkaufsliste";
const read = (f: string) => readFileSync(f, "utf8");
const EMPTY_WEEK = { weekStart: W, days: [] } as unknown as PlanWeek;

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
beforeEach(async () => {
  at(`${T}T17:00`);
  vi.resetModules();
  await atFresh(`${T}T17:00`);
  w = fakeWindow();
});
afterEach(() => vi.useRealTimers());

const liste = async () => {
  const { buildShoppingList } = await import("@/lib/einkauf/buildList");
  const s = saved();
  return buildShoppingList(EMPTY_WEEK, {}, s.weeks[W], s);
};

/** Auf der Laden-Seite von `shop` „name“ draufsetzen und abhaken (wie die Seite: `abhakenAblauf`) */
async function beiAbhaken(name: string, shop: string) {
  const { addManualItem } = await import("@/lib/einkauf/listEdits");
  const { abhakenAblauf } = await import("@/lib/einkauf/wagen/useAbhaken");
  addManualItem(W, { name, amount: "", section: "obst-gemuese" });
  const item = (await liste()).items.find((i) => i.name === name && !i.checked)!;
  abhakenAblauf(() => {}).tick(item, { weekStart: W, today: T, shop });
}

describe("Abhaken wie bei Aufgaben (A-041, Tafel 128 Bild 1–2)", () => {
  it("Häkchen, 1 s stehen, dann weg (0,8 s) in „Im Wagen“; die Zeile ist danach nur dort", async () => {
    vi.useFakeTimers();
    const { addManualItem } = await import("@/lib/einkauf/listEdits");
    const { abhakenAblauf } = await import("@/lib/einkauf/wagen/useAbhaken");
    const { wagenTeilen } = await import("@/lib/einkauf/wagen/wagen");
    addManualItem(W, { name: "Tomaten", amount: "", section: "obst-gemuese" });
    let stand = { bleibt: [] as string[], gleitet: [] as string[] };
    const ablauf = abhakenAblauf((s) => (stand = s));
    const REWE = { weekStart: W, today: T, shop: "Rewe" };
    const tomaten = (await liste()).items[0];
    ablauf.tick(tomaten, REWE);
    expect(saved().weeks[W].manual[0].done).toBe(true);
    expect(stand).toEqual({ bleibt: [tomaten.key], gleitet: [] });
    // solange sie steht, bleibt sie oben (nicht im Wagen)
    expect(wagenTeilen((await liste()).items, stand.bleibt).hier.map((i) => i.name)).toEqual(["Tomaten"]);
    vi.advanceTimersByTime(999);
    expect(stand.gleitet).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(stand.gleitet).toEqual([tomaten.key]);
    vi.advanceTimersByTime(800);
    expect(stand).toEqual({ bleibt: [], gleitet: [] });
    const { hier, wagen } = wagenTeilen((await liste()).items, stand.bleibt);
    expect(hier).toEqual([]);
    expect(wagen.map((i) => i.name)).toEqual(["Tomaten"]);
  });

  it("nochmal tippen in der Sekunde = zurück (Haken weg, nichts gemerkt, nichts gleitet)", async () => {
    vi.useFakeTimers();
    const { addManualItem } = await import("@/lib/einkauf/listEdits");
    const { abhakenAblauf } = await import("@/lib/einkauf/wagen/useAbhaken");
    addManualItem(W, { name: "Milch", amount: "", section: "kuehlregal" });
    let stand = { bleibt: [] as string[], gleitet: [] as string[] };
    const ablauf = abhakenAblauf((s) => (stand = s));
    const REWE = { weekStart: W, today: T, shop: "Rewe" };
    ablauf.tick((await liste()).items[0], REWE);
    expect(saved().learned.milch).toMatchObject({ shop: "Rewe", n: 1, am: T });
    vi.advanceTimersByTime(500);
    ablauf.tick((await liste()).items[0], REWE);
    expect(saved().weeks[W].manual[0].done).toBe(false);
    expect(saved().learned.milch).toBeUndefined();
    vi.advanceTimersByTime(2000);
    expect(stand).toEqual({ bleibt: [], gleitet: [] });
  });

  it("Seite: „Im Wagen ⌄“ zugeklappt, ohne Zahl, unter der Liste; kein Durchstreichen; Gleiten nur transform/opacity", () => {
    const laden = read("src/components/einkauf/LadenSeite.tsx");
    expect(laden).toMatch(/aria-label="Im Wagen"/);
    expect(laden).toMatch(/useState\(false\)/);
    expect(laden).toMatch(/\{wagenOffen && <ul/);
    // „Im Wagen“ steht nach der Liste und vor „Was noch bei …?“
    expect(laden.indexOf('aria-label="Im Wagen"')).toBeGreaterThan(laden.indexOf("{hier.map(row)}"));
    expect(laden.indexOf('aria-label="Im Wagen"')).toBeLessThan(laden.indexOf("data-was-noch"));
    expect(read("src/components/einkauf/seite/LadenZeile.tsx")).not.toMatch(/line-through/);
    expect(laden).toMatch(/transition-\[transform,opacity\] duration-\[800ms\] ease-\[cubic-bezier\(\.16,1,\.3,1\)\]/);
    // gleich überall: die Seite nutzt den einen Ablauf
    expect(laden).toMatch(/useAbhaken\(/);
  });
});

describe("Mia merkt sich den Laden (A-041, Tafel 128 Bild 3)", () => {
  it("Tomaten 2× bei Rewe abgehakt → „Tomaten auf die Liste“ landet bei Rewe, Karte „Rewe · wie immer“", async () => {
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Rewe", "Edeka"]);
    await beiAbhaken("Tomaten", "Rewe");
    await beiAbhaken("Tomate", "Rewe");
    expect(saved().learned.tomaten).toMatchObject({ shop: "Rewe", n: 2, am: T });
    // Mia setzt „Tomaten“ ohne Laden drauf
    const { applyOps } = await import("@/lib/begleitung/ops");
    const { ergebnisse } = await import("@/lib/begleitung/ergebnis");
    const op = { id: "op1", type: "add_shopping" as const, weekStart: "2026-10-26", name: "Tomaten", amount: "", section: "obst-gemuese" as const };
    const data = { shopping: {} } as unknown as AssistantData;
    const neu = applyOps(data, [op]).data.shopping["2026-10-26"];
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const item = buildShoppingList(EMPTY_WEEK, {}, neu, saved()).items[0];
    expect(item).toMatchObject({ name: "Tomaten", shop: "Rewe", amount: "" });
    const karte = ergebnisse([op])[0];
    expect(karte.laden).toEqual({ sache: "Tomaten", gesagt: null });
    const { ladenHerkunft } = await import("@/lib/einkauf/shopRules");
    const { kartenLaden, kartenLadenText, selbstGewaehltText } = await import("@/lib/einkauf/merken/karte");
    const laden = kartenLaden(ladenHerkunft("Tomaten", saved()), karte.laden!.gesagt)!;
    expect(kartenLadenText(laden)).toBe("Rewe · wie immer");
    expect(selbstGewaehltText(laden.shop)).toBe("Hab Rewe genommen, wie letztes Mal.");
    // Gesagter Laden: ohne „wie immer“
    expect(kartenLadenText(kartenLaden(ladenHerkunft("Tomaten", saved()), "Rewe")!)).toBe("Rewe");
  });

  it("Laden geändert („wie immer ⌄“ → Edeka) → das nächste Mal gleich bei Edeka; Rückgängig", async () => {
    await beiAbhaken("Tomaten", "Rewe");
    await beiAbhaken("Tomaten", "Rewe");
    const { ladenKorrigieren, shopChoice, ladenHerkunft } = await import("@/lib/einkauf/shopRules");
    const zurueck = ladenKorrigieren("Tomaten", "Edeka");
    expect(shopChoice("Tomaten", saved())).toBe("Edeka");
    expect(ladenHerkunft("Tomaten", saved())).toEqual({ shop: "Edeka", von: "gelernt" });
    // auch eine feste Regel zieht mit
    const { setShopRule } = await import("@/lib/einkauf/shopRules");
    setShopRule("Butter", "Lidl");
    ladenKorrigieren("Butter", "Rewe");
    expect(shopChoice("Butter", saved())).toBe("Rewe");
    zurueck();
    expect(shopChoice("Tomaten", saved())).toBe("Rewe");
  });

  it("90-Tage-Regel: einmal vor über 90 Tagen gekauft = nie gemerkt (verblasst still); öfter oder kürzlich gilt", async () => {
    const { gilt, gelernterLadenFuer, abgehakt, gelerntListe } = await import("@/lib/einkauf/merken/gelernt");
    expect(gilt({ shop: "Rewe", n: 1, am: "2026-07-22" }, T)).toBe(true);
    expect(gilt({ shop: "Rewe", n: 1, am: "2026-07-21" }, T)).toBe(false);
    expect(gilt({ shop: "Rewe", n: 2, am: "2025-01-01" }, T)).toBe(true);
    const alt = { quark: { shop: "Rewe", n: 1, am: "2026-05-01" }, milch: { shop: "Rewe", n: 3, am: "2026-05-01" } };
    expect(gelernterLadenFuer(alt, "Quark", T)).toBeNull();
    expect(gelernterLadenFuer(alt, "Milch", T)).toBe("Rewe");
    expect(gelerntListe(alt, T).map((g) => g.sache)).toEqual(["Milch"]);
    // beim nächsten Merken fällt Verblasstes still weg
    expect(Object.keys(abgehakt(alt, "Brot", "Rewe", T)).sort()).toEqual(["brot", "milch"]);
    // auch die Liste nimmt den verblassten Laden nicht mehr
    const { shopChoice } = await import("@/lib/einkauf/shopRules");
    expect(shopChoice("Quark", { itemShops: {}, learned: alt }, T)).toBeNull();
  });

  it("„Oft bei Rewe“: am häufigsten dort abgehakt, nicht was draufsteht, höchstens 8, Gleichstand neueste zuerst; einmal der Hinweis", async () => {
    const { oftBeiGelernt, OFT_MAX } = await import("@/lib/einkauf/merken/gelernt");
    const learned = {
      tomaten: { shop: "Rewe", n: 4, am: "2026-10-01" },
      milch: { shop: "Rewe", n: 2, am: "2026-10-10" },
      brot: { shop: "Rewe", n: 2, am: "2026-10-18" },
      quark: { shop: "Edeka", n: 9, am: "2026-10-18" },
      ...Object.fromEntries(["a", "b", "c", "d", "e", "f", "g"].map((x) => [`sache ${x}`, { shop: "rewe", n: 1, am: "2026-10-0" + "123456789"["abcdefg".indexOf(x)] }])),
    };
    const oft = oftBeiGelernt(learned, "Rewe", [], T);
    expect(OFT_MAX).toBe(8);
    expect(oft).toHaveLength(8);
    expect(oft.slice(0, 3)).toEqual(["Tomaten", "Brot", "Milch"]);
    expect(oft).not.toContain("Quark");
    // was schon draufsteht (auch Einzahl), fehlt
    expect(oftBeiGelernt(learned, "Rewe", ["Tomate"], T)).not.toContain("Tomaten");
    const { merkenText } = await import("@/lib/einkauf/merken/karte");
    expect(merkenText("Rewe")).toBe("Merk ich mir, wenn du bei Rewe abhakst.");
    const laden = read("src/components/einkauf/LadenSeite.tsx");
    expect(laden).toMatch(/oftBeiGelernt\(settings\.learned, shop, offeneNamen, todayIso\)/);
    expect(laden).toMatch(/shop && merkenGesehen === false && \(/);
  });

  it("Einstellungen → Mia → „Was ich mir gemerkt hab“: „Tomaten → Rewe“ in eigener Gruppe, Löschen wirkt", async () => {
    await beiAbhaken("Tomaten", "Rewe");
    const { merkListe, MERK_GRUPPEN } = await import("@/lib/mia/denktmit/merken");
    const { EMPTY_DENKT } = await import("@/lib/mia/denktmit/store");
    const { gelerntListe } = await import("@/lib/einkauf/merken/gelernt");
    const zeilen = merkListe(EMPTY_DENKT, { butter: "Lidl" }, [], gelerntListe(saved().learned, T));
    expect(zeilen.find((z) => z.art === "gelernt")).toMatchObject({ key: "tomaten", gruppe: "Wo du was kaufst", titel: "Tomaten → Rewe" });
    expect(MERK_GRUPPEN).toContain("Wo du was kaufst");
    // eine feste Regel steht nur einmal (unter „Läden“)
    expect(merkListe(EMPTY_DENKT, { tomaten: "Rewe" }, [], gelerntListe(saved().learned, T)).filter((z) => z.titel.startsWith("Tomaten"))).toHaveLength(1);
    const { gelerntVergessen, shopChoice } = await import("@/lib/einkauf/shopRules");
    gelerntVergessen("Tomaten");
    expect(saved().learned.tomaten).toBeUndefined();
    expect(shopChoice("Tomaten", saved())).toBeNull();
    const view = read("src/components/einstellungen/settings/MiaMerktView.tsx");
    expect(view).toMatch(/e\.art === "gelernt" \? gelerntVergessen\(e\.key\)/);
  });
});

// --- A-040: Wochenplan als Angebot ---------------------------------------------

const recipe = (id: string, title: string, ingredients: [number | null, string, string][]) =>
  ({ id, title, servings: 4, kind: "kochen", ingredients: ingredients.map(([amount, unit, name], i) => ({ id: `${id}${i}`, amount, unit, name })) }) as unknown as Recipe;
const entry = (title: string, recipeId: string): ResolvedEntry => ({ origin: "eigen", stored: { kind: "recipe", recipeId, title, category: "fleisch" }, title, category: null, recipeId, double: false });
const day = (weekday: string, e: ResolvedEntry): PlanDay =>
  ({ weekday, date: W, away: false, cheat: false, slot: { key: weekday, entry: e, hint: null, hasDerived: false }, mealTime: "abends", persons: 4, note: "", leftovers: null, paused: false, weekend: null }) as PlanDay;
const week = (days: PlanDay[]): PlanWeek => ({ weekStart: W, days, hasPlanRules: false, planned: 0, total: 7, counts: { fleisch: { planned: 0, target: 0 }, vegetarisch: { planned: 0, target: 0 }, fisch: { planned: 0, target: 0 } } });
const RECIPES = {
  lasagne: recipe("lasagne", "Gemüselasagne", [[200, "g", "Spinat"], [125, "g", "Mozzarella"], [2, "Stück", "Lasagneplatten"], [1, "TL", "Salz"]]),
  curry: recipe("curry", "Curry", [[400, "g", "Tomaten"]]),
};
const PLAN = week([day("Freitag", entry("Gemüselasagne", "lasagne")), day("Samstag", entry("Curry", "curry"))]);

describe("Wochenplan als Angebot (A-040, Tafel 127)", () => {
  it("Plan-Zutaten stehen nicht von selbst auf der Liste, sondern im Angebot; Kopf „Gemüselasagne · Fr · Curry · Sa“; Salz blass", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { angebotFuer, alleDazu } = await import("@/lib/einkauf/angebot/angebot");
    const list = buildShoppingList(PLAN, RECIPES, undefined, undefined, { angebot: true });
    expect(list.items).toEqual([]);
    expect(list.angebot.map((i) => i.name)).toEqual(["Spinat", "Mozzarella", "Lasagneplatten", "Salz", "Tomaten"]);
    const a = angebotFuer("Rewe", list.angebot);
    expect(a.kopf).toBe("Gemüselasagne · Fr · Curry · Sa");
    expect(a.chips.find((c) => c.item.name === "Salz")?.blass).toBe(true);
    expect(a.chips.at(-1)?.item.name).toBe("Salz");
    expect(alleDazu(a).map((i) => i.name)).not.toContain("Salz");
    // „immer auf die Liste“ macht Salz normal
    expect(angebotFuer("Rewe", list.angebot, ["salz"]).chips.find((c) => c.item.name === "Salz")?.blass).toBe(false);
    // anderer gelernter Laden: nur dort angeboten
    const mitLaden = buildShoppingList(PLAN, RECIPES, undefined, { products: {}, itemShops: {}, learned: { tomaten: { shop: "Edeka", n: 2, am: T } } }, { angebot: true });
    expect(angebotFuer("Rewe", mitLaden.angebot).chips.map((c) => c.item.name)).not.toContain("Tomaten");
    expect(angebotFuer("Edeka", mitLaden.angebot).chips.map((c) => c.item.name)).toContain("Tomaten");
  });

  it("„Alle dazu“: Angebot weg (bis auf Salz), Zutaten ganz normal auf der Liste – ohne Gramm, ohne „für …“; wofür erst im Fenster", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { angebotFuer, alleDazu, alsEintrag, wofuer } = await import("@/lib/einkauf/angebot/angebot");
    const { addManualItem } = await import("@/lib/einkauf/listEdits");
    const vorher = buildShoppingList(PLAN, RECIPES, undefined, undefined, { angebot: true });
    for (const i of alleDazu(angebotFuer("Rewe", vorher.angebot))) addManualItem(W, alsEintrag(i));
    const s = saved();
    const nachher = buildShoppingList(PLAN, RECIPES, s.weeks[W], s, { angebot: true });
    expect(nachher.angebot.map((i) => i.name)).toEqual(["Salz"]);
    expect(nachher.items.map((i) => i.name).sort()).toEqual(["Lasagneplatten", "Mozzarella", "Spinat", "Tomaten"]);
    expect(nachher.items.every((i) => i.amount === "")).toBe(true);
    const spinat = nachher.items.find((i) => i.name === "Spinat")!;
    expect(s.weeks[W].manual.find((m: ManualItem) => m.name === "Spinat")).toMatchObject({ amount: "", dish: "Gemüselasagne", day: "Freitag", rezeptMenge: "200 g" });
    expect(wofuer(spinat)).toBe("für Gemüselasagne · Fr");
    expect(spinat.rezeptMenge).toBe("200 g");
    // die Zeile zeigt nur Symbol und Name (kein Hinweis), das Fenster zeigt wofür
    expect(read("src/components/einkauf/seite/LadenZeile.tsx")).not.toMatch(/hinweis/);
    const fenster = read("src/components/einkauf/seite/SacheFenster.tsx");
    expect(fenster).toMatch(/wofuer\(item\)/);
    expect(fenster).toMatch(/placeholder=\{`z\. B\. \$\{item\.packung \|\| "1 Packung"\}`\}/);
    expect(fenster).toContain("Von der Liste nehmen");
    expect(fenster).toMatch(/<Sheet /);
  });

  it("selbst gesagte Menge bleibt („2 Liter“), Rezeptmengen werden nie Menge auf der Liste", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { addManualItem } = await import("@/lib/einkauf/listEdits");
    addManualItem(W, { name: "Milch", amount: "2 Liter", section: "kuehlregal" });
    const s = saved();
    const list = buildShoppingList(PLAN, RECIPES, s.weeks[W], s);
    expect(list.items.find((i) => i.name === "Milch")?.amount).toBe("2 Liter");
    expect(list.items.filter((i) => i.name !== "Milch").every((i) => i.amount === "")).toBe(true);
  });
});

describe("Migration v7 → v8 (nichts geht verloren)", () => {
  const v7 = (extra: Partial<ShoppingListStore> = {}) => ({
    version: 7,
    weeks: {
      [W]: {
        manual: [
          { id: "a", name: "Lasagneplatten", amount: "1 Packung", section: "vorrat", done: false, rezeptMenge: "2 Stück", dish: "Lasagne" },
          { id: "b", name: "Sahne", amount: "3 Becher", section: "kuehlregal", done: false, rezeptMenge: "400 ml" },
          { id: "c", name: "Milch", amount: "2 Liter", section: "kuehlregal", done: false },
        ],
        checked: ["spinat|g"],
        have: [],
      },
    },
    products: {},
    shops: [],
    itemShops: {},
    staples: [],
    myShops: ["Rewe"],
    shopsAsked: true,
    shopRules: {},
    learned: { butter: { shop: "Rewe", n: 2 } },
    learnAsked: ["butter"],
    alwaysList: [],
    ...extra,
  });

  it("Gelerntes bekommt ein Datum, unsere Packungsmengen fallen weg (selbst geänderte bleiben), diese und nächste Woche rechnen wie bisher", async () => {
    const { migrateStore } = await import("@/lib/einkauf/listMigration");
    const { planAlsAngebot } = await import("@/lib/einkauf/buildList");
    const neu = migrateStore(v7())!;
    expect(neu.version).toBe(8);
    expect(neu.learned.butter).toEqual({ shop: "Rewe", n: 2, am: T });
    expect(neu.learnAsked).toEqual(["butter"]);
    const manual = neu.weeks[W].manual;
    expect(manual.find((m) => m.id === "a")).toMatchObject({ amount: "", rezeptMenge: "2 Stück", dish: "Lasagne" });
    expect(manual.find((m) => m.id === "b")?.amount).toBe("3 Becher");
    expect(manual.find((m) => m.id === "c")?.amount).toBe("2 Liter");
    expect(neu.weeks[W].checked).toEqual(["spinat|g"]);
    // was schon von selbst auf der Liste stand, bleibt (diese und die nächste Woche); danach Angebot
    expect(neu.angebotAb).toBe("2026-10-28");
    expect(planAlsAngebot(W, neu.angebotAb)).toBe(false);
    expect(planAlsAngebot("2026-10-26", neu.angebotAb)).toBe(false);
    expect(planAlsAngebot("2026-11-02", neu.angebotAb)).toBe(true);
    // neu angelegt: immer Angebot; v8 bleibt beim Laden, wie es ist
    expect(planAlsAngebot(W, "")).toBe(true);
    expect(migrateStore(neu)).toEqual(neu);
  });

  it("über den Speicher einmal zurückgeschrieben; Abgleich trägt Datum und Angebot weiter", async () => {
    w.localStorage.setItem(KEY, JSON.stringify(v7()));
    const { store } = await import("@/lib/einkauf/listStore");
    expect(store.load()?.version).toBe(8);
    expect(saved().angebotAb).toBe("2026-10-28");
    const { ADAPTERS } = await import("@/lib/konten/sync/docs");
    const adapter = ADAPTERS.find((a) => a.name === "einkauf")!;
    const back = adapter.fromDocs(adapter.toDocs(saved() as unknown as Record<string, unknown>), null) as unknown as ShoppingListStore;
    expect(back.version).toBe(8);
    expect(back.angebotAb).toBe("2026-10-28");
    expect(back.learned.butter.am).toBe(T);
    expect(adapter.upgrade!(saved() as unknown as Record<string, unknown>)).toBeNull();
  });
});

describe("Die Einkaufsliste stellt sich beim ersten Mal vor", () => {
  it("Texte: drei kurze Zeilen auf der Liste, eine Zeile auf der Laden-Seite (Laden eingesetzt), ohne Gedankenstriche", async () => {
    const { EINKAUF, einkaufLadenTipp } = await import("@/lib/mia/denktmit/seiten/einkauf");
    expect(EINKAUF.seite.split("\n")).toEqual(["Ich merk mir, wo du was kaufst.", "Sag einfach ‚Tomaten auf die Liste‘, den Laden such ich aus.", "Abgehakt ist weg. Fürs Rezept leg ich dir Zutaten oben hin."]);
    expect(einkaufLadenTipp("Rewe")).toBe("Abhaken, was im Wagen liegt. Ich merk mir das für Rewe.");
    for (const t of [EINKAUF.seite, einkaufLadenTipp("Rewe")]) expect(t).not.toMatch(/ – | - |—/);
    const { tidyMiaText } = await import("@/lib/begleitung/tidy");
    expect(tidyMiaText(EINKAUF.seite)).toBe(EINKAUF.seite);
  });

  it("genau einmal je Stelle (Liste, Laden-Seite – nicht je Laden); „Alles klar“ schließt; „Tipps nochmal zeigen“ holt sie zurück", async () => {
    const { ersterBesuch } = await import("@/lib/mia/denktmit/vorstellen");
    const { loadDenkt, seiteBesucht } = await import("@/lib/mia/denktmit/store");
    const { EINKAUF_LADEN_SEITE, EINKAUF_LISTE_SEITE } = await import("@/lib/mia/denktmit/seiten/einkauf");
    expect(ersterBesuch(loadDenkt(), EINKAUF_LISTE_SEITE)).toBeTruthy();
    expect(ersterBesuch(loadDenkt(), EINKAUF_LADEN_SEITE)).toBeTruthy();
    // „Alles klar“ (bzw. Verlassen) = besucht
    seiteBesucht(EINKAUF_LISTE_SEITE);
    expect(ersterBesuch(loadDenkt(), EINKAUF_LISTE_SEITE)).toBeNull();
    expect(ersterBesuch(loadDenkt(), EINKAUF_LADEN_SEITE)).toBeTruthy();
    seiteBesucht(EINKAUF_LADEN_SEITE);
    expect(ersterBesuch(loadDenkt(), EINKAUF_LADEN_SEITE)).toBeNull();
    // Einmal-Hinweise der Laden-Seite und der Ergebnis-Karte
    const { hintSeen, markHintSeen } = await import("@/lib/core/hints");
    markHintSeen("einkauf-merken");
    markHintSeen("einkauf-laden-gewaehlt");
    markHintSeen("mikro-gefragt");
    const { tippsNochmalZeigen } = await import("@/lib/mia/denktmit/tipps");
    tippsNochmalZeigen();
    expect(ersterBesuch(loadDenkt(), EINKAUF_LISTE_SEITE)).toBeTruthy();
    expect(ersterBesuch(loadDenkt(), EINKAUF_LADEN_SEITE)).toBeTruthy();
    expect(hintSeen("einkauf-merken")).toBe(false);
    expect(hintSeen("einkauf-laden-gewaehlt")).toBe(false);
    // Fragen bleiben beantwortet
    expect(hintSeen("mikro-gefragt")).toBe(true);
  });

  it("Oberfläche: Seiten-Tipp oben (Mia-Gesicht ohne Ring, „Alles klar“), auch am Beispiel-Tag; Knopf in Einstellungen → Mia", () => {
    expect(read("src/components/einkauf/EinkaufSeite.tsx")).toMatch(/tipp=\{\{ seite: EINKAUF_LISTE_SEITE \}\}/);
    expect(read("src/components/einkauf/LadenSeite.tsx")).toMatch(/tipp=\{\{ seite: EINKAUF_LADEN_SEITE, text: einkaufLadenTipp\(shop\) \}\}/);
    const besuch = read("src/components/begleitung/denktmit/ErsterBesuch.tsx");
    expect(besuch).not.toMatch(/demo|beispiel/i);
    expect(read("src/components/begleitung/denktmit/SeitenTipp.tsx")).toMatch(/whitespace-pre-line/);
    expect(read("src/components/einstellungen/settings/MiaView.tsx")).toMatch(/title="Tipps nochmal zeigen"/);
    // Ergebnis-Karte: einmal „Hab Rewe genommen, wie letztes Mal.“
    const karte = read("src/components/einkauf/merken/ErgebnisLaden.tsx");
    expect(karte).toMatch(/!hintSeen\("einkauf-laden-gewaehlt"\)/);
    expect(karte).toMatch(/selbstGewaehltText\(laden\.shop\)/);
  });
});


// --- A-046 → A-040: „Nehmen“ in der Rezept-Vorschau bietet die Zutaten an -------

describe("„Nehmen“ bietet die Zutaten an (Wochenplan-Angebot, A-040/A-046)", () => {
  it("nur die Zutaten dieses Gerichts, ohne Grundsachen; `needs` der Vorschau grenzt ein; Frage ohne „…“", async () => {
    const { buildShoppingList } = await import("@/lib/einkauf/buildList");
    const { angebotFrage, angebotFuerGericht } = await import("@/lib/einkauf/angebot/angebot");
    const list = buildShoppingList(PLAN, RECIPES, undefined, undefined, { angebot: true });
    const items = angebotFuerGericht(list.angebot, "Gemüselasagne");
    expect(items.map((i) => i.name)).toEqual(["Spinat", "Mozzarella", "Lasagneplatten"]);
    expect(angebotFuerGericht(list.angebot, "Gemüselasagne", [], ["Spinat"]).map((i) => i.name)).toEqual(["Spinat"]);
    expect(angebotFuerGericht(list.angebot, "Gemüselasagne", [], [])).toEqual([]);
    expect(angebotFrage(items)).toBe("Auf die Liste: Spinat, Mozzarella +1?");
    expect(angebotFrage(items.slice(0, 1))).toBe("Auf die Liste: Spinat?");
    expect(angebotFrage(items)).not.toMatch(/…|fehlt|offen/);
  });

  it("nach „Nehmen“ fragt eine Meldung mit „Alle dazu“; antippen setzt nur Namen drauf (wofür im Fenster)", async () => {
    vi.doMock("@/lib/essen/mealPlan", async (orig) => ({ ...(await orig<object>()), composeWeek: () => PLAN, loadMealPlans: () => ({}) }));
    const showToast = vi.fn();
    vi.doMock("@/lib/core/toast", async (orig) => ({ ...(await orig<object>()), showToast }));
    const { zutatenAnbieten } = await import("@/lib/einkauf/angebot/nachNehmen");
    const profile = { planStyle: "fest", shoppingDay: "Montag", householdType: "familie" } as never;
    expect(zutatenAnbieten({ profile, weekPlans: {}, recipes: RECIPES }, "Gemüselasagne", "2026-10-23")).toBe(true);
    const t = showToast.mock.calls[0][0] as { text: string; action: { label: string; run: () => void; doneText: string } };
    expect(t.text).toBe("Auf die Liste: Spinat, Mozzarella +1?");
    expect(t.action.label).toBe("Alle dazu");
    expect(t.action.doneText).toBe("Steht drauf.");
    t.action.run();
    const manual = saved().weeks[W].manual;
    expect(manual.map((m) => m.name)).toEqual(["Spinat", "Mozzarella", "Lasagneplatten"]);
    expect(manual.every((m) => m.amount === "" && m.dish === "Gemüselasagne")).toBe(true);
    // Steht schon drauf bzw. nichts genannt: still
    showToast.mockClear();
    expect(zutatenAnbieten({ profile, weekPlans: {}, recipes: RECIPES }, "Gemüselasagne", "2026-10-23", ["Spinat"])).toBe(false);
    expect(zutatenAnbieten({ profile: { ...(profile as object), planStyle: "spontan" } as never, weekPlans: {}, recipes: RECIPES }, "Curry", "2026-10-24")).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
    // Rezept kennt die Liste nicht (eingebautes Rezept) bzw. spontan: was die Vorschau „auf die Liste“ nannte, ohne Grundsachen
    expect(zutatenAnbieten({ profile: { ...(profile as object), planStyle: "spontan" } as never, weekPlans: {}, recipes: RECIPES }, "Wok-Nudeln", "2026-10-21", ["Mie-Nudeln", "Salz", "Spinat"])).toBe(true);
    const t2 = showToast.mock.calls[0][0] as typeof t;
    expect(t2.text).toBe("Auf die Liste: Mie-Nudeln?");
    t2.action.run();
    expect(saved().weeks[W].manual.find((m) => m.name === "Mie-Nudeln")).toMatchObject({ amount: "", dish: "Wok-Nudeln", day: "Mittwoch" });
    vi.doUnmock("@/lib/essen/mealPlan");
    vi.doUnmock("@/lib/core/toast");
  });

  it("die Essen-Kachel ruft „Nehmen“ mit Angebot auf (Vorschau), der Beispiel-Tag nicht", () => {
    expect(read("src/components/heute/HomeTiles.tsx")).toMatch(/\{ anbieten: true, needs: bedarfFuerGericht\(/);
    expect(read("src/components/heute/takeDish.ts")).toMatch(/if \(options\.anbieten\) zutatenAnbieten\(/);
    expect(read("src/components/ui/ToastHost.tsx")).toMatch(/data-toast-action/);
  });
});
