// A-067 (Tafel 151): Läden einrichten, Mia verteilt automatisch – Sorten,
// Zuordnung a/b/c, mehrere Läden je Sorte, Einsortieren, Umlegen, Lernen,
// Familie (Abgleich), Sätze, KI-Ersatz.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, fakeWindow } from "../helpers";
import { sorteAusWortliste, sorteFuer, unbekannteSorten } from "@/lib/einkauf/sorten/sorten";
import { laedenAusSatz, laedenFuerSorte, migratePlan, mitHaupt, sorteUmschalten, vorschlagPlan, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { parseSorteRegel } from "@/lib/einkauf/sorten/saetze";
import { lernFrage } from "@/lib/einkauf/sorten/lernen";
import { auchZeile, ladenReiter, nachSorten } from "@/lib/einkauf/sorten/ladenSeite";
import { parseSortenAnfrage, parseSortenAntwort } from "@/lib/einkauf/sorten/ki";
import { ladenHerkunft, parseShopRule, shopRuleReply } from "@/lib/einkauf/shopRules";
import { buildShoppingList } from "@/lib/einkauf/buildList";
import { ladenKarten } from "@/lib/einkauf/seite/karten";
import { tileRows } from "@/lib/einkauf/shopGroups";
import { aufLadenSeite } from "@/lib/einkauf/unterwegs/unterwegs";
import { migrateStore } from "@/lib/einkauf/listMigration";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { inLaden, type ListItem, type ShoppingListStore, type WeekList } from "@/lib/einkauf/listModel";
import type { PlanWeek } from "@/lib/essen/mealPlan";

const W = "2026-10-26";
const EMPTY_WEEK = { weekStart: W, days: [] } as unknown as PlanWeek;
const PLAN: LadenPlan = { haupt: "Rewe", regeln: { drogerie: ["dm"], obst: ["Wochenmarkt", "Rewe"], getraenke: ["Getränkemarkt"] } };
const manual = (...namen: string[]): WeekList => ({ manual: namen.map((name, i) => ({ id: `m${i}`, name, amount: "", section: "sonstiges" as const, done: false })), checked: [], have: [] });
const liste = (settings: Parameters<typeof buildShoppingList>[3], ...namen: string[]) => buildShoppingList(EMPTY_WEEK, {}, manual(...namen), settings, { manualOnly: true }).items;

describe("Sorten: feste Wortliste, sonst KI", () => {
  it("ordnet Lebensmittel und Nicht-Lebensmittel ein", () => {
    expect(sorteAusWortliste("Milch")).toBe("milch");
    expect(sorteAusWortliste("Äpfel")).toBe("obst");
    expect(sorteAusWortliste("Zahnpasta")).toBe("drogerie");
    expect(sorteAusWortliste("Sonnenmilch")).toBe("drogerie");
    expect(sorteAusWortliste("Klopapier")).toBe("putzen");
    expect(sorteAusWortliste("Windeln")).toBe("baby");
    expect(sorteAusWortliste("Mineralwasser")).toBe("getraenke");
    expect(sorteAusWortliste("Creme fraiche")).toBe("milch");
    expect(sorteAusWortliste("Blumenerde")).toBeNull();
    // „Grillkohle“ ist kein Kohl
    expect(sorteAusWortliste("Grillkohle")).toBe("putzen");
  });

  it("KI-Ersatz: was die Wortliste nicht kennt, kommt aus dem Gespeicherten – jede Sache nur einmal gefragt", () => {
    expect(sorteFuer("Blumenerde", { blumenerde: "putzen" })).toBe("putzen");
    expect(unbekannteSorten(["Blumenerde", "blumenerde", "Milch", "Vogelhaus"], { vogelhaus: "tier" })).toEqual(["blumenerde"]);
  });

  it("KI-Antwort: nur geschickte Namen und bekannte Sorten", () => {
    const a = parseSortenAnfrage({ namen: ["Blumenerde", "Geschenkpapier"] })!;
    expect(a.namen).toEqual(["blumenerde", "geschenkpapier"]);
    expect(parseSortenAntwort('Klar: {"blumenerde":"putzen","geschenkpapier":"sonst","fremd":"obst"}', a)).toEqual({ blumenerde: "putzen" });
    expect(parseSortenAntwort("kaputt", a)).toEqual({});
    expect(parseSortenAnfrage({ namen: [] })).toBeNull();
    expect(parseSortenAnfrage({ namen: Array(31).fill("x") })).toBeNull();
  });
});

describe("Plan: Vorschläge und Ändern", () => {
  it("Schritt 2 schlägt vor: Drogerie → dm, Getränke → Getränkemarkt, Obst → Markt, Brot → Bäcker, Vorrat → Discounter, Rest → Hauptladen", () => {
    const p = vorschlagPlan(["Rewe", "Lidl", "dm", "Wochenmarkt", "Getränkemarkt", "Bäcker"]);
    expect(p.haupt).toBe("Rewe");
    expect(p.regeln).toEqual({ drogerie: ["dm"], putzen: ["dm"], baby: ["dm"], getraenke: ["Getränkemarkt"], obst: ["Wochenmarkt"], brot: ["Bäcker"], vorrat: ["Lidl"], tiefkuehl: ["Lidl"] });
    expect(laedenFuerSorte(p, "milch")).toEqual(["Rewe"]);
    // Nur was gewählt ist
    expect(vorschlagPlan(["Edeka"]).regeln).toEqual({});
  });

  it("mehrere Läden je Sorte (höchstens 3, Reihenfolge = Antippen), Hauptladen wechseln", () => {
    let p: LadenPlan = { haupt: "Rewe", regeln: { obst: ["Wochenmarkt"] } };
    p = sorteUmschalten(p, "obst", "Rewe");
    expect(p.regeln.obst).toEqual(["Wochenmarkt", "Rewe"]);
    p = sorteUmschalten(sorteUmschalten(p, "obst", "Lidl"), "obst", "Edeka");
    expect(p.regeln.obst).toEqual(["Rewe", "Lidl", "Edeka"]);
    expect(sorteUmschalten({ haupt: "Rewe", regeln: { obst: ["Lidl"] } }, "obst", "Lidl").regeln.obst).toBeUndefined();
    expect(mitHaupt({ haupt: "Rewe", regeln: { vorrat: ["Lidl"], obst: ["Wochenmarkt"] } }, "Lidl")).toEqual({ haupt: "Lidl", regeln: { obst: ["Wochenmarkt"] } });
  });

  it("gespeicherten Plan prüfen", () => {
    expect(migratePlan({ haupt: "Rewe", regeln: { obst: ["Markt", "Markt", 3, "Rewe", "Lidl", "Aldi"], quatsch: ["X"], drogerie: [] } })).toEqual({ haupt: "Rewe", regeln: { obst: ["Markt", "Rewe", "Lidl"] } });
    expect(migratePlan({ haupt: "" })).toBeNull();
    expect(migratePlan(null)).toBeNull();
  });
});

describe("Zuordnung: a) Ausnahme b) Sorte c) Hauptladen", () => {
  const s = { itemShops: {}, shopRules: { milch: "Lidl" }, ladenPlan: PLAN };
  it("a) Ausnahme gewinnt", () => expect(ladenHerkunft("Milch", s)).toEqual({ shop: "Lidl", von: "regel" }));
  it("b) Regel der Sorte", () => expect(ladenHerkunft("Zahnpasta", s)).toEqual({ shop: "dm", von: "sorte" }));
  it("c) sonst der Hauptladen – auch für Unbekanntes", () => {
    expect(ladenHerkunft("Butter", s)).toEqual({ shop: "Rewe", von: "haupt" });
    expect(ladenHerkunft("Blumenerde", s)).toEqual({ shop: "Rewe", von: "haupt" });
  });
  it("ohne Einrichtung bleibt „ohne Laden“ wie bisher (und Gelerntes zählt)", () => {
    expect(ladenHerkunft("Zahnpasta", { itemShops: {} })).toBeNull();
    expect(ladenHerkunft("Butter", { itemShops: {}, learned: { butter: { shop: "Lidl", n: 1 } } }, "2026-10-28")).toEqual({ shop: "Lidl", von: "gelernt" });
  });
  it("mit Einrichtung zählt Gelerntes nicht mehr für die Zuordnung (nur für die Lern-Frage)", () => {
    expect(ladenHerkunft("Butter", { ...s, learned: { butter: { shop: "Lidl", n: 5 } } }, "2026-10-28")).toEqual({ shop: "Rewe", von: "haupt" });
  });
});

describe("Einsortieren nach der Einrichtung", () => {
  it("vorher ohne Laden, danach jede Sache im richtigen Laden – kein „ohne Laden“ mehr", () => {
    const vorher = liste({ products: {}, itemShops: {} }, "Milch", "Zahnpasta", "Äpfel", "Blumenerde");
    expect(vorher.every((i) => i.shop === "")).toBe(true);
    const nachher = liste({ products: {}, itemShops: {}, ladenPlan: PLAN }, "Milch", "Zahnpasta", "Äpfel", "Blumenerde");
    expect(Object.fromEntries(nachher.map((i) => [i.name, [i.shop, ...(i.auch ?? [])].join(" + ")]))).toEqual({ Milch: "Rewe", Zahnpasta: "dm", Äpfel: "Wochenmarkt + Rewe", Blumenerde: "Rewe" });
    expect(nachher.some((i) => !i.shop)).toBe(false);
  });
});

describe("Nachtrag: eine Sorte, mehrere Läden", () => {
  const items = liste({ products: {}, itemShops: {}, ladenPlan: PLAN }, "Bananen", "Milch", "Zahnpasta");
  const bananen = items.find((i) => i.name === "Bananen")!;

  it("die Sache steht in beiden Läden, darunter „auch Markt“ bzw. „auch Rewe“", () => {
    expect(bananen).toMatchObject({ shop: "Wochenmarkt", auch: ["Rewe"] });
    const karten = ladenKarten(items, ["Rewe", "Wochenmarkt", "dm"]);
    expect(karten.find((k) => k.shop === "Rewe")!.items.map((i) => i.name)).toEqual(expect.arrayContaining(["Bananen", "Milch"]));
    expect(karten.find((k) => k.shop === "Wochenmarkt")!.items.map((i) => i.name)).toEqual(["Bananen"]);
    expect(auchZeile(bananen, "Rewe")).toBe("auch Markt");
    expect(auchZeile(bananen, "Wochenmarkt")).toBe("auch Rewe");
    expect(auchZeile(items.find((i) => i.name === "Milch")!, "Rewe")).toBe("");
    expect(aufLadenSeite(bananen, "Rewe", null, null)).toBe(true);
    expect(aufLadenSeite(bananen, "Wochenmarkt", null, null)).toBe(true);
    expect(inLaden(bananen, "dm")).toBe(false);
  });

  it("Kachel zählt sie in jedem Laden mit, die Sache bleibt eine (kein Duplikat)", () => {
    const rows = tileRows(items, ["Rewe", "Wochenmarkt", "dm"], Infinity).rows;
    expect(Object.fromEntries(rows.map((r) => [r.shop, r.count]))).toEqual({ Rewe: 2, Wochenmarkt: 1, dm: 1 });
    expect(items).toHaveLength(3);
    expect(ladenReiter(items, ["Rewe", "Wochenmarkt", "dm"])).toEqual([{ shop: "Rewe", n: 2 }, { shop: "Wochenmarkt", n: 1 }, { shop: "dm", n: 1 }]);
  });

  it("Abhaken in einem Laden = überall erledigt", () => {
    const list = manual("Bananen");
    list.manual[0].done = true;
    const erledigt = buildShoppingList(EMPTY_WEEK, {}, list, { products: {}, itemShops: {}, ladenPlan: PLAN }, { manualOnly: true }).items;
    const offen = erledigt.filter((i) => !i.checked);
    expect(ladenKarten(offen, ["Rewe", "Wochenmarkt"]).every((k) => k.items.length === 0)).toBe(true);
  });
});

describe("Laden-Seite: sortiert wie im Laden", () => {
  it("Gruppen im Laufweg: Obst & Gemüse zuerst, Tiefkühl und Getränke zuletzt, Unbekanntes ganz unten", () => {
    const items = liste({ products: {}, itemShops: {}, ladenPlan: { haupt: "Rewe", regeln: {} } }, "Wasser", "Pizza tiefkühl", "Blumenerde", "Äpfel", "Milch", "Brot");
    expect(nachSorten(items).map((g) => g.label)).toEqual(["Obst & Gemüse", "Brot & Brötchen", "Milch, Käse, Eier", "Tiefkühl", "Getränke", "Sonst noch"]);
    expect(nachSorten(items, { blumenerde: "putzen" }).map((g) => g.sorte)).toEqual(["obst", "brot", "milch", "putzen", "tiefkuehl", "getraenke"]);
  });
});

describe("Mia lernt dazu", () => {
  const H = "2026-10-28";
  const butter = { name: "Butter", shop: "Rewe" } as ListItem;
  it("erst beim 2. Mal woanders, dann einmal fragen", () => {
    expect(lernFrage(butter, { learned: { butter: { shop: "Lidl", n: 1, am: H } } }, H)).toBeNull();
    expect(lernFrage(butter, { learned: { butter: { shop: "Lidl", n: 2, am: H } } }, H)).toEqual({ sache: "Butter", shop: "Lidl", text: "Butter holst du oft bei Lidl. Ab jetzt immer dort?" });
  });
  it("Nein = nie wieder fragen, schon eine Ausnahme = nicht fragen, im eigenen Laden = nicht fragen", () => {
    const g = { butter: { shop: "Lidl", n: 3, am: H } };
    expect(lernFrage(butter, { learned: g, learnAsked: ["butter"] }, H)).toBeNull();
    expect(lernFrage(butter, { learned: g, shopRules: { butter: "Rewe" } }, H)).toBeNull();
    expect(lernFrage(butter, { learned: { butter: { shop: "Rewe", n: 4, am: H } } }, H)).toBeNull();
  });
  it("Nachtrag: zweimal im selben von mehreren Läden → „Bananen ab jetzt nur bei Rewe?“", () => {
    const bananen = { name: "Bananen", shop: "Wochenmarkt", auch: ["Rewe"] } as ListItem;
    expect(lernFrage(bananen, { learned: { bananen: { shop: "Rewe", n: 1, am: H } } }, H)).toBeNull();
    expect(lernFrage(bananen, { learned: { bananen: { shop: "Rewe", n: 2, am: H } } }, H)?.text).toBe("Bananen ab jetzt nur bei Rewe?");
  });
  it("höchstens eine Frage je Einkauf (Laden-Seite)", () => {
    const src = readFileSync("src/components/einkauf/LadenSeite.tsx", "utf8");
    expect(src).toMatch(/if \(war \|\| !plan \|\| !shop \|\| gefragt\.current\) return;/);
    expect(src).toMatch(/gefragt\.current = true;/);
  });
});

describe("Mia-Sätze ändern Regeln direkt", () => {
  it("Sorten-Sätze, auch mit zwei Läden", () => {
    expect(parseSorteRegel("Getränke kaufe ich bei Edeka")).toEqual({ sorte: "getraenke", laeden: ["Edeka"] });
    expect(parseSorteRegel("Obst kaufe ich auf dem Markt und bei Rewe")).toEqual({ sorte: "obst", laeden: ["Wochenmarkt", "Rewe"] });
    expect(parseSorteRegel("Fleisch hole ich beim Schlachter")).toEqual({ sorte: "fleisch", laeden: ["Schlachter"] });
    expect(parseSorteRegel("Milch immer bei Rewe")).toBeNull();
    expect(laedenAusSatz("Rewe, Lidl und dm")).toEqual(["Rewe", "Lidl", "dm"]);
  });
  it("„Milch immer bei Rewe“ bleibt eine Ausnahme, „Getränke …“ wird eine Sorten-Regel", () => {
    expect(parseShopRule("Milch immer bei Rewe")).toEqual({ item: "Milch", shop: "Rewe" });
    expect(shopRuleReply("Milch", "Rewe")).toBe("Merk ich mir. Milch → Rewe.");
    expect(parseShopRule("Obst kaufe ich auf dem Markt und bei Rewe")).toEqual({ item: "Obst", shop: "Wochenmarkt und Rewe" });
    expect(shopRuleReply("Obst", "Wochenmarkt und Rewe")).toBe("Merk ich mir. Obst & Gemüse → Wochenmarkt + Rewe.");
  });
});

describe("Speicher: Einrichten, Umlegen, Familie", () => {
  const KEY = "wasgibts.einkaufsliste";
  let w: ReturnType<typeof fakeWindow>;
  const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
  beforeEach(() => {
    at("2026-10-28T09:00");
    vi.resetModules();
    w = fakeWindow();
  });

  it("Speichern merkt Läden und Plan, nie wieder gefragt", async () => {
    const { einrichtungSpeichern } = await import("@/lib/einkauf/sorten/einrichten");
    einrichtungSpeichern(["Rewe", "Hofladen"], { haupt: "Rewe", regeln: { obst: ["Hofladen"] } });
    expect(saved()).toMatchObject({ myShops: ["Rewe", "Hofladen"], shopsAsked: true, ladenPlan: { haupt: "Rewe", regeln: { obst: ["Hofladen"] } } });
    expect(saved().shops).toContain("Hofladen");
  });

  it("Umlegen auf der Ergebnis-Karte speichert eine Ausnahme (Rückgängig stellt alles her)", async () => {
    const { einrichtungSpeichern } = await import("@/lib/einkauf/sorten/einrichten");
    const { applyShopRule } = await import("@/lib/einkauf/shopRules");
    einrichtungSpeichern(["Rewe", "Lidl"], { haupt: "Rewe", regeln: {} });
    const undo = applyShopRule("Butter", "Lidl");
    expect(saved().shopRules.butter).toBe("Lidl");
    expect(ladenHerkunft("Butter", saved())).toEqual({ shop: "Lidl", von: "regel" });
    undo();
    expect(saved().shopRules.butter).toBeUndefined();
    const src = readFileSync("src/components/einkauf/merken/ErgebnisLaden.tsx", "utf8");
    expect(src).toMatch(/if \(settings\?\.ladenPlan\) applyShopRule\(sache, shop\);/);
  });

  it("„Getränke kaufe ich bei Edeka“ setzt die Sorte (legt Laden an), Rückgängig nimmt es zurück", async () => {
    const { einrichtungSpeichern } = await import("@/lib/einkauf/sorten/einrichten");
    const { applyShopRule } = await import("@/lib/einkauf/shopRules");
    einrichtungSpeichern(["Rewe"], { haupt: "Rewe", regeln: {} });
    const undo = applyShopRule("Getränke", "Edeka");
    expect(saved().ladenPlan!.regeln.getraenke).toEqual(["Edeka"]);
    expect(saved().myShops).toEqual(["Rewe", "Edeka"]);
    expect(saved().shopRules).toEqual({});
    undo();
    expect(saved().ladenPlan!.regeln).toEqual({});
    expect(saved().myShops).toEqual(["Rewe"]);
  });

  it("Nein = für diese Sache nie wieder fragen", async () => {
    const { nieWiederFragen } = await import("@/lib/einkauf/sorten/einrichten");
    nieWiederFragen("Butter");
    nieWiederFragen("butter");
    expect(saved().learnAsked).toEqual(["butter"]);
  });

  it("Familie sieht dieselben Regeln: Plan und KI-Sorten reisen im Abgleich mit", () => {
    const ek = ADAPTERS.find((a) => a.name === "einkauf")!;
    const value = { version: 8, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], myShops: ["Rewe", "dm"], shopsAsked: true, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "", ladenPlan: PLAN, sortenKi: { blumenerde: "putzen" } };
    const docs = ek.toDocs(value as never);
    const settings = docs.find((d) => d.typ === "einkauf-einstellungen")!;
    expect(settings.data).toMatchObject({ ladenPlan: PLAN, sortenKi: { blumenerde: "putzen" } });
    expect(settings.raum).toBe("familie");
    const beiLisa = ek.fromDocs(docs.map((d) => ({ ...d, version: 1, updatedAt: "", geloescht: false })) as never, null) as unknown as ShoppingListStore;
    expect(migrateStore(beiLisa)).toMatchObject({ ladenPlan: PLAN, sortenKi: { blumenerde: "putzen" } });
  });

  it("alte Stände ohne Plan bleiben wie sie sind, kaputte Pläne fallen weg", () => {
    const base = { version: 8, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], myShops: [], shopsAsked: false, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "" };
    expect(migrateStore(base)).not.toHaveProperty("ladenPlan");
    expect(migrateStore({ ...base, ladenPlan: { haupt: 3 }, sortenKi: { x: "quatsch" } })).not.toHaveProperty("ladenPlan");
    expect(migrateStore({ ...base, ladenPlan: { haupt: 3 }, sortenKi: { x: "quatsch" } })).not.toHaveProperty("sortenKi");
  });
});

describe("Oberfläche", () => {
  const seite = readFileSync("src/components/einkauf/EinkaufSeite.tsx", "utf8");
  it("erstes Öffnen = Einrichtung (✕ / „Später“), danach nie wieder von selbst", () => {
    expect(seite).toMatch(/if \(meine && !meine\.shopsAsked && !settings\.ladenPlan && !zeigBeispiel && !einrichten\) setEinrichten\(true\);/);
    expect(seite).toMatch(/onSpaeter=\{\(\) => \{\n\s+laterShops\(\);/);
    const e = readFileSync("src/components/einkauf/einrichten/Einrichten.tsx", "utf8");
    for (const t of ["Wo kaufst du ein?", "Was holst du wo?", "Fertig!", "Zur Einkaufsliste", "Später", "lernt dazu: Holst du etwas zweimal woanders, fragt sie einmal kurz nach."]) expect(e).toContain(t);
  });
  it("„Meine Läden & was wo“ im „···“ = gleicher Bildschirm wie Schritt 2", () => {
    expect(readFileSync("src/components/einkauf/seite/EinkaufMenue.tsx", "utf8")).toContain('"/einkaufsliste/einrichten?nur=was-wo"');
    expect(readFileSync("src/components/einkauf/einrichten/EinrichtenSeite.tsx", "utf8")).toMatch(/<WasWo /);
  });
});
