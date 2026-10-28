// Einkauf neu (Tafel 110): Seite „Einkauf“ so klar wie die Kachel – zwei
// große Knöpfe, „Meine Läden“ als Karten, „Noch ohne Laden“ mit Ziehen und
// „Mia sortiert“; Menü „···“; Laden-Seite (Kreis, Feld); Kachel-Sprünge;
// Beispiel-Tag; aufgeräumt (keine alten Elemente mehr).
import { existsSync, readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShoppingListStore } from "@/lib/einkauf/listModel";
import { pageLabel } from "@/lib/core/pageLabel";
import { HALTEN_MS } from "@/components/einkauf/seite/OhneLaden";
import { at, fakeWindow } from "../helpers";

const read = (p: string) => readFileSync(p, "utf8");
const seite = read("src/components/einkauf/EinkaufSeite.tsx");
const zone = read("src/components/einkauf/seite/OhneLaden.tsx");
const laden = read("src/components/einkauf/LadenSeite.tsx");
const menue = read("src/components/einkauf/seite/EinkaufMenue.tsx");

describe("Seite „Einkauf“", () => {
  it("Kopf „‹ Heute“, „···“, Titel „Einkauf“ – kein ＋", () => {
    expect(seite).toMatch(/title="Einkauf"/);
    expect(seite).toMatch(/action=\{\s*<EinkaufMenue/);
    expect(seite).not.toMatch(/QuickAddButton/);
    expect(pageLabel("/einkaufsliste")).toBe("Einkauf");
    expect(pageLabel("/einkaufsliste/aussuchen")).toBe("Aussuchen");
  });

  it("oben zwei große Knöpfe: Einsprechen (Orange, Mikro, holt Mia im Modus „Einkauf“) und Aussuchen (weiß, Lupe)", () => {
    expect(seite).toMatch(/onClick=\{\(\) => openHelper\("einkauf"\)\} className=\{`\$\{GROSS\} bg-accent/);
    expect(seite).toContain("Einsprechen");
    expect(seite).toContain("Einfach aufzählen");
    expect(seite).toMatch(/<Mic /);
    expect(seite).toMatch(/<Link href="\/einkaufsliste\/aussuchen" className=\{`\$\{GROSS\} \$\{CARD\}`\}/);
    expect(seite).toContain("Suchen & antippen");
    expect(seite).toMatch(/<Search /);
    expect(seite.indexOf("data-einsprechen")).toBeLessThan(seite.indexOf("<LadenKarteView"));
  });

  it("„Meine Läden“ als große Karten (Streifen, Name, erste Sachen leise, bis 3 Symbole, Anzahl, ›), Tipp = Laden-Seite", () => {
    const karte = read("src/components/einkauf/seite/LadenKarten.tsx");
    expect(karte).toMatch(/items\.slice\(0, 3\)\.map/);
    expect(karte).toMatch(/ersteSachen\(items\)/);
    expect(karte).toMatch(/<ChevronRight/);
    expect(karte).toMatch(/<Link href=\{ladenHref\(shop\)\}/);
    expect(karte).toMatch(/"data-laden-ziel": shop/);
  });

  it("aufgeräumt: keine Wochen-Pfeile, Laden-Chips, Einkaufsmodus-Knopf, Abteilungen, Hinweiszeilen, Extra-Zeilen", () => {
    for (const alt of ["WochenZeile", "data-laden-reihe", "data-einkaufsmodus", "GruppenListe", "StapleBar", "KlappZeile", "GrundsachenKarte", "Antippen: Laden wählen", "Sortiert wie dein Weg", "Jetzt mitnehmen", "Für heute", "Hast du bestimmt im Haus"]) expect(seite, alt).not.toContain(alt);
    for (const weg of ["ShoppingListView", "ShopMode", "ListeTeile", "StapleBar", "kacheln/CatalogSheet"]) expect(existsSync(`src/components/einkauf/${weg}.tsx`), weg).toBe(false);
    expect(existsSync("src/lib/einkauf/kacheln/basics.ts")).toBe(false);
  });

  it("Menü „···“: Woche wechseln, Zuletzt gekauft, Gerichte ohne Zutaten, Stammliste, Liste teilen, Meine Läden bearbeiten", () => {
    for (const l of ["Nächste Woche zeigen", "Diese Woche zeigen", "Zuletzt gekauft", "Gerichte ohne Zutaten", "Stammliste", "Liste teilen", "Meine Läden bearbeiten"]) expect(menue, l).toContain(`"${l}"`);
    expect(menue).toMatch(/<MoreMenu title="Einkauf"/);
    expect(seite).toMatch(/onWoche=\{\(\) => setEinkaufWoche\(isNext \? "current" : "next"\)\}/);
  });
});

describe("Woche für alle Einkauf-Seiten", () => {
  beforeEach(() => vi.resetModules());
  it("Wechseln gilt für Einkauf, Laden-Seite und Aussuchen", async () => {
    const { setEinkaufWoche } = await import("@/lib/einkauf/seite/karten");
    setEinkaufWoche("next");
    setEinkaufWoche("planning");
    for (const f of ["src/components/einkauf/EinkaufSeite.tsx", "src/components/einkauf/LadenSeite.tsx", "src/components/einkauf/aussuchen/Aussuchen.tsx"]) expect(read(f)).toMatch(/useWeekShoppingList\(woche\)/);
  });
});

describe("„Noch ohne Laden“: antippen, ziehen, „Mia sortiert“", () => {
  it("nur wenn vorhanden, gestrichelt, Zahl, leise „oder auf einen Laden ziehen“", () => {
    expect(zone).toMatch(/if \(!items\.length\) return null;/);
    expect(zone).toMatch(/border-dashed/);
    expect(zone).toContain("Noch ohne Laden");
    expect(zone).toContain("oder auf einen Laden ziehen");
  });

  it("halten ~250 ms hebt (Vibration), ziehen auf eine Karte, das Ziel leuchtet, loslassen = Laden; stört Scrollen/Wischen nicht", () => {
    expect(HALTEN_MS).toBe(250);
    expect(zone).toMatch(/buzz\(\);\s*onStart/);
    expect(zone).toMatch(/closest\("\[data-laden-ziel\]"\)/);
    expect(zone).toMatch(/data-no-swipe/);
    expect(zone).not.toMatch(/className=[^\n]*touch-none/);
    // vor dem Heben gewinnt die Bewegung
    expect(zone).toMatch(/Math\.hypot\(e\.clientX - p\.x, e\.clientY - p\.y\) > 8/);
    expect(zone).toMatch(/if \(ziehtGerade\.current\) e\.preventDefault\(\)/);
    expect(seite).toMatch(/ziel=\{ziel !== null && ziel === k\.shop\}/);
    expect(seite).toMatch(/const undo = einsortieren\(item\.name, shop, true\);\s*showToast\(\{ text: einsortiertText\(item\.name, shop, true\), undo/);
  });

  it("antippen = „Wo kaufst du das?“ (Läden als große Knöpfe), „Mia sortiert“ nur, wenn sie etwas kennt", () => {
    expect(seite).toMatch(/<WoKaufstDuSheet/);
    expect(seite).toMatch(/miaSortiert\(ohne\)/);
  });
});

describe("Ziehen + Rückgängig im Speicher", () => {
  const KEY = "wasgibts.einkaufsliste";
  let w: ReturnType<typeof fakeWindow>;
  const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
  beforeEach(() => {
    at("2026-10-28T09:00");
    vi.resetModules();
    w = fakeWindow();
  });

  it("„Käse → Edeka. Merk ich mir.“ – Rückgängig nimmt nur diesen Schritt zurück, die Regel ist wieder weg", async () => {
    const { einsortieren, einsortiertText } = await import("@/lib/einkauf/einsortieren");
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Edeka", "Rewe"]);
    einsortieren("Milch", "Rewe", true);
    const undo = einsortieren("Käse", "Edeka", true);
    expect(einsortiertText("Käse", "Edeka", true)).toBe("Käse → Edeka. Merk ich mir.");
    expect(saved().shopRules).toEqual({ milch: "Rewe", käse: "Edeka" });
    undo();
    expect(saved().shopRules).toEqual({ milch: "Rewe" });
    expect(saved().itemShops.käse).toBeUndefined();
  });

  it("„Mia sortiert“ ordnet Gelerntes ein und lässt Unbekanntes", async () => {
    const { miaSortiert } = await import("@/lib/einkauf/einsortieren");
    const { update } = await import("@/lib/einkauf/listStore");
    update((s) => ({ ...s, learned: { spinat: { shop: "Edeka", n: 1 } } }));
    const it = (name: string) => ({ key: name, name, originalName: name, amount: "", section: "sonstiges" as const, dishes: [], days: [], shop: "", checked: false, hidden: false });
    const { count } = miaSortiert([it("Spinat"), it("Kürbiskerne")]);
    expect(count).toBe(1);
    expect(saved().itemShops).toEqual({ spinat: "Edeka" });
  });
});

describe("Laden-Seite", () => {
  it("große farbige Karte „Rewe · 3 Sachen“, Liste mit großem Kreis, Symbol, Name, Menge leise", () => {
    expect(laden).toMatch(/\{name\} <span className="font-bold text-muted">· \{sachenText\(anzahl\)\}<\/span>/);
    expect(laden).toMatch(/h-9 w-9 shrink-0 items-center justify-center rounded-full border-2/);
    expect(laden).toMatch(/<ItemSymbol/);
    expect(laden).toMatch(/item\.amount && <span className=\{`shrink-0 text-\[15px\] tabular-nums/);
  });

  it("Kreis = gekauft, durchgestrichen, nach 2 s nach unten („Im Korb“); lange drücken = anderer Laden, ändern, löschen", () => {
    expect(laden).toMatch(/window\.setTimeout\(\(\) => setLeaving\(\(l\) => l\.filter\(\(k\) => k !== item\.key\)\), 2000\)/);
    expect(laden).toMatch(/line-through/);
    expect(laden).toContain("Im Korb");
    expect(laden).toMatch(/onLongPress=\{\(\) => setMenu\(item\)\}/);
    expect(laden).toMatch(/<WoKaufstDuSheet[\s\S]*onEdit=/);
  });

  it("unten „Was noch bei Rewe?“ mit Vorschlägen beim Tippen – landet in diesem Laden", () => {
    expect(laden).toMatch(/placeholder=\{`Was noch bei \$\{name\}\?`\}/);
    expect(laden).toMatch(/if \(shop\) einsortieren\(n, shop, true\)/);
    expect(laden).toMatch(/q\.length >= 2 \?/);
  });

  it("kein eigener Einkaufsmodus mehr: kein „Bildschirm bleibt an“, „Fertig eingekauft“ nur bei geteiltem Einkauf", () => {
    expect(laden).not.toMatch(/useWakeLock|Bei \$\{shop/);
    expect(laden).toMatch(/\{active\?\.tripId && \(/);
    // Einkauf beginnt beim ersten Abhaken oder unterwegs geöffnet („Ich bin bei REWE“, Jetzt-Karte)
    expect(laden).toMatch(/if \(ready && unterwegs\) beginnen\(\)/);
    expect(laden).toMatch(/buzz\(\);\s*beginnen\(\);/);
  });
});

describe("Startseiten-Kachel (C2) bleibt", () => {
  it("Laden-Zeile = Laden-Seite, „n ohne Laden“ = Einkauf am Bereich „Noch ohne Laden“", () => {
    const tiles = read("src/components/heute/HomeTiles.tsx");
    expect(tiles).toMatch(/href=\{demo \? "\/einkaufsliste" : ladenHref\(r\.shop \?\? ""\)\}/);
    expect(tiles).toContain('href="/einkaufsliste#ohne-laden"');
    expect(tiles).not.toMatch(/setShopChip/);
    expect(seite).toMatch(/window\.location\.hash === "#ohne-laden"/);
  });
});

describe("Beispiel-Tag", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("Läden Edeka/Rewe/Lidl/Rossmann + zwei Ohne-Laden-Chips, leise „Beispiel“; nichts in echte Speicher", async () => {
    const w = fakeWindow();
    const { einkaufBeispiel } = await import("@/components/einkauf/EinkaufBeispiel");
    const b = einkaufBeispiel();
    expect(b.karten.map((k) => k.shop)).toEqual(["Edeka", "Rewe", "Lidl", "Rossmann"]);
    expect(b.ohne.map((i) => i.name)).toEqual(["Spinat", "Haferflocken"]);
    expect(w.localStorage.getItem("wasgibts.einkaufsliste")).toBeNull();
    expect(seite).toMatch(/\{zeigBeispiel && <span className="text-xs font-semibold text-muted">Beispiel<\/span>\}/);
    expect(seite).toMatch(/onDrop=\{\(item, shop\) => !zeigBeispiel && drop\(item, shop\)\}/);
  });
});
