import { describe, expect, it } from "vitest";
import { birthdayName, jetztTone, jetztTopics, type JetztInput } from "@/lib/jetzt/topics";
import { jetztCommand } from "@/lib/jetzt/command";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";

const TODAY = "2026-10-21";

const base = (minutes: number, extra: Partial<JetztInput> = {}): JetztInput => ({
  minutes,
  today: TODAY,
  calm: false,
  upcoming: [],
  tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [], weather: null },
  urgent: [],
  dueToday: [],
  allDone: false,
  pin: null,
  weatherTip: null,
  weatherNow: null,
  dish: null,
  dinnerFree: false,
  birthdays: [],
  sport: null,
  shop: null,
  timer: null,
  cookingStep: null,
  reminder: null,
  pause: null,
  leisure: null,
  tip: null,
  demo: false,
  firstTiles: [],
  weights: {},
  hidden: [],
  ...extra,
});

const termin = (title: string, time: string, extra = {}) => ({ key: `${title}@${TODAY}`, title, time, date: TODAY, ...extra });

describe("Jetzt-Karte: Punktesystem", () => {
  it("Termin in weniger als 60 Minuten gewinnt – mit Ort als Detail", () => {
    const t = jetztTopics(base(15 * 60 + 35, { upcoming: [termin("Zahnarzt", "16:15", { place: "Praxis am Markt" })], pin: { id: "p1", author: "Lisa", text: "Darf Ben kommen?", when: "7:48" } }));
    expect(t[0].title).toBe("In 40 Min: Zahnarzt");
    expect(t[0].detail).toBe("16:15 · Praxis am Markt");
    expect(t[1].kind).toBe("pinnwand");
  });

  it("morgens ohne Besonderes: Wetter kurz + erster Termin", () => {
    const t = jetztTopics(base(7 * 60 + 10, { upcoming: [termin("Kaffeepause", "08:15")], weatherNow: { temp: 8, text: "Bewölkt", range: "6 bis 14°" } }));
    expect(t[0].title).toBe("8° · 8:15 Kaffeepause");
  });

  it("Regen zur Termin-Zeit: Tipp schlägt reine Info", () => {
    const t = jetztTopics(base(8 * 60, { upcoming: [termin("Abholung", "15:00")], weatherTip: "☂️ Ab 15 Uhr Regen – Schirm für Abholung", weatherNow: { temp: 9, text: "Bewölkt" } }));
    expect(t[0].title).toBe("Ab 15 Uhr Regen – Schirm für Abholung ☂️");
  });

  it("ab 15 Uhr: Essen mit Startzeit (Essenszeit − Kochdauer)", () => {
    const t = jetztTopics(base(16 * 60 + 40, { dish: { name: "Pasta & Burrata", clock: "18:30", minutes: 25, ready: true, missing: [] } }));
    expect(t[0].title).toBe("Pasta & Burrata – alles im Haus");
    expect(t[0].detail).toBe("Start 18:05 · Essen 18:30");
  });

  it("ab 15 Uhr ohne Gericht: drei Ideen", () => {
    const t = jetztTopics(base(16 * 60, { dinnerFree: true }));
    expect(t[0].kind).toBe("ideen");
  });

  it("ab 19 Uhr: Morgen mit Wochentag", () => {
    const t = jetztTopics(base(20 * 60 + 30, { tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [{ title: "Kita", time: "08:00" }, { title: "Elternsprechtag", time: "16:00" }] } }));
    expect(t[0].title).toBe("Morgen · Do: 8:00 Kita · 16:00 Elternsprechtag");
  });

  it("nachts nur „Morgen …“ – nichts Dringendes", () => {
    const t = jetztTopics(base(23 * 60, { urgent: [{ key: "a", title: "Kita-Formular" }], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [{ title: "Kita", time: "08:00" }] } }));
    expect(t.map((x) => x.kind)).toEqual(["morgen"]);
  });

  it("Feierabend/Wochenende: nur sanfte Themen (keine Fristen, keine Arbeit)", () => {
    const t = jetztTopics(base(17 * 60, { calm: true, urgent: [{ key: "a", title: "Kita-Formular" }], upcoming: [termin("Meeting", "17:30", { work: true })] }));
    expect(t.some((x) => x.kind === "dringend" || x.kind === "termin")).toBe(false);
  });

  it("höchstens drei Themen, nie leer", () => {
    expect(jetztTopics(base(12 * 60))).toHaveLength(1);
    expect(jetztTopics(base(12 * 60))[0].kind).toBe("ruhig");
    const many = jetztTopics(base(15 * 60 + 30, { upcoming: [termin("Zahnarzt", "16:00")], pin: { id: "p", author: "Lisa", text: "Hi", when: "7:48" }, urgent: [{ key: "u", title: "Formular" }], dinnerFree: true, sport: { left: 1, today: null } }));
    expect(many).toHaveLength(3);
  });

  it("✕ blendet für heute aus", () => {
    const input = base(15 * 60 + 35, { upcoming: [termin("Zahnarzt", "16:15")] });
    const first = jetztTopics(input)[0];
    expect(jetztTopics({ ...input, hidden: [first.id] }).some((t) => t.id === first.id)).toBe(false);
  });

  it("Interesse: oft Angetipptes steigt, Weggewischtes sinkt", () => {
    const input = base(16 * 60, { pin: { id: "p", author: "Lisa", text: "Hi", when: "7:48" }, urgent: [{ key: "u", title: "Formular" }] });
    expect(jetztTopics(input)[0].kind).toBe("pinnwand");
    expect(jetztTopics({ ...input, weights: { dringend: 6, pinnwand: -6 } })[0].kind).toBe("dringend");
  });

  it("was die Kachel darunter zeigt, rutscht ohne Tipp nach hinten", () => {
    const input = base(16 * 60, { pin: { id: "p", author: "Lisa", text: "Hi", when: "7:48" }, urgent: [{ key: "u", title: "Formular" }] });
    expect(jetztTopics({ ...input, firstTiles: ["pinnwand", "wetter"] })[0].kind).toBe("dringend");
  });

  it("Erinnerung und laufender Timer gehen vor", () => {
    const t = jetztTopics(base(18 * 60, { timer: { name: "Nudeln", left: "noch 4 Min" }, reminder: { key: "r", text: "In 30 Minuten: Jonne abholen." } }));
    expect(t.map((x) => x.kind).slice(0, 2)).toEqual(["erinnerung", "timer"]);
  });

  it("Geburtstag heute/morgen", () => {
    const t = jetztTopics(base(10 * 60, { birthdays: [{ title: "Omas Geburtstag", date: "2026-10-22", when: "morgen" }] }));
    expect(t[0].title).toBe("Morgen hat Oma Geburtstag 🎂");
    expect(birthdayName("Geburtstag Klaus")).toBe("Klaus");
    expect(birthdayName("Klaus Geburtstag")).toBe("Klaus");
    expect(birthdayName("Lena's Geburtstag 🎂")).toBe("Lena");
    expect(birthdayName("Zahnarzt")).toBeNull();
  });

  it("Beispiel-Tag: nachmittags das Beispielgericht", () => {
    const t = jetztTopics(base(16 * 60 + 40, { demo: true, dish: { name: "Pasta mit Tomaten & Burrata", clock: "18:30", minutes: 25, ready: true, missing: [], demo: true } }));
    expect(t[0].kind).toBe("essen");
    expect(t.some((x) => x.kind === "beispiel")).toBe(true);
  });

  it("nie Druck-Wörter", () => {
    const t = jetztTopics(base(16 * 60, { dish: { name: "Pasta", clock: "18:30", minutes: 25, ready: false, missing: ["Basilikum"] }, dueToday: [{ key: "d", title: "Formular" }] }));
    const text = t.map((x) => `${x.title} ${x.detail}`).join(" ");
    expect(text).not.toMatch(/fehlt|überfällig|offen|verpasst|Alles da|musst|solltest/i);
  });
});

describe("Jetzt-Karte: Farbe je Tageszeit", () => {
  it("morgens gelb, tagsüber orange, abends blau", () => {
    expect(jetztTone(7 * 60 + 10)).toBe("morgen");
    expect(jetztTone(16 * 60 + 40)).toBe("tag");
    expect(jetztTone(20 * 60 + 30)).toBe("abend");
    expect(jetztTone(23 * 60)).toBe("abend");
  });
});

describe("Jetzt-Karte per Sprache (ohne KI)", () => {
  it("an/aus – auch die alten Sätze zur Startseite", () => {
    expect(jetztCommand("Blende die Jetzt-Karte aus")).toBe(false);
    expect(jetztCommand("Zeig die Jetzt-Karte wieder")).toBe(true);
    expect(jetztCommand("Lass die Startseite immer gleich")).toBe(false);
    expect(jetztCommand("Die Startseite soll mitdenken")).toBe(true);
    expect(jetztCommand("Was steht heute an?")).toBeNull();
  });
});

describe("Eine feste Kachel-Anordnung", () => {
  it("Standard: Pinnwand + Wetter klein nebeneinander, Termine, Aufgaben, Essen + Einkauf – ohne Morgen", () => {
    const shown = DEFAULT_HOME.filter((t) => t.visible && t.id !== "vorrat");
    expect(shown.map((t) => `${t.id}:${t.size}`)).toEqual(["pinnwand:S", "wetter:S", "termine:M", "aufgaben:M", "essen:S", "einkauf:S"]);
  });
});

describe("Einkauf nach Läden", () => {
  it("Jetzt-Karte nachmittags: „Auf dem Heimweg? 3 Sachen bei REWE“", () => {
    const t = jetztTopics(base(17 * 60, { shop: { shop: "REWE", names: ["Milch", "Brot", "Butter"] } }));
    expect(t[0].title).toBe("Auf dem Heimweg? 3 Sachen bei REWE");
    expect(t[0].detail).toBe("Milch, Brot, Butter");
    expect(jetztTopics(base(10 * 60, { shop: { shop: "REWE", names: ["Milch", "Brot"] } })).some((x) => x.kind === "einkauf")).toBe(false);
  });

  it("Läden gruppieren: meiste zuerst, „Egal wo“ zuletzt, feste Farbe", async () => {
    const { shopGroups, shopTone } = await import("@/lib/einkauf/shopGroups");
    const g = shopGroups([{ name: "Milch", shop: "REWE" }, { name: "Zahnpasta", shop: "dm" }, { name: "Brot", shop: "REWE" }, { name: "Salz", shop: "" }]);
    expect(g.map((x) => `${x.shop ?? "Egal wo"}:${x.names.join(",")}`)).toEqual(["REWE:Milch,Brot", "dm:Zahnpasta", "Egal wo:Salz"]);
    expect(shopTone("REWE")).toBe(shopTone("rewe"));
    expect(shopTone("REWE")).toBeGreaterThanOrEqual(1);
  });
});

describe("Läden ohne Logos", () => {
  it("Symbol nach Ladentyp und feste Farben für bekannte Läden", async () => {
    const { shopType, SHOP_TYPE_ICON, shopTone } = await import("@/lib/einkauf/shopGroups");
    expect(["REWE", "EDEKA", "Lidl", "Biomarkt", "dm", "Bäcker", "Wochenmarkt", "Hofcafé"].map((n) => SHOP_TYPE_ICON[shopType(n)]).join("")).toBe("🛒🛒🛒🌿🧴🥖🥕🏪");
    expect([shopTone("REWE"), shopTone("EDEKA"), shopTone("Lidl")]).toEqual([1, 2, 4]);
  });
});
