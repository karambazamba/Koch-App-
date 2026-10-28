// Jetzt-Karte morgens (Tafel 60/98): nichts wiederholen, was eine Kachel zeigt
// (der Termin 9:15 steht schon in „Termine“). Ein besonderer Tag kommt zuerst:
// „Moin! Heute ist euer Jahrestag.“ – allein „dein“; Zeile 1 bleibt ≤ 32.
import { describe, expect, it } from "vitest";
import { TITLE_MAX, jetztTopics, moinZeile, type JetztInput } from "@/lib/heute/jetztTopics";
import { jetztInput as base, jetztTermin as termin } from "../helpers";

const H = (h: number, m = 0) => h * 60 + m;
const MORGEN_INFO = { title: "Moin! Zahnarzt 9:15", detail: "Rest vom Tag ist ruhig." };
const morgens = (extra: Partial<JetztInput> = {}) =>
  base(H(7, 30), {
    upcoming: [termin("Zahnarzt", "09:15")],
    routinen: { morgen: MORGEN_INFO, ueber: null, pack: null },
    ...extra,
  });
const texts = (x: JetztInput) => jetztTopics(x).map((t) => `${t.title} ${t.detail}`);

describe("Jetzt-Karte morgens: besonderer Tag zuerst", () => {
  it("Hochzeitstag kommt zuerst, mit „Moin!“ und „euer“", () => {
    const x = morgens({ jahrestagHeute: { key: "h", title: "Hochzeitstag" }, pin: { id: "p", author: "Lisa", text: "Bin um 18 Uhr da", when: "7:10" } });
    const [t] = jetztTopics(x);
    expect(t).toMatchObject({ kind: "jahrestag", title: "Moin! Heut is euer Hochzeitstag.", detail: "Was Schönes geplant?", button: "Erledigt" });
  });

  it("allein „dein“; Jahrestag passt ganz: „Moin! Heute ist euer Jahrestag.“", () => {
    expect(jetztTopics(morgens({ solo: true, jahrestagHeute: { key: "h", title: "Hochzeitstag" } }))[0].title).toBe("Moin! Heut is dein Hochzeitstag.");
    expect(jetztTopics(morgens({ jahrestagHeute: { key: "j", title: "Unser Jahrestag" } }))[0].title).toBe("Moin! Heute ist euer Jahrestag.");
  });

  it("Geburtstag heute: „Moin! Heute hat Lisa Geburtstag.“ vor einer Erinnerung mit mehr Punkten", () => {
    const x = morgens({ birthdays: [{ title: "Geburtstag Lisa", date: "2026-10-21", when: "heute" }], reminder: { key: "r", text: "Müll raus" } });
    expect(jetztTopics(x).map((t) => t.title)).toEqual(["Moin! Heute hat Lisa Geburtstag.", "Müll raus"]);
  });

  it("auch wenn Mia die Art sonst weniger angetippt sah", () => {
    const x = morgens({ jahrestagHeute: { key: "h", title: "Hochzeitstag" }, weights: { jahrestag: -6 }, pin: { id: "p", author: "Lisa", text: "Hi", when: "7:10" } });
    expect(jetztTopics(x)[0].kind).toBe("jahrestag");
  });

  it("nach dem Morgen ohne „Moin!“; abgehakt = weg", () => {
    expect(jetztTopics(base(H(11), { jahrestagHeute: { key: "h", title: "Hochzeitstag" } }))[0].title).toBe("Heute ist euer Hochzeitstag.");
    expect(texts(morgens({ jahrestagHeute: { key: "h", title: "Hochzeitstag" }, hidden: ["jahrestag:h"] })).join()).not.toContain("Hochzeitstag");
  });

  it("Zeile 1 nie länger als 32 Zeichen", () => {
    for (const rest of ["euer Hochzeitstag", "Annemarie-Luise Geburtstag", "Hochzeitstag Oma und Opa Petersen"]) expect(moinZeile({ verb: "ist", rest }).length <= TITLE_MAX || !moinZeile({ verb: "ist", rest }).startsWith("Moin")).toBe(true);
    const x = morgens({ jahrestagHeute: { key: "o", title: "Hochzeitstag Oma und Opa Petersen" } });
    expect(jetztTopics(x)[0].title.length).toBeLessThanOrEqual(TITLE_MAX);
  });
});

describe("Jetzt-Karte morgens: nichts, was eine Kachel zeigt", () => {
  it("Termin 9:15 nicht wiederholen, wenn die Termine-Kachel steht", () => {
    expect(texts(morgens()).join()).not.toMatch(/9:15|Zahnarzt/);
  });

  it("sonst ein Thema, das keine Kachel zeigt (Pinnwand-Nachricht)", () => {
    const [t] = jetztTopics(morgens({ pin: { id: "p", author: "Lisa", text: "Bin um 18 Uhr da", when: "7:10" } }));
    expect(t.kind).toBe("pinnwand");
  });

  it("nichts Passendes: Spruch bzw. „Alles ruhig“ statt der Termine", () => {
    expect(jetztTopics(morgens())[0].kind).toBe("ruhig");
    expect(jetztTopics(morgens({ spruch: "Kaffee zuerst." }))[0].kind).toBe("spruch");
  });

  it("ohne Termine-Kachel darf die Morgen-Info die Termine nennen", () => {
    const x = morgens({ tiles: ["pinnwand", "wetter", "aufgaben", "essen", "einkauf"] });
    expect(jetztTopics(x)[0]).toMatchObject({ kind: "morgen", title: "Moin! Zahnarzt 9:15" });
  });

  it("am besonderen Tag nur EIN „Moin!“ – auch ohne Termine-Kachel", () => {
    const x = morgens({ tiles: ["pinnwand"], jahrestagHeute: { key: "h", title: "Hochzeitstag" } });
    expect(jetztTopics(x).filter((t) => t.title.startsWith("Moin")).length).toBe(1);
  });
});
