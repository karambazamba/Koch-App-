import { afterEach, describe, expect, it } from "vitest";
import { answerTips, distanceKm, isKaramba, jetztTip, nearTips, openLicense, pinboardText, rangeFor, rememberedTips, sortTips, tileTips, tileTitle, weekendKey, type TipView } from "@/lib/tipps/model";
import { filtersOf, tipTags } from "@/lib/tipps/categories";
import { tipQuestion } from "@/lib/tipps/question";
import { demoTips, DemoTipSource } from "@/lib/tipps/sources/demo";
import { SCHLESWIG_HOLSTEIN } from "@/lib/tipps/sources/types";
import { TldbTipSource } from "@/lib/tipps/sources/tldb";
import { tipsMode, tipsNear } from "@/lib/tipps/server";
import { sanitizeEntry, terminExtras } from "@/lib/kalender/model";

const EUTIN = { lat: 54.1376, lng: 10.6181 };
const WED = "2026-10-21"; // Mittwoch
const view = (today = WED) => nearTips(demoTips(today), EUTIN, 40);

afterEach(() => {
  delete process.env.TIPS_SOURCE;
});

describe("Tipps aus der Region – Modell", () => {
  it("Entfernung und Umkreis", () => {
    expect(distanceKm(EUTIN, { lat: 54.1725, lng: 10.5594 })).toBeGreaterThan(4);
    expect(distanceKm(EUTIN, { lat: 54.1725, lng: 10.5594 })).toBeLessThan(6);
    const near = nearTips(demoTips(WED), EUTIN, 20);
    expect(near.every((t) => t.km <= 20)).toBe(true);
    expect(near.some((t) => t.ort_name === "Lübeck")).toBe(false);
    expect(view().some((t) => t.ort_name === "Lübeck")).toBe(true);
  });

  it("nur offene Lizenzen (CC0, CC BY, CC BY-SA)", () => {
    expect(openLicense("CC0 1.0")).toBe(true);
    expect(openLicense("CC BY 4.0")).toBe(true);
    expect(openLicense("CC BY-SA 4.0")).toBe(true);
    expect(openLicense("CC BY-NC 4.0")).toBe(false);
    expect(openLicense("Alle Rechte vorbehalten")).toBe(false);
    const closed = { ...demoTips(WED)[0], lizenz: "proprietär" };
    expect(nearTips([closed], EUTIN, 40)).toEqual([]);
  });

  it("KARAMBA gekennzeichnet, nicht bevorzugt – nur bei gleicher Zeit zuerst", () => {
    expect(isKaramba({ veranstalter: "KARAMBA Eis" })).toBe(true);
    expect(isKaramba({ veranstalter: "Stadt Eutin" })).toBe(false);
    const a = { beginn: "2026-10-24T14:00", titel: "A", karamba: false };
    const k = { beginn: "2026-10-24T14:00", titel: "Z", karamba: true };
    const early = { beginn: "2026-10-24T10:00", titel: "B", karamba: false };
    expect(sortTips([a, k, early]).map((t) => t.titel)).toEqual(["B", "Z", "A"]);
  });

  it("Zeiträume Heute | Wochenende | Diese Woche", () => {
    expect(rangeFor("heute", WED)).toEqual({ von: WED, bis: WED });
    expect(rangeFor("wochenende", WED)).toEqual({ von: "2026-10-23", bis: "2026-10-25" });
    expect(rangeFor("wochenende", "2026-10-24")).toEqual({ von: "2026-10-24", bis: "2026-10-25" });
    expect(rangeFor("woche", WED)).toEqual({ von: WED, bis: "2026-10-25" });
    expect(tileTitle(WED)).toBe("Tipps diese Woche");
    expect(tileTitle("2026-10-23")).toBe("Tipps fürs Wochenende");
    expect(weekendKey("2026-10-23")).toBe("2026-10-24");
    expect(weekendKey("2026-10-25")).toBe("2026-10-24");
  });

  it("Kachel: höchstens ein KARAMBA-Eintrag pro Woche", () => {
    const k1 = { ...view()[0], id: "k1", karamba: true, beginn: "2026-10-24T09:00" };
    const k2 = { ...view()[0], id: "k2", karamba: true, beginn: "2026-10-24T09:30" };
    const n = { ...view()[0], id: "n", karamba: false, beginn: "2026-10-24T10:00" };
    expect(tileTips([k1, k2, n] as TipView[], "2026-10-23").map((t) => t.id)).toEqual(["k1", "n"]);
  });

  it("Jetzt-Karte: Fr ab 12 Uhr bis So Mittag, passend zu Wetter und Kindern, weggewischt = Wochenende aus", () => {
    const tips = view("2026-10-23");
    expect(jetztTip(tips, { today: "2026-10-23", minutes: 11 * 60, rainy: null, kids: false, hiddenWeekend: null })).toBeNull();
    expect(jetztTip(tips, { today: WED, minutes: 15 * 60, rainy: null, kids: false, hiddenWeekend: null })).toBeNull();
    const rain = jetztTip(tips, { today: "2026-10-23", minutes: 13 * 60, rainy: true, kids: true, hiddenWeekend: null });
    expect(rain?.drinnen).toBe(true);
    expect(rain?.fuer_kinder).toBe(true);
    expect(rain?.karamba).toBe(false);
    const sun = jetztTip(tips, { today: "2026-10-23", minutes: 13 * 60, rainy: false, kids: false, hiddenWeekend: null });
    expect(sun?.drinnen).toBe(false);
    expect(jetztTip(tips, { today: "2026-10-24", minutes: 10 * 60, rainy: null, kids: false, hiddenWeekend: "2026-10-24" })).toBeNull();
    expect(jetztTip(tips, { today: "2026-10-25", minutes: 13 * 60, rainy: null, kids: false, hiddenWeekend: null })).toBeNull();
  });

  it("Pinnwand-Satz und Antworten nur aus den Tipps", () => {
    const kino = view().find((t) => t.quelle_id === "kinderkino")!;
    expect(pinboardText(kino)).toBe("Wollen wir Sa 15 Uhr zu „Kinderkino: Die Schule der magischen Tiere“?");
    const sat = answerTips(view(), { von: "2026-10-24", bis: "2026-10-24", filters: ["kinder", "regen"], ort: null });
    expect(sat.length).toBeGreaterThan(0);
    expect(sat.length).toBeLessThanOrEqual(3);
    expect(sat.every((t) => t.fuer_kinder && t.drinnen)).toBe(true);
    expect(answerTips(view(), { von: WED, bis: WED, filters: [], ort: "Malente" }).every((t) => t.ort_name === "Malente")).toBe(true);
    expect(answerTips(view(), { von: WED, bis: WED, filters: [], ort: "Hamburg" })).toEqual([]);
  });

  it("Filter und Etiketten", () => {
    const orgel = view().find((t) => t.quelle_id === "orgel")!;
    expect(filtersOf(orgel)).toEqual(expect.arrayContaining(["musik", "regen", "kostenlos"]));
    expect(filtersOf(orgel)).not.toContain("draussen");
    const kino = view().find((t) => t.quelle_id === "kinderkino")!;
    expect(tipTags(kino)).toEqual(["Für Kinder", "ab 6 J.", "Drinnen"]);
  });
});

describe("Tipps aus der Region – Fragen an Mia", () => {
  it("erkennt Tipp-Fragen, nie Essen", () => {
    expect(tipQuestion("Was ist am Wochenende los?", WED)).toMatchObject({ von: "2026-10-23", bis: "2026-10-25", filters: [] });
    expect(tipQuestion("Was können wir bei Regen mit den Kindern machen?", WED)?.filters).toEqual(["regen", "kinder"]);
    expect(tipQuestion("Gibt’s heute was in Malente?", WED)).toMatchObject({ von: WED, bis: WED, ort: "Malente" });
    expect(tipQuestion("Was gibt's heute?", WED)).toBeNull();
    expect(tipQuestion("Was können wir heute essen?", WED)).toBeNull();
    expect(tipQuestion("Wie wird das Wetter am Wochenende?", WED)).toBeNull();
  });
});

describe("Tipps aus der Region – Quellen", () => {
  it("Beispieldaten: ~15 Veranstaltungen in den nächsten 2 Wochen, eine von KARAMBA", async () => {
    const all = await new DemoTipSource(WED).fetchRange(WED, "2026-11-04", SCHLESWIG_HOLSTEIN);
    expect(all.length).toBeGreaterThanOrEqual(15);
    expect(all.every((t) => t.beginn.slice(0, 10) >= WED && t.beginn.slice(0, 10) <= "2026-11-04")).toBe(true);
    expect(all.filter((t) => isKaramba(t)).length).toBe(1);
    expect(all.every((t) => t.quelle === "demo" && openLicense(t.lizenz))).toBe(true);
  });

  it("Landesdatenbank: Gerüst ohne Zugang liefert nichts", async () => {
    expect(await new TldbTipSource(undefined, undefined).fetchRange(WED, WED, SCHLESWIG_HOLSTEIN)).toEqual([]);
  });

  it("TIPS_SOURCE=off (Standard): nirgends Tipps", async () => {
    expect(tipsMode()).toBe("off");
    expect(await tipsNear({ ort: "Eutin", km: 20, von: WED, bis: WED })).toEqual({ source: "off", ort: null, tips: [] });
    process.env.TIPS_SOURCE = "demo";
    const demo = await tipsNear({ ort: "Eutin", km: 20, von: WED, bis: "2026-10-30", today: WED });
    expect(demo.source).toBe("demo");
    expect(demo.tips.length).toBeGreaterThan(5);
  });
});

describe("Übernommener Tipp = normaler Termin", () => {
  it("Notiz und Link bleiben im Termin erhalten", () => {
    const e = sanitizeEntry({ id: "x", typ: "termin", raum: "familie", data: { title: "Kinderkino", date: "2026-10-24", start: "15:00", reminder: "60", note: "aus Tipps", link: "https://example.org/kino", who: ["p1"] } });
    expect(e?.data).toMatchObject({ note: "aus Tipps", link: "https://example.org/kino", who: ["p1"] });
    expect(sanitizeEntry({ id: "y", typ: "termin", data: { title: "X", date: "2026-10-24", start: "15:00", link: "javascript:alert(1)" } })?.data).not.toHaveProperty("link", "javascript:alert(1)");
  });
});

describe("Tipps Schritt 2: Gemerkt und Link im Termin", () => {
  it("Gemerkt zeigt nur gemerkte Tipps ab heute, nach Zeit", () => {
    const tips = view();
    const [a, b] = sortTips(tips).slice(-2);
    const past = { ...a, id: "alt", beginn: "2026-10-01T10:00:00" };
    const out = rememberedTips([...tips, past], [b.id, a.id, "alt", "weg"], WED);
    expect(out.map((t) => t.id)).toEqual([a.id, b.id]);
    expect(rememberedTips(tips, [], WED)).toEqual([]);
  });

  it("Bearbeiten im Formular behält Link und „aus Tipps“ (Fehler bis v0.45)", () => {
    expect(terminExtras({ note: "aus Tipps", link: "https://example.org/kino" })).toEqual({ note: "aus Tipps", link: "https://example.org/kino" });
    expect(terminExtras(undefined)).toEqual({});
    expect(terminExtras({ note: "", link: undefined })).toEqual({});
  });
});
