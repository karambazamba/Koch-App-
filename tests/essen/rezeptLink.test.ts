// Rezept-Links an Mia: schema.org-Rezept lesen (JSON-LD in @graph, als Liste,
// Microdata), Zutaten-Zeilen, Umrechnung auf die Haushaltsgröße, „im Haus“-
// Abgleich, Link-Erkennung im Chat und aus dem Teilen-Menü, sicherer Abruf.
import { describe, expect, it } from "vitest";
import { geteiltAnMia, mengeText, parseZutat, readRecipePage, rezeptLinkIn, servingsOf, umrechnen } from "@/lib/essen/rezeptLink/lesen";
import { linkKarte } from "@/lib/essen/rezeptLink/karte";
import { mockRezeptSeite } from "@/lib/essen/rezeptLink/mock";
import { FeedError, fetchPage } from "@/lib/kalender/abo/fetchFeed";
import type { PantryItem } from "@/lib/vorrat/pantry";

const T = "2026-10-21";
const ld = (obj: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(obj)}</script></head><body></body></html>`;

describe("Rezept-Seite lesen", () => {
  it("JSON-LD in @graph mit Bild als Liste", () => {
    const r = readRecipePage(mockRezeptSeite(new URL("https://rezept.test/suppe"))!, "https://rezept.test/suppe");
    expect(r).toMatchObject({ title: "Kürbissuppe mit Ingwer", image: "https://rezept.test/kuerbis.jpg", servings: 4, source: "rezept.test" });
    expect(r?.ingredients).toHaveLength(7);
  });

  it("JSON-LD als Liste, Typ als Liste, HTML-Zeichen, relatives Bild", () => {
    const html = ld([{ "@type": "BreadcrumbList" }, { "@type": ["Recipe", "Thing"], name: "Spaghetti &amp; Tomaten", image: { url: "/bild.jpg" }, recipeYield: ["2", "2 Portionen"], recipeIngredient: ["200 g Spaghetti", "<b>1</b> Dose Tomaten"] }]);
    expect(readRecipePage(html, "https://www.chefkoch.de/rezepte/1")).toEqual({
      title: "Spaghetti & Tomaten",
      image: "https://www.chefkoch.de/bild.jpg",
      servings: 2,
      ingredients: ["200 g Spaghetti", "1 Dose Tomaten"],
      url: "https://www.chefkoch.de/rezepte/1",
      source: "chefkoch.de",
    });
  });

  it("Microdata, wenn kein JSON-LD da ist; nichts gefunden = null", () => {
    const html = `<html><head><title>Omas Kuchen</title></head><body><div itemscope itemtype="https://schema.org/Recipe"><h1 itemprop="name">Omas Kuchen</h1><span itemprop="recipeYield">12 Stück</span><li itemprop="recipeIngredient">250 g Mehl</li><li itemprop="recipeIngredient">3 Eier</li></div></body></html>`;
    expect(readRecipePage(html, "https://example.com/k")).toMatchObject({ title: "Omas Kuchen", servings: 12, ingredients: ["250 g Mehl", "3 Eier"] });
    expect(readRecipePage("<html><body>Hallo</body></html>", "https://example.com")).toBeNull();
    expect(readRecipePage(ld({ "@type": "Recipe", name: "Ohne Zutaten" }), "https://example.com")).toBeNull();
    expect(readRecipePage('<script type="application/ld+json">{kaputt</script>', "https://example.com")).toBeNull();
  });

  it("Portionen aus Text", () => {
    expect(servingsOf("4 Portionen")).toBe(4);
    expect(servingsOf(6)).toBe(6);
    expect(servingsOf("viele")).toBeNull();
    expect(servingsOf(null)).toBeNull();
  });
});

describe("Zutaten-Zeilen und Umrechnung", () => {
  it("Menge, Einheit, Name", () => {
    expect(parseZutat("200 g Mehl")).toEqual({ amount: 200, unit: "g", name: "Mehl" });
    expect(parseZutat("1 ½ EL Olivenöl")).toEqual({ amount: 1.5, unit: "EL", name: "Olivenöl" });
    expect(parseZutat("2-3 Zwiebeln, gewürfelt")).toEqual({ amount: 2, unit: "", name: "Zwiebeln" });
    expect(parseZutat("1/2 Bund Petersilie")).toEqual({ amount: 0.5, unit: "Bund", name: "Petersilie" });
    expect(parseZutat("2 Esslöffel Zucker")).toEqual({ amount: 2, unit: "EL", name: "Zucker" });
    expect(parseZutat("Salz")).toEqual({ amount: null, unit: "", name: "Salz" });
    expect(parseZutat("1 Dose Tomaten (400 g)")).toEqual({ amount: 1, unit: "Dose", name: "Tomaten" });
  });

  it("auf die Haushaltsgröße (sinnvoll gerundet)", () => {
    expect(umrechnen({ amount: 200, unit: "g", name: "Mehl" }, 4, 5)).toEqual({ amount: 250, unit: "g", name: "Mehl" });
    expect(umrechnen({ amount: 3, unit: "", name: "Eier" }, 4, 2)).toEqual({ amount: 1.5, unit: "", name: "Eier" });
    expect(umrechnen({ amount: null, unit: "", name: "Salz" }, 4, 2).amount).toBeNull();
    expect(umrechnen({ amount: 2, unit: "", name: "Eier" }, null, 2).amount).toBe(2);
    expect(mengeText({ amount: 1.5, unit: "EL", name: "Öl" })).toBe("1,5 EL");
  });
});

describe("Karte: auf die Liste, im Haus, ehrlich", () => {
  const stock = [
    { id: "p1", name: "Ingwer", addedAt: T, place: "schrank" },
    { id: "p2", name: "Kokosmilch", addedAt: "2026-09-25", place: "schrank" },
  ] as PantryItem[];
  it("Grundsachen zählen nicht, sicher = im Haus, sonst vermutlich, Liste nicht doppelt", () => {
    const r = readRecipePage(mockRezeptSeite(new URL("https://rezept.test/x"))!, "https://rezept.test/x")!;
    const k = linkKarte(r, 2, stock, [], T);
    expect(k.imHaus).toEqual(["Ingwer"]);
    expect(k.vermutlich).toEqual(["Kokosmilch"]);
    expect(k.toList.map((z) => `${mengeText(z)} ${z.name}`.trim())).toEqual(["0,5 Hokkaido-Kürbis"]);
    const drauf = linkKarte(r, 2, stock, ["Hokkaido-Kürbis"], T);
    expect(drauf.schonDrauf).toEqual(["Hokkaido-Kürbis"]);
    expect(drauf.toList).toEqual([]);
  });
});

describe("Link erkennen", () => {
  it("im Chat: (fast) nur ein https-Link, kein Kalender", () => {
    expect(rezeptLinkIn("https://www.chefkoch.de/rezepte/123/lasagne.html")).toBe("https://www.chefkoch.de/rezepte/123/lasagne.html");
    expect(rezeptLinkIn("Guck mal: https://example.com/rezept!")).toBe("https://example.com/rezept");
    expect(rezeptLinkIn("webcal://x.ics")).toBeNull();
    expect(rezeptLinkIn("https://calendar.google.com/calendar/ical/x/basic.ics")).toBeNull();
    expect(rezeptLinkIn("Kannst du mir bitte mal erklären, was ich mit diesem Rezept https://example.com/a heute Abend kochen soll, das ist lang")).toBeNull();
    expect(rezeptLinkIn("Milch auf die Liste")).toBeNull();
  });

  it("aus dem Teilen-Menü", () => {
    expect(geteiltAnMia("?geteilt=1&title=Lasagne&url=https%3A%2F%2Fexample.com%2Flasagne")).toBe("https://example.com/lasagne");
    expect(geteiltAnMia("?geteilt=1&text=Schau+mal+https%3A%2F%2Fexample.com%2Fa")).toBe("https://example.com/a");
    expect(geteiltAnMia("?geteilt=1&text=Milch+kaufen")).toBe("Milch kaufen");
    expect(geteiltAnMia("?seite=essen")).toBeNull();
  });
});

describe("Sicherer Abruf der Seite", () => {
  const deps = (html: string, status = 200) => ({ lookup: async () => ["93.184.216.34"], fetch: async () => new Response(html, { status }) });
  it("liefert HTML, lehnt Nicht-Seiten und private Adressen ab", async () => {
    await expect(fetchPage("https://example.com/r", deps("<html><head></head></html>"))).resolves.toContain("<html");
    await expect(fetchPage("https://example.com/r", deps("BEGIN:VCALENDAR"))).rejects.toThrow("Das ist keine Web-Seite.");
    await expect(fetchPage("https://example.com/r", deps("", 404))).rejects.toThrow(FeedError);
    await expect(fetchPage("http://example.com/r", deps("<html>"))).rejects.toThrow("Das ist kein Link – er beginnt mit https://.");
    await expect(fetchPage("https://intern/r", { lookup: async () => ["10.0.0.1"], fetch: async () => new Response("<html>") })).rejects.toThrow("Diese Adresse kann ich nicht abrufen.");
  });
});
