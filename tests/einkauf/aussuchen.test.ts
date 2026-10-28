// Einkauf neu – Aussuchen (Tafel 111 + Nachtrag): erst Laden, dann Sachen.
// Abschnitts-Reihenfolge, Drogerie zuletzt bzw. zuerst im Drogerie-Laden,
// „Beliebt“ ohne Verlauf, „Für eure Woche“ aus dem Plan, Haken/Punkt, Menge,
// aktiver Laden, Antippen/Abwählen, Ladenwechsel, Zusammenfassung, Sprünge.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import { aussuchenAbschnitte, aussuchenSuche, fuerDieWoche, istDrogerieLaden, kennzeichen, mengeAus, mengeText, mengeZahl, oftBei, tippAktion, zusammenfassung, zusammenfassungText } from "@/lib/einkauf/aussuchen/abschnitte";
import { BELIEBT, KATALOG_REIHE, abschnittFuer } from "@/lib/einkauf/aussuchen/katalog";
import { at, fakeWindow } from "../helpers";

const item = (name: string, extra: Partial<ListItem> = {}): ListItem => ({ key: name, name, originalName: name, amount: "", section: "sonstiges", dishes: [], days: [], shop: "", checked: false, hidden: false, ...extra });
const LEER = { itemShops: {}, shopRules: {}, learned: {}, staples: [], gekauft: [] };
const ids = (shop: string, items: ListItem[] = [], verlauf = LEER) => aussuchenAbschnitte({ shop, items, verlauf }).map((a) => a.id);
const src = readFileSync("src/components/einkauf/aussuchen/Aussuchen.tsx", "utf8");

describe("Abschnitte in fester Reihenfolge", () => {
  it("Woche → Oft/Beliebt → Obst … Süßes → Drogerie & Haushalt (immer zuletzt); leere fallen weg", () => {
    expect(KATALOG_REIHE.map((k) => k.label)).toEqual(["Obst & Gemüse", "Brot & Backwaren", "Kühlregal", "Fleisch & Wurst", "Vorrat", "Tiefkühl", "Getränke", "Süßes & Snacks", "Drogerie & Haushalt"]);
    expect(ids("Rewe")).toEqual(["oft", "obst-gemuese", "brot", "kuehlregal", "fleisch", "vorrat", "tiefkuehl", "getraenke", "suesses", "drogerie"]);
    const plan = [item("Spinat", { dishes: ["Lasagne (Mi)"], days: ["Mittwoch"], section: "obst-gemuese" })];
    expect(ids("Rewe", plan)[0]).toBe("woche");
    expect(ids("Rewe", plan).at(-1)).toBe("drogerie");
  });

  it("Drogerie-Laden (Rossmann, dm): Drogerie zuerst, Lebensmittel eingeklappt", () => {
    expect(istDrogerieLaden("Rossmann")).toBe(true);
    expect(istDrogerieLaden("dm")).toBe(true);
    expect(istDrogerieLaden("Rewe")).toBe(false);
    const a = aussuchenAbschnitte({ shop: "Rossmann", items: [], verlauf: LEER });
    expect(a.slice(0, 2).map((x) => x.id)).toEqual(["oft", "drogerie"]);
    expect(a.slice(2).every((x) => x.eingeklappt)).toBe(true);
    expect(a[0].eintraege[0].name).toBe("Klopapier");
    expect(src).toContain("Lebensmittel bei {shop}");
  });

  it("„Beliebt“ ohne Verlauf: 9 typische Grundsachen; mit Verlauf „Oft bei Rewe“ (höchstens 9, was ihr dort kauft)", () => {
    const leer = aussuchenAbschnitte({ shop: "Rewe", items: [], verlauf: LEER })[0];
    expect(leer.label).toBe("Beliebt");
    expect(leer.eintraege.map((e) => e.name)).toEqual(BELIEBT);
    expect(BELIEBT).toHaveLength(9);
    const verlauf = { ...LEER, itemShops: { milch: "Rewe", brot: "Lidl", quark: "rewe" }, shopRules: { salami: "Rewe" }, learned: { butter: { shop: "Rewe", n: 4 } }, gekauft: [item("Milch", { shop: "Rewe", checked: true })] };
    expect(oftBei("Rewe", verlauf)).toEqual(["Butter", "Salami", "Milch", "Quark"]);
    const viele = { ...LEER, itemShops: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`sache ${i}`, "Rewe"])) };
    expect(oftBei("Rewe", viele)).toHaveLength(9);
    expect(aussuchenAbschnitte({ shop: "Rewe", items: [], verlauf })[0].label).toBe("Oft bei Rewe");
  });

  it("Drogerie-Laden: „Oft bei Rossmann · Drogerie zuerst“, Drogerie-Sachen vor Lebensmitteln", () => {
    const verlauf = { ...LEER, itemShops: { milch: "Rossmann", windeln: "Rossmann" }, learned: { milch: { shop: "Rossmann", n: 3 } } };
    expect(oftBei("Rossmann", verlauf)).toEqual(["Windeln", "Milch"]);
    expect(aussuchenAbschnitte({ shop: "Rossmann", items: [], verlauf })[0].label).toBe("Oft bei Rossmann · Drogerie zuerst");
  });

  it("„Für eure Woche“: Zutaten der geplanten Gerichte (nicht Eigenes, nicht Gekauftes), mit Tag, nach Wochentag", () => {
    const items = [item("Hack", { dishes: ["Bolognese (Fr)"], days: ["Freitag"] }), item("Spinat", { dishes: ["Lasagne (Mi)"], days: ["Mittwoch"] }), item("Milch", { manualId: "m1" }), item("Reis", { dishes: ["Curry (Di)"], days: ["Dienstag"], checked: true })];
    expect(fuerDieWoche(items)).toEqual([
      { name: "Spinat", section: "obst-gemuese", tag: "für Mi" },
      { name: "Hack", section: "fleisch-fisch", tag: "für Fr" },
    ]);
  });

  it("Sachen landen im passenden Abschnitt (auch Eigenes)", () => {
    expect(abschnittFuer("Gummibärchen")).toBe("suesses");
    expect(abschnittFuer("Schokolade")).toBe("suesses");
    expect(abschnittFuer("Alufolie")).toBe("drogerie");
    expect(abschnittFuer("Duschgel")).toBe("drogerie");
    expect(abschnittFuer("Mango")).toBe("obst-gemuese");
    expect(abschnittFuer("Lachs")).toBe("fleisch");
    const mitEigenem = aussuchenAbschnitte({ shop: "Rewe", items: [], verlauf: { ...LEER, staples: [{ id: "s", name: "Barista Hafermilch", amount: "", section: "kuehlregal", purchases: [], intervalDays: 7, active: true }] } });
    expect(mitEigenem.find((a) => a.id === "kuehlregal")?.eintraege.some((e) => e.name === "Barista Hafermilch")).toBe(true);
  });
});

describe("Suche, Kennzeichen, Tipp, Menge", () => {
  it("Suche im ganzen Katalog; Unbekanntes gibt’s als eigene Kachel", () => {
    const a = aussuchenAbschnitte({ shop: "Rewe", items: [], verlauf: LEER });
    expect(aussuchenSuche("zahn", a).map((e) => e.name)).toEqual(["Zahnbürste", "Zahnpasta", "Zahn"]);
    expect(aussuchenSuche("Milch", a)[0].name).toBe("Milch");
    expect(aussuchenSuche("Milch", a).some((e) => e.frei)).toBe(false);
    expect(aussuchenSuche("kürbiskerne", a)).toEqual([expect.objectContaining({ name: "Kürbiskerne", frei: true })]);
    expect(aussuchenSuche("  ", a)).toEqual([]);
  });

  it("Haken „steht drauf“ (mit Laden), Punkt „noch da“ (Tipp fügt trotzdem hinzu)", () => {
    const open = [item("Milch", { shop: "Rewe" }), item("Butter")];
    expect(kennzeichen("milch", open, [])).toMatchObject({ item: { name: "Milch", shop: "Rewe" }, imHaus: false });
    expect(kennzeichen("Eier", open, ["Eier"])).toEqual({ item: null, imHaus: true });
    expect(kennzeichen("Tomaten", open, ["Tomate"]).imHaus).toBe(true);
    expect(kennzeichen("Hafermilch", open, ["Milch"]).imHaus).toBe(false);
    expect(tippAktion(null, "Rewe")).toBe("rein");
    expect(tippAktion({ shop: "rewe" }, "Rewe")).toBe("raus");
    expect(tippAktion({ shop: "Lidl" }, "Rewe")).toBe("umziehen");
    expect(tippAktion({ shop: "" }, "Rewe")).toBe("umziehen");
  });

  it("Menge: halten = − 1 +, Standard 1 ohne Anzeige, sonst „×2“", () => {
    expect(mengeText("")).toBe("");
    expect(mengeText("1")).toBe("");
    expect(mengeText("2")).toBe("×2");
    expect(mengeText("500 g")).toBe("");
    expect(mengeZahl("")).toBe(1);
    expect(mengeZahl("3")).toBe(3);
    expect(mengeAus(1)).toBe("");
    expect(mengeAus(2)).toBe("2");
    expect(mengeAus(0)).toBe("");
    expect(mengeAus(120)).toBe("99");
    expect(src).toMatch(/<NumberStepper/);
    expect(src).toMatch(/onHold=\{\(\) => halten\(e\)\}/);
  });

  it("Zusammenfassung unten: in der Reihenfolge von „Meine Läden“", () => {
    const z = zusammenfassung([{ shop: "Rossmann" }, { shop: "Rewe" }, { shop: "Rewe" }, { shop: "rewe" }, { shop: "Rossmann" }], ["Edeka", "Rewe", "Lidl", "Rossmann"]);
    expect(z).toEqual([{ shop: "Rewe", n: 3 }, { shop: "Rossmann", n: 2 }]);
    expect(zusammenfassungText(z)).toBe("Rewe 3 · Rossmann 2");
    expect(zusammenfassung([], ["Rewe"])).toEqual([]);
  });
});

describe("Antippen = sofort in den aktiven Laden, gemerkt; nochmal = raus; Laden wechseln", () => {
  const KEY = "wasgibts.einkaufsliste";
  const W = "2026-10-26";
  let w: ReturnType<typeof fakeWindow>;
  const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
  beforeEach(() => {
    at("2026-10-28T09:00");
    vi.resetModules();
    w = fakeWindow();
  });

  it("wie die Seite es macht: rein (Artikel + feste Regel), umziehen, raus (alles wie vorher)", async () => {
    const { addManualItem, removeManualItems } = await import("@/lib/einkauf/listEdits");
    const { einsortieren } = await import("@/lib/einkauf/einsortieren");
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Rewe", "Rossmann"]);
    // Rewe aktiv: Milch antippen
    const id = addManualItem(W, { name: "Milch", amount: "", section: "kuehlregal" });
    const zurueck = einsortieren("Milch", "Rewe", true);
    expect(saved().shopRules.milch).toBe("Rewe");
    expect(saved().weeks[W].manual.map((m) => m.name)).toEqual(["Milch"]);
    // Laden gewechselt (Rossmann), Milch nochmal: zieht um
    zurueck();
    const zurueck2 = einsortieren("Milch", "Rossmann", true);
    expect(saved().shopRules.milch).toBe("Rossmann");
    // dort nochmal: raus – Regel weg, Artikel weg
    zurueck2();
    removeManualItems(W, [id]);
    expect(saved().shopRules.milch).toBeUndefined();
    expect(saved().itemShops.milch).toBeUndefined();
    expect(saved().weeks[W].manual).toEqual([]);
    expect(saved().myShops).toEqual(["Rewe", "Rossmann"]);
  });

  it("Seite: aktiver Laden gemerkt, Wahl mit fester Regel, Zahl der heute gewählten Sachen am Knopf", () => {
    expect(src).toMatch(/onClick=\{\(\) => setShopChip\(`laden:\$\{l\}`\)\}/);
    expect(src).toMatch(/einsortieren\(e\.name, aktiv, true\)/);
    expect(src).toMatch(/einsortieren\(item\.name, aktiv, true\)/);
    expect(src).toMatch(/role="radio"/);
    expect(src).toContain("Für welchen Laden?");
    expect(src).toMatch(/placeholder=\{`In \$\{aktiv\} suchen …`\}/);
  });
});

describe("Oberfläche: klebt, springt, dunkle Leiste ohne Schwarz", () => {
  it("Suchfeld + Chip-Reihe kleben oben, Abschnitts-Überschriften kleben darunter, Chip = springen, aktiver hervorgehoben", () => {
    expect(src).toMatch(/data-aussuchen-oben/);
    expect(src.match(/className="sticky/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/onClick=\{\(\) => springen\(a\.id\)\}/);
    expect(src).toMatch(/scrollIntoView\(\{ block: "start", behavior: "smooth" \}\)/);
    expect(src).toMatch(/aria-pressed=\{aktivAbschnitt === a\.id\}/);
    expect(src).toMatch(/IntersectionObserver/);
    expect(src).toMatch(/data-no-swipe data-abschnitt-chips/);
  });

  it("untere Leiste bleibt sichtbar (über der Leiste unten), dunkles Token, „Fertig“ orange", () => {
    expect(src).toMatch(/fixed inset-x-0[^"]*bg-leiste-dunkel/);
    expect(src).toMatch(/style=\{\{ bottom: UEBER_LEISTE \}\}/);
    expect(src).toMatch(/buttonClass\("primary", "md"\)\} shrink-0`\} data-fertig/);
    expect(src).not.toMatch(/bg-black|bg-ink\b/);
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css.match(/--app-leiste-dunkel:/g)).toHaveLength(3);
    expect(css).not.toMatch(/--app-leiste-dunkel: #000/);
  });

  it("Kachel: + in Orange, gewählt = Ladenfarbe mit Haken, anderer Laden klein darunter, Punkt „noch da“", () => {
    const k = readFileSync("src/components/einkauf/aussuchen/AussuchenKachel.tsx", "utf8");
    expect(k).toMatch(/<Plus className="h-4 w-4 text-accent"/);
    expect(k).toMatch(/var\(--app-shop-\$\{shopTone\(laden\)\}\)/);
    expect(k).toContain("steht drauf");
    expect(k).toContain("noch da");
    expect(k).toMatch(/\{anderer \? \(/);
  });
});
