import { describe, expect, it } from "vitest";
import { applyHouseholdIntro, householdIntroFrom, householdIntroReply, householdIntroSummary, parseHouseholdIntro } from "@/lib/einstellungen/householdIntro";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { applyOps } from "@/lib/begleitung/ops";
import { previewRows } from "@/lib/begleitung/preview";
import { daten, haushalt, kontext, letzte, rufe } from "../begleitung/werkzeugKontext";
import { afterTools, ask, context } from "../begleitung/testmodusHilfen";

describe("„Ich bin Felix, wir sind Lisa und drei Kinder“ (ohne KI)", () => {
  it.each([
    ["Ich bin Felix, wir sind Lisa und drei Kinder", { me: "Felix", adults: ["Lisa"], kids: [], moreKids: 3, single: false }],
    ["Ich bin Felix, wir sind Lisa und drei Kinder: Mathis, Ella und Jonne", { me: "Felix", adults: ["Lisa"], kids: ["Mathis", "Ella", "Jonne"], moreKids: 0 }],
    ["Hier ist Tom. Ich wohne mit meiner Frau Lisa und unseren zwei Kindern", { me: "Tom", adults: ["Lisa"], moreKids: 2 }],
    ["Ich heiße Anna und wohne allein", { me: "Anna", single: true, adults: [], moreKids: 0 }],
    ["Wir sind Lisa, ich und die Kinder Mathis und Ella", { me: null, adults: ["Lisa"], kids: ["Mathis", "Ella"] }],
    ["Ich heiße Felix", { me: "Felix", adults: [], kids: [], moreKids: 0 }],
    ["Ich bin Jörg, wir sind Özlem und ein Kind", { me: "Jörg", adults: ["Özlem"], moreKids: 1 }],
  ])("%s", (sentence, expected) => {
    expect(parseHouseholdIntro(sentence)).toMatchObject(expected);
  });

  it.each(["Morgen 16 Uhr Zahnarzt", "Ich bin Freitag weg", "Ich bin müde", "wir sind morgen beim Arzt", "Wir sind zu viert", "Ich bin Freitag.", "Ich bin Entdecker", "Ich bin Felix"])("kein Haushalt: %s", (sentence) => {
    expect(parseHouseholdIntro(sentence)).toBeNull();
  });
});

describe("Übernehmen ins Profil", () => {
  it("füllt die leeren Platzhalter des ersten Starts", () => {
    const start = createEmptyProfile();
    const next = applyHouseholdIntro(start, parseHouseholdIntro("Ich bin Felix, wir sind Lisa und drei Kinder")!);
    expect(next.persons.map((p) => [p.role, p.name])).toEqual([
      ["erwachsen", "Felix"],
      ["erwachsen", "Lisa"],
      ["kind", ""],
      ["kind", ""],
      ["kind", ""],
    ]);
    expect(next.persons[0].id).toBe(start.persons[0].id);
    expect(next.persons[2].id).toBe(start.persons[2].id);
    expect([next.adults, next.kids, next.householdType]).toEqual([2, 3, "familie"]);
  });

  it("schon eingetragene Personen bleiben, Namen werden nicht doppelt", () => {
    const next = applyHouseholdIntro(haushalt(), parseHouseholdIntro("Wir sind Lisa und die Kinder Mathis und Ella")!);
    expect(next.persons.map((p) => p.name)).toEqual(["Felix", "Lisa", "Mathis", "Ella"]);
    expect(next.persons.find((p) => p.name === "Mathis")?.allergies).toEqual(["Nüsse"]);
    expect(next.persons.find((p) => p.name === "Lisa")?.dislikes).toEqual(["Pilze"]);
  });

  it("allein: nur ich, leere Platzhalter fallen weg", () => {
    const next = applyHouseholdIntro(createEmptyProfile(), parseHouseholdIntro("Ich heiße Anna und wohne allein")!);
    expect(next.persons.map((p) => p.name)).toEqual(["Anna"]);
    expect(next.householdType).toBe("single");
  });

  it("nur der Name: der Rest bleibt, wie er ist", () => {
    const start = createEmptyProfile();
    const next = applyHouseholdIntro(start, { me: "Felix", adults: [], kids: [], moreKids: 0, single: false });
    expect(next.persons).toHaveLength(start.persons.length);
    expect([next.persons[0].name, next.householdType]).toEqual(["Felix", start.householdType]);
  });

  it("Vorschau, Antwort und Op `set_household`", () => {
    const intro = parseHouseholdIntro("Ich bin Felix, wir sind Lisa und drei Kinder")!;
    const start = { ...daten(), profile: createEmptyProfile() };
    expect(householdIntroSummary(intro, start.profile)).toBe("Felix · Lisa · 3 Kinder · Familie");
    expect(householdIntroReply(intro)).toBe("Schön, dich kennenzulernen, Felix! So trage ich euch ein – passt das?");
    expect(householdIntroReply({ ...intro, adults: [], moreKids: 0 })).toBe("Schön, dich kennenzulernen, Felix! Soll ich mir deinen Namen merken?");
    const op = { id: "h1", type: "set_household" as const, intro };
    expect(previewRows(start, [op], new Set(["h1"]))[0]).toMatchObject({ group: "Familie", after: "Felix · Lisa · 3 Kinder · Familie" });
    const { data } = applyOps(start, [op]);
    expect(data.profile.persons.map((p) => p.name).slice(0, 2)).toEqual(["Felix", "Lisa"]);
    expect(data.profile.kids).toBe(3);
  });
});

describe("KI-Werkzeug haushalt_vorstellen", () => {
  it("schlägt vor (mit Übernehmen) und prüft die Eingabe", () => {
    const ctx = kontext();
    expect(rufe(ctx, "haushalt_vorstellen", { ich: "Felix", erwachsene: ["Lisa"], weitere_kinder: 3 }).content).toMatch(/^Vorgemerkt/);
    expect(letzte(ctx)).toMatchObject({ type: "set_household", intro: { me: "Felix", adults: ["Lisa"], moreKids: 3 } });
    expect(rufe(kontext(), "haushalt_vorstellen", {}).content).toMatch(/nichts zu ändern/);
    expect(householdIntroFrom({ ich: "<b>Tom</b>", weitere_kinder: 99, allein: false })).toMatchObject({ me: "bTomb", moreKids: 8 });
    expect(householdIntroFrom({ allein: true, erwachsene: ["Lisa"] })).toMatchObject({ single: true, adults: [] });
  });

  it("Testmodus: erster Satz → Werkzeug, danach eine kurze Antwort", async () => {
    const S = context();
    const r = await ask(S, "Ich bin Felix, wir sind Lisa und drei Kinder");
    expect(r.uses[0]).toMatchObject({ name: "haushalt_vorstellen", input: { ich: "Felix", erwachsene: ["Lisa"], weitere_kinder: 3 } });
    const done = await afterTools(S, "Ich bin Felix", [{ name: "haushalt_vorstellen" }], { haushalt_vorstellen: "Vorgemerkt (mit \"Übernehmen\"): Felix · Lisa · 3 Kinder · Familie. Antworte kurz und herzlich." });
    expect(done.text).toBe("Schön, euch kennenzulernen! Felix · Lisa · 3 Kinder · Familie – tipp unten auf Übernehmen. (Testmodus)");
  });
});
