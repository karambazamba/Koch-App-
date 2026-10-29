// A-058: Sonne den ganzen Tag (Tagesentscheidung, gemerkt pro Tag) und
// Herbstblätter nur bei Wind (6–8 Blätter, Mia kneift die Augen) – mit
// überschriebenem now() und Speicher über `wasgibts.miazubehoer`.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { berlinTime, setNowForTests } from "@/lib/core/now";
import { miaLook, miaMoment, miaWetter, sonnigerTag, sonnigeStunde, type MiaLage } from "@/lib/mia/zubehoer";
import { migrateZubehoer, momentJetzt, tagSonnig } from "@/lib/mia/zubehoerSpeicher";
import { STORAGE } from "@/lib/core/storage";
import { fakeWindow } from "../helpers";

type Stunde = { date: string; hour: number; temp: number; code: number; mm: number; rain: number; gust: number; sun: number; wind?: number };

/** Winterzeit (ab 25.10.2026): Berlin = UTC+1, Sommer = UTC+2 */
const um = (date: string, clock: string) => setNowForTests(new Date(`${date}T${clock}:00${date >= "2026-10-25" && date < "2027-03-28" ? "+01:00" : "+02:00"}`));

/** Ein ganzer Tag: Code 2, 13 °C mittags, kaum Wind – einzelne Stunden überschreibbar */
function tag(date: string, extra: Record<number, Partial<Stunde>> = {}, basis: Partial<Stunde> = {}): Stunde[] {
  return Array.from({ length: 24 }, (_, hour) => ({ date, hour, temp: hour === 12 ? 13 : 10, code: 2, mm: 0, rain: 5, gust: 15, sun: 20, wind: 8, ...basis, ...extra[hour] }));
}

/** Wie Mia aussieht – so wie `useMiaLook` rechnet (Uhr aus now(), Tagesentscheidung gemerkt) */
function lageJetzt(hours: Stunde[], extra: Partial<MiaLage> = {}): MiaLage {
  const t = berlinTime();
  return { date: t.iso, minutes: t.minutes, wetter: miaWetter(hours, t.iso, t.minutes, tagSonnig(hours)), geburtstag: false, kochen: false, ...extra };
}

let win: ReturnType<typeof fakeWindow>;
beforeEach(() => {
  win = fakeWindow();
  vi.stubGlobal("window", win);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setNowForTests(null);
});

describe("Sonne den ganzen Tag (A-058)", () => {
  const heute = "2026-10-29";

  it("29.10. mit Code 2 und 13 °C mittags → Sonne", () => {
    um(heute, "12:00");
    expect(miaLook(lageJetzt(tag(heute))).zubehoer).toBe("sonne");
  });

  it("eine Stunde mit Code 3 dazwischen → die Sonne bleibt", () => {
    const hours = tag(heute, { 13: { code: 3, sun: 0 } });
    um(heute, "12:00");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("sonne");
    um(heute, "13:20");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("sonne");
  });

  it("Regen in der nächsten Stunde → Schirm, danach wieder Sonne", () => {
    const hours = tag(heute, { 13: { code: 61, mm: 1.2, rain: 80, sun: 0 } });
    um(heute, "12:10");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("schirm");
    um(heute, "13:30");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("schirm");
    um(heute, "14:05");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("sonne");
  });

  it("nachts nichts – weder nach Sonnenuntergang noch im Schlaf", () => {
    um(heute, "17:30");
    expect(miaLook(lageJetzt(tag(heute))).zubehoer).toBeNull();
    um(heute, "23:00");
    expect(miaLook(lageJetzt(tag(heute)))).toMatchObject({ zubehoer: null, schlaeft: true });
    um(heute, "06:30");
    expect(miaLook(lageJetzt(tag(heute))).zubehoer).toBeNull();
  });

  it("ab 18 °C den ganzen hellen Tag die Sonnenbrille", () => {
    const sommer = "2027-07-10";
    const hours = tag(sommer, { 14: { temp: 24, code: 3, sun: 0 }, 9: { temp: 18 } });
    um(sommer, "14:00");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("sonnenbrille");
    um(sommer, "09:10");
    expect(miaLook(lageJetzt(hours)).zubehoer).toBe("sonnenbrille");
  });

  it("sonnige Stunde: Code ≤ 2 oder mindestens 30 Sonnenminuten", () => {
    const h = (code: number, sun: number) => ({ date: heute, hour: 12, temp: 10, code, mm: 0, rain: 0, gust: 0, sun });
    expect(sonnigeStunde(h(0, 0))).toBe(true);
    expect(sonnigeStunde(h(2, 0))).toBe(true);
    expect(sonnigeStunde(h(3, 29))).toBe(false);
    expect(sonnigeStunde(h(3, 30))).toBe(true);
  });

  it("Tagesentscheidung: mindestens die Hälfte der hellen Stunden sonnig", () => {
    // 29.10.: hell etwa 7:34–17:01 → Stunden 8 bis 16 (Mitte der Stunde), also 9 helle Stunden
    const bedeckt = tag(heute, {}, { code: 3, sun: 0 });
    expect(sonnigerTag(bedeckt, heute)).toBe(false);
    const fuenf = tag(heute, { 8: { code: 1 }, 9: { code: 1 }, 10: { code: 1 }, 11: { code: 1 }, 15: { sun: 45 } }, { code: 3, sun: 0 });
    expect(sonnigerTag(fuenf, heute)).toBe(true);
    const vier = tag(heute, { 8: { code: 1 }, 9: { code: 1 }, 10: { code: 1 }, 11: { code: 1 } }, { code: 3, sun: 0 });
    expect(sonnigerTag(vier, heute)).toBe(false);
    // Nachtstunden zählen nicht
    expect(sonnigerTag(tag(heute, { 8: { code: 3 }, 9: { code: 3 }, 10: { code: 3 }, 11: { code: 3 }, 12: { code: 3 } }, { code: 2, sun: 0 }), heute)).toBe(false);
    expect(sonnigerTag(tag(heute, { 6: { code: 3 }, 7: { code: 3 }, 17: { code: 3 }, 18: { code: 3 }, 8: { code: 3 }, 9: { code: 3 }, 10: { code: 3 }, 11: { code: 3 } }, { code: 2, sun: 0 }), heute)).toBe(true);
    expect(sonnigerTag([], heute)).toBeNull();
  });

  it("gemerkt pro Tag: neue Vorhersage am selben Tag ändert nichts, am nächsten Tag neu", () => {
    um(heute, "09:00");
    expect(tagSonnig(tag(heute))).toBe(true);
    const gespeichert = JSON.parse(win.localStorage.getItem("wasgibts.miazubehoer")!);
    expect(gespeichert).toMatchObject({ version: 1, sonnentag: { date: heute, sonnig: true } });
    um(heute, "15:00");
    const bedeckt = tag(heute, {}, { code: 3, sun: 0 });
    expect(tagSonnig(bedeckt)).toBe(true);
    expect(miaLook(lageJetzt(bedeckt)).zubehoer).toBe("sonne");
    um("2026-10-30", "10:00");
    expect(tagSonnig(tag("2026-10-30", {}, { code: 3, sun: 0 }))).toBe(false);
  });

  it("ohne Daten für heute nichts merken", () => {
    um(heute, "09:00");
    expect(tagSonnig([])).toBeNull();
    expect(win.localStorage.getItem("wasgibts.miazubehoer")).toBeNull();
  });
});

describe("Herbstblätter nur bei Wind (A-058)", () => {
  const okt = "2026-10-29";
  const windig = (date: string, wind: number, gust = 15) => tag(date, {}, { wind, gust, code: 3, sun: 0 });

  it("Wind 30 km/h im Oktober → Blätter-Moment", () => {
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(windig(okt, 30)), "oeffnen", false)).toBe("blaetter");
  });

  it("Böen ab 35 km/h reichen auch", () => {
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(windig(okt, 10, 35)), "oeffnen", false)).toBe("blaetter");
    expect(miaMoment(lageJetzt(windig(okt, 10, 34)), {}, 0)).toBeNull();
  });

  it("10 km/h → nichts", () => {
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(windig(okt, 10)), "oeffnen", false)).toBeNull();
  });

  it("Juni mit Wind → nichts", () => {
    um("2027-06-15", "11:00");
    expect(momentJetzt(lageJetzt(windig("2027-06-15", 40, 50)), "oeffnen", false)).toBeNull();
  });

  it("reduzierte Bewegung → keine Blätter", () => {
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(windig(okt, 30)), "oeffnen", true)).toBeNull();
    expect(momentJetzt(lageJetzt(windig(okt, 30)), "antippen", true)).toBeNull();
  });

  it("nachts schläft Mia – keine Blätter", () => {
    um(okt, "23:00");
    expect(momentJetzt(lageJetzt(windig(okt, 40)), "oeffnen", false)).toBeNull();
  });

  it("Öffnen höchstens alle 30 Min, Antippen höchstens alle 5 Min – je Gerät gemerkt", () => {
    const hours = windig(okt, 30);
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(hours), "oeffnen", false)).toBe("blaetter");
    um(okt, "11:04");
    expect(momentJetzt(lageJetzt(hours), "antippen", false)).toBeNull();
    um(okt, "11:05");
    expect(momentJetzt(lageJetzt(hours), "antippen", false)).toBe("blaetter");
    um(okt, "11:20");
    expect(momentJetzt(lageJetzt(hours), "oeffnen", false)).toBeNull();
    um(okt, "11:35");
    expect(momentJetzt(lageJetzt(hours), "oeffnen", false)).toBe("blaetter");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.miazubehoer")!).zuletzt.blaetter).toBe(new Date("2026-10-29T11:35:00+01:00").getTime());
  });

  it("Sturm (Böen ≥ 60): im Herbst Wackeln + Blätter, sonst nur Wackeln", () => {
    um(okt, "11:00");
    expect(momentJetzt(lageJetzt(windig(okt, 40, 65)), "oeffnen", false)).toBe("sturm");
    const gemerkt = JSON.parse(win.localStorage.getItem("wasgibts.miazubehoer")!).zuletzt;
    expect(gemerkt.wackeln).toBe(gemerkt.blaetter);
    um("2027-01-12", "11:00");
    expect(momentJetzt(lageJetzt(windig("2027-01-12", 40, 65)), "oeffnen", false)).toBe("wackeln");
  });

  it("Antippen löst nur Blätter aus, kein Wackeln oder Sonnendrehen", () => {
    um("2027-01-12", "11:00");
    expect(momentJetzt(lageJetzt(windig("2027-01-12", 40, 65)), "antippen", false)).toBeNull();
  });

  it("Speicher: Schlüssel im Verzeichnis, Version 1, nicht in der Sicherung; Altes/Defektes → leer", () => {
    expect(STORAGE.find((s) => s.key === "wasgibts.miazubehoer")).toMatchObject({ version: 1, backup: false, area: "local" });
    expect(migrateZubehoer(null)).toEqual({ version: 1, sonnentag: null, zuletzt: {} });
    expect(migrateZubehoer({ version: 1, sonnentag: { date: 3 }, zuletzt: { blaetter: "x", wackeln: 5 } })).toEqual({ version: 1, sonnentag: null, zuletzt: { wackeln: 5 } });
  });
});

describe("Blätter-Moment: Zeichnung und Bewegung (A-058)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const zeichnung = readFileSync("src/components/begleitung/MiaZubehoer.tsx", "utf8");

  it("6–8 Blätter in Herbstfarben, unterschiedlich groß", () => {
    const blaetter = [...zeichnung.matchAll(/\{ x: -?\d+, y: \d+, s: ([\d.]+), .*farbe: "(#[0-9A-F]{6})" \}/g)];
    expect(blaetter.length).toBeGreaterThanOrEqual(6);
    expect(blaetter.length).toBeLessThanOrEqual(8);
    expect(new Set(blaetter.map((b) => b[1])).size).toBeGreaterThan(3);
    expect(new Set(blaetter.map((b) => b[2])).size).toBeGreaterThanOrEqual(4);
  });

  it("nur transform/opacity, weich, der ganze Moment unter 3 s; reduzierte Bewegung = keine Blätter", () => {
    for (const name of ["av-blatt-weg", "av-blatt-dreh", "av-kneif", "av-kneif-auf"]) {
      const frames = css.match(new RegExp(`@keyframes ${name}\\{(.*)\\}\\n`))![1];
      const props = [...frames.matchAll(/([a-z-]+):/g)].map((m) => m[1]);
      expect(props.every((p) => p === "opacity" || p === "transform"), `${name}: ${props}`).toBe(true);
    }
    expect(css).toMatch(/\.av-blatt-weg\{opacity:0;animation:av-blatt-weg 2\.2s cubic-bezier\(\.16,1,\.3,1\)/);
    const versatz = Math.max(...[...zeichnung.matchAll(/ d: ([\d.]+),/g)].map((m) => Number(m[1])));
    expect(versatz + 2.2).toBeLessThanOrEqual(3);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{[^\n]*\.av-blaetter\{display:none\}/);
  });
});
