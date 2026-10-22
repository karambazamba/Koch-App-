// Tipps-Modell ohne Netz: Lizenzen, Sortierung (KARAMBA nie bevorzugt),
// Zeiträume, Kachel, Jetzt-Karte, Pinnwand-Satz, Filter, Etiketten, Icons
// und das Erkennen von Fragen.
import { describe, expect, it } from "vitest";
import {
  answerTips,
  groupByDay,
  inRange,
  isKaramba,
  jetztTip,
  matchesFilters,
  nearTips,
  needsAttribution,
  openLicense,
  pinboardText,
  rangeFor,
  rememberedTips,
  sortTips,
  tileTips,
  tileTitle,
  tipDate,
  tipTime,
  weekday,
  weekendKey,
  type TipView,
} from "@/lib/tipps/model";
import { filtersOf, tipIcon, tipTags } from "@/lib/tipps/categories";
import { tipQuestion } from "@/lib/tipps/question";
import { demoTips } from "@/lib/tipps/sources/demo";

const WED = "2026-10-21";
const FRI = "2026-10-23";
const SAT = "2026-10-24";
const SUN = "2026-10-25";
const EUTIN = { lat: 54.1376, lng: 10.6181 };
const all = (today = WED) => nearTips(demoTips(today), EUTIN, 40);
const base = all()[0];
const mk = (o: Partial<TipView>): TipView => ({ ...base, karamba: false, km: 1, drinnen: null, fuer_kinder: false, ganztags: false, ...o });

describe("Lizenzen und Kennzeichnung", () => {
  it("nur offene Lizenzen – auch „Public Domain“; Bilder nur mit offener Bild-Lizenz", () => {
    expect(openLicense("Public Domain Mark 1.0")).toBe(true);
    expect(openLicense("cc0")).toBe(true);
    expect(openLicense("CC BY-ND 4.0")).toBe(false);
    expect(openLicense(null)).toBe(false);
    expect(openLicense(undefined)).toBe(false);
    const withImg = { ...demoTips(WED)[0], bild_url: "https://example.org/a.jpg", bild_lizenz: "CC BY 4.0" };
    const closedImg = { ...withImg, id: "x", bild_lizenz: "© Fotograf" };
    const [a, b] = nearTips([withImg, closedImg], EUTIN, 40);
    expect(a.bild_url).toBe("https://example.org/a.jpg");
    expect(b.bild_url).toBeNull();
  });

  it("Urheber bei CC BY / CC BY-SA", () => {
    expect(needsAttribution("CC BY 4.0")).toBe(true);
    expect(needsAttribution(" cc by-sa 4.0")).toBe(true);
    expect(needsAttribution("CC0 1.0")).toBe(false);
  });

  it("KARAMBA nur mit genauem Namen, Groß/Klein und Leerzeichen egal", () => {
    expect(isKaramba({ veranstalter: " karamba  eis " })).toBe(true);
    expect(isKaramba({ veranstalter: "KARAMBA-Fanclub" })).toBe(false);
    expect(isKaramba({ veranstalter: null })).toBe(false);
  });

  it("Sortierung: Beginn → KARAMBA nur bei gleicher Zeit → Entfernung → Titel", () => {
    const list = [
      mk({ id: "k", titel: "Z", beginn: `${SAT}T14:00`, karamba: true, km: 9 }),
      mk({ id: "a", titel: "B", beginn: `${SAT}T14:00`, km: 1 }),
      mk({ id: "b", titel: "A", beginn: `${SAT}T14:00`, km: 1 }),
      mk({ id: "c", titel: "C", beginn: `${SAT}T13:59`, km: 30 }),
      mk({ id: "k2", titel: "K", beginn: `${SAT}T15:00`, karamba: true, km: 0 }),
    ];
    expect(sortTips(list).map((t) => t.id)).toEqual(["c", "k", "b", "a", "k2"]);
  });
});

describe("Zeiten und Zeiträume", () => {
  it("Datum, Uhrzeit ohne führende Null, ganztags ohne Uhrzeit", () => {
    expect(tipDate({ beginn: `${SAT}T08:00` })).toBe(SAT);
    expect(tipTime({ beginn: `${SAT}T08:00`, ganztags: false })).toBe("8:00");
    expect(tipTime({ beginn: `${SAT}T00:00`, ganztags: true })).toBeNull();
    expect(weekday(SUN)).toBe(6);
  });

  it("Heute, Woche, Wochenende (ab Freitag das laufende)", () => {
    expect(rangeFor("heute", WED)).toEqual({ von: WED, bis: WED });
    expect(rangeFor("woche", WED)).toEqual({ von: WED, bis: SUN });
    expect(rangeFor("wochenende", WED)).toEqual({ von: FRI, bis: SUN });
    expect(rangeFor("wochenende", SAT)).toEqual({ von: SAT, bis: SUN });
    expect(tileTitle(WED)).toBe("Tipps diese Woche");
    expect(tileTitle(FRI)).toBe("Tipps fürs Wochenende");
    expect(weekendKey(WED)).toBe(SAT);
    expect(weekendKey(SUN)).toBe(SAT);
    expect(inRange({ beginn: `${SAT}T10:00` }, FRI, SUN)).toBe(true);
    expect(inRange({ beginn: "2026-10-26T10:00" }, FRI, SUN)).toBe(false);
  });

  it("Gemerkt: nur ab heute, nach Zeit; nach Tag gruppiert", () => {
    const list = [mk({ id: "alt", beginn: "2026-10-20T10:00" }), mk({ id: "sa", beginn: `${SAT}T10:00` }), mk({ id: "fr", beginn: `${FRI}T10:00` }), mk({ id: "fr2", beginn: `${FRI}T12:00` })];
    expect(rememberedTips(list, ["alt", "sa", "fr"], WED).map((t) => t.id)).toEqual(["fr", "sa"]);
    expect(groupByDay(sortTips(list)).map((g) => [g.date, g.tips.length])).toEqual([["2026-10-20", 1], [FRI, 2], [SAT, 1]]);
  });
});

describe("Kachel und Jetzt-Karte", () => {
  it("Kachel: zwei bzw. vier, höchstens EIN KARAMBA pro Woche", () => {
    const list = sortTips([
      mk({ id: "k1", beginn: `${SAT}T09:00`, karamba: true }),
      mk({ id: "k2", beginn: `${SAT}T10:00`, karamba: true }),
      mk({ id: "a", beginn: `${SAT}T11:00` }),
      mk({ id: "b", beginn: `${SAT}T12:00` }),
      mk({ id: "z", beginn: "2026-10-27T12:00" }),
    ]);
    expect(tileTips(list, FRI).map((t) => t.id)).toEqual(["k1", "a"]);
    expect(tileTips(list, FRI, 4).map((t) => t.id)).toEqual(["k1", "a", "b"]);
    expect(tileTips(all(), WED, 4).filter((t) => t.karamba).length).toBeLessThanOrEqual(1);
  });

  it("Jetzt-Karte nur Fr ab 12 bis So 12 Uhr; ✕ = dieses Wochenende nicht mehr", () => {
    const tips = all(FRI);
    const o = { today: FRI, minutes: 13 * 60, rainy: null, kids: false, hiddenWeekend: null };
    expect(jetztTip(tips, { ...o, today: WED })).toBeNull();
    expect(jetztTip(tips, { ...o, minutes: 11 * 60 })).toBeNull();
    expect(jetztTip(tips, o)).not.toBeNull();
    expect(jetztTip(tips, { ...o, today: SAT })).not.toBeNull();
    expect(jetztTip(tips, { ...o, today: SUN, minutes: 11 * 60 })).not.toBeNull();
    expect(jetztTip(tips, { ...o, today: SUN, minutes: 12 * 60 })).toBeNull();
    expect(jetztTip(tips, { ...o, hiddenWeekend: SAT })).toBeNull();
  });

  it("passt zum Wetter und zu Kindern – KARAMBA nie von sich aus, Vergangenes nie", () => {
    const list = [
      mk({ id: "karamba", beginn: `${SAT}T14:00`, karamba: true, drinnen: true, fuer_kinder: true, km: 0 }),
      mk({ id: "drinnen", beginn: `${SAT}T15:00`, drinnen: true, km: 2 }),
      mk({ id: "draussen", beginn: `${SAT}T16:00`, drinnen: false, km: 2 }),
      mk({ id: "kinder", beginn: `${SAT}T17:00`, fuer_kinder: true, km: 2 }),
      mk({ id: "vorbei", beginn: `${SAT}T09:00`, drinnen: true, fuer_kinder: true, km: 0 }),
      mk({ id: "ganztag", beginn: `${SAT}T00:00`, ganztags: true, km: 30 }),
    ];
    const o = { today: SAT, minutes: 10 * 60, kids: false, hiddenWeekend: null };
    expect(jetztTip(list, { ...o, rainy: true })?.id).toBe("drinnen");
    expect(jetztTip(list, { ...o, rainy: false })?.id).toBe("draussen");
    expect(jetztTip(list, { ...o, rainy: null, kids: true })?.id).toBe("kinder");
    expect(jetztTip(list, { ...o, rainy: null })?.id).toBe("drinnen");
    expect(jetztTip([list[0]], { ...o, rainy: true })).toBeNull();
    expect(jetztTip([list[5]], { ...o, rainy: null })?.id).toBe("ganztag");
  });

  it("Pinnwand-Satz mit Wochentag, Uhrzeit ohne „:00“, höchstens 140 Zeichen", () => {
    expect(pinboardText({ titel: "Lauftreff", beginn: "2026-10-22T18:30", ganztags: false })).toBe("Wollen wir Do 18:30 Uhr zu „Lauftreff“?");
    expect(pinboardText({ titel: "Indoor", beginn: `${SUN}T00:00`, ganztags: true })).toBe("Wollen wir So zu „Indoor“?");
    expect(pinboardText({ titel: "x".repeat(200), beginn: `${SUN}T10:00`, ganztags: false })).toHaveLength(140);
  });
});

describe("Filter, Etiketten, Icons", () => {
  const like = (o: Partial<{ kategorien: string[]; fuer_kinder: boolean; drinnen: boolean | null; kostenlos: boolean; alter_ab: number | null; titel: string }>) => ({ kategorien: [], fuer_kinder: false, drinnen: null, kostenlos: false, ...o });

  it("drinnen schlägt „draußen“-Kategorie und umgekehrt", () => {
    expect(filtersOf(like({ kategorien: ["Strand"], drinnen: true }))).toEqual(["regen"]);
    expect(filtersOf(like({ kategorien: ["Museum"], drinnen: false }))).toEqual(["draussen"]);
    expect(filtersOf(like({ kategorien: ["Museum", "Strand"] })).sort()).toEqual(["draussen", "regen"]);
  });

  it("Etiketten in fester Reihenfolge mit Alter an zweiter Stelle", () => {
    expect(tipTags(like({ kategorien: ["Konzert"], fuer_kinder: true, kostenlos: true, alter_ab: 4 }))).toEqual(["Für Kinder", "ab 4 J.", "Kostenlos"]);
    expect(tipTags(like({ kategorien: ["Flohmarkt", "Lauf"], drinnen: false }), 5)).toEqual(["Markt", "Sport", "Draußen"]);
  });

  it("Icons nach Kategorie bzw. Titel", () => {
    expect(tipIcon(like({ kategorien: ["Chor"] }))).toBe("musik");
    expect(tipIcon(like({ titel: "Basar im Gemeindehaus" }))).toBe("markt");
    expect(tipIcon(like({ kategorien: ["Yoga"] }))).toBe("sport");
    expect(tipIcon(like({ kategorien: ["Theater"] }))).toBe("ticket");
    expect(tipIcon(like({ kategorien: ["Laterne"] }))).toBe("natur");
    expect(tipIcon(like({ fuer_kinder: true }))).toBe("kinder");
    expect(tipIcon(like({}))).toBe("herz");
  });

  it("Antwort ohne KI: Zeitraum, Filter, Ort (auch in der Adresse), höchstens 3", () => {
    const tips = all();
    const kids = answerTips(tips, { von: WED, bis: "2026-11-10", filters: ["kinder", "regen"], ort: null });
    expect(kids.length).toBeLessThanOrEqual(3);
    expect(kids.every((t) => matchesFilters(t, ["kinder", "regen"]))).toBe(true);
    expect(answerTips(tips, { von: WED, bis: "2026-11-10", filters: [], ort: "malente" }).every((t) => t.ort_name === "Malente")).toBe(true);
    expect(answerTips(tips, { von: WED, bis: "2026-11-10", filters: [], ort: "Kurpromenade" })[0]?.ort_name).toBe("Timmendorfer Strand");
  });
});

describe("Fragen nach Tipps erkennen", () => {
  it("Zeiträume: heute, morgen, Wochenende, diese Woche, Wochentag, sonst 7 Tage", () => {
    expect(tipQuestion("Was ist heute los?", WED)).toMatchObject({ von: WED, bis: WED, label: "heute" });
    expect(tipQuestion("Was ist morgen los?", WED)).toMatchObject({ von: "2026-10-22", label: "morgen" });
    expect(tipQuestion("Was ist am Wochenende los?", WED)).toMatchObject({ von: FRI, bis: SUN, label: "am Wochenende" });
    expect(tipQuestion("Veranstaltungen diese Woche", WED)).toMatchObject({ bis: SUN, label: "diese Woche" });
    expect(tipQuestion("Was können wir am Sonnabend unternehmen?", WED)).toMatchObject({ von: SAT, bis: SAT, label: "am Samstag" });
    expect(tipQuestion("Was läuft am Montag so los?", WED)).toMatchObject({ von: "2026-10-26" });
    expect(tipQuestion("Was geht los?", WED)).toMatchObject({ von: WED, bis: "2026-10-27", label: "in den nächsten Tagen" });
  });

  it("Filter und Ort", () => {
    const q = tipQuestion("Was können wir bei Regen mit den Kindern kostenlos machen?", WED)!;
    expect(q.filters).toEqual(["regen", "kinder", "kostenlos"]);
    expect(tipQuestion("Gibt’s heute was in Bad Segeberg?", WED)?.ort).toBe("Bad Segeberg");
    // Fehler bis v0.47: das Muster ohne i-Flag kannte nur „was“ klein – „Was ist heute in Malente?“ ging verloren
    expect(tipQuestion("Was ist heute in Malente?", WED)).toMatchObject({ ort: "Malente", von: WED, bis: WED });
    expect(tipQuestion("Was ist am Wochenende in Plön?", WED)).toMatchObject({ ort: "Plön", von: FRI });
    expect(tipQuestion("Tipps fürs Wochenende draußen mit Musik, Markt oder Sport", WED)?.filters).toEqual(["draussen", "musik", "maerkte", "sport"]);
  });

  it("nie Essen, Wetter, Termine", () => {
    expect(tipQuestion("Was gibt’s heute?", WED)).toBeNull();
    expect(tipQuestion("Was können wir heute kochen und essen machen?", WED)).toBeNull();
    expect(tipQuestion("Was ist am Wochenende los mit dem Wetter?", WED)).toBeNull();
  });
});
