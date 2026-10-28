// Mia – die Familienmanagerin (Tafel 81/82): Zubehör je Datum/Uhrzeit/Wetter
// mit Rangfolge, Schlafzeit, Silvester, kurze Momente (Sturm/Blatt), Sätze
// ohne Druck, Varianten nie doppelt, Reaktions-Grenzen.
import { describe, expect, it } from "vitest";
import { easterSunday, isNewYear, miaLook, miaMoment, miaWetter, type MiaLage } from "@/lib/mia/zubehoer";
import { bigReactionAllowed, miaReaktion, miaSatz, SAETZE, steckbrief, VERBOTEN } from "@/lib/mia/persona";

const lage = (date: string, clock = "12:00", extra: Partial<MiaLage> = {}): MiaLage => ({ date, minutes: Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3)), wetter: null, geburtstag: false, kochen: false, ...extra });
const dry = { regenBald: false, sonnig: false, grad: 15, boeen: 10 };

describe("Zubehör", () => {
  it("Halloween: Kürbis den ganzen Tag", () => {
    expect(miaLook(lage("2026-10-31", "08:30")).zubehoer).toBe("kuerbis");
    expect(miaLook(lage("2026-10-31", "21:59")).zubehoer).toBe("kuerbis");
    expect(miaLook(lage("2026-10-30")).zubehoer).toBeNull();
  });

  it("Advent 1.–24.12. Mütze, sonst im Winter Schal", () => {
    expect(miaLook(lage("2026-12-01")).zubehoer).toBe("weihnachtsmuetze");
    expect(miaLook(lage("2026-12-24")).zubehoer).toBe("weihnachtsmuetze");
    expect(miaLook(lage("2026-12-27")).zubehoer).toBe("schal");
    expect(miaLook(lage("2027-02-10")).zubehoer).toBe("schal");
    expect(miaLook(lage("2027-03-10")).zubehoer).toBeNull();
  });

  it("Ostern: Ei von Karfreitag bis Ostermontag", () => {
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(miaLook(lage("2027-03-26")).zubehoer).toBe("osterei");
    expect(miaLook(lage("2027-03-29")).zubehoer).toBe("osterei");
    expect(miaLook(lage("2027-03-30")).zubehoer).toBeNull();
  });

  it("Rangfolge: Geburtstag > Anlass > Kochen > Wetter > Jahreszeit", () => {
    expect(miaLook(lage("2026-10-31", "12:00", { geburtstag: true, kochen: true })).zubehoer).toBe("partyhut");
    expect(miaLook(lage("2026-10-31", "12:00", { kochen: true })).zubehoer).toBe("kuerbis");
    expect(miaLook(lage("2027-01-10", "12:00", { kochen: true, wetter: { ...dry, regenBald: true } })).zubehoer).toBe("kochmuetze");
    expect(miaLook(lage("2027-01-10", "12:00", { wetter: { ...dry, regenBald: true } })).zubehoer).toBe("schirm");
    expect(miaLook(lage("2027-01-10", "12:00", { wetter: dry })).zubehoer).toBe("schal");
  });

  it("Sonnenbrille: jetzt sonnig und ab 18 °C – ganzjährig", () => {
    expect(miaLook(lage("2027-07-10", "14:00", { wetter: { ...dry, sonnig: true, grad: 25 } })).zubehoer).toBe("sonnenbrille");
    expect(miaLook(lage("2027-04-10", "14:00", { wetter: { ...dry, sonnig: true, grad: 19 } })).zubehoer).toBe("sonnenbrille");
    expect(miaLook(lage("2027-04-10", "14:00", { wetter: { ...dry, sonnig: true, grad: 18 } })).zubehoer).toBe("sonnenbrille");
    expect(miaLook(lage("2027-07-10", "14:00", { wetter: { ...dry, sonnig: false, grad: 25 } })).zubehoer).toBeNull();
  });

  it("Sonne: sonnig unter 18 °C tagsüber (A-033)", () => {
    expect(miaLook(lage("2026-10-15", "12:00", { wetter: { ...dry, sonnig: true, grad: 13 } })).zubehoer).toBe("sonne");
    expect(miaLook(lage("2027-04-10", "14:00", { wetter: { ...dry, sonnig: true, grad: 17.9 } })).zubehoer).toBe("sonne");
    // Winter: Schal nur, wenn keine Sonne scheint
    expect(miaLook(lage("2027-01-10", "12:00", { wetter: { ...dry, sonnig: true, grad: 2 } })).zubehoer).toBe("sonne");
  });

  it("nachts nie Sonne oder Sonnenbrille – auch nach Sonnenuntergang vor 22 Uhr", () => {
    const sonnig = (grad: number) => ({ wetter: { ...dry, sonnig: true, grad } });
    expect(miaLook(lage("2026-10-15", "23:00", sonnig(13))).zubehoer).toBeNull();
    expect(miaLook(lage("2026-10-15", "19:30", sonnig(13))).zubehoer).toBeNull();
    expect(miaLook(lage("2026-10-15", "06:30", sonnig(13))).zubehoer).toBeNull();
    expect(miaLook(lage("2027-07-10", "23:00", sonnig(25))).zubehoer).toBeNull();
    expect(miaLook(lage("2027-01-10", "17:30", sonnig(2))).zubehoer).toBe("schal");
  });

  it("Regen schlägt Sonne, Kochen und Anlass schlagen Wetter", () => {
    expect(miaLook(lage("2026-10-15", "12:00", { wetter: { ...dry, sonnig: true, grad: 13, regenBald: true } })).zubehoer).toBe("schirm");
    expect(miaLook(lage("2027-07-10", "14:00", { wetter: { ...dry, sonnig: true, grad: 25, regenBald: true } })).zubehoer).toBe("schirm");
    expect(miaLook(lage("2026-10-15", "12:00", { kochen: true, wetter: { ...dry, sonnig: true, grad: 13 } })).zubehoer).toBe("kochmuetze");
    expect(miaLook(lage("2026-10-31", "12:00", { wetter: { ...dry, sonnig: true, grad: 13 } })).zubehoer).toBe("kuerbis");
  });

  it("Schirm nur bei Regen jetzt oder in der nächsten Stunde", () => {
    const h = (hour: number, mm: number, rain: number) => ({ date: "2027-04-10", hour, temp: 12, code: 3, mm, rain, gust: 20 });
    expect(miaWetter([h(14, 0, 0), h(15, 0.5, 80)], "2027-04-10", 14 * 60 + 10)?.regenBald).toBe(true);
    expect(miaWetter([h(14, 0, 0), h(15, 0, 0), h(16, 1, 90)], "2027-04-10", 14 * 60)?.regenBald).toBe(false);
    expect(miaWetter([h(14, 0.1, 90)], "2027-04-10", 14 * 60)?.regenBald).toBe(false);
    expect(miaWetter([], "2027-04-10", 14 * 60)).toBeNull();
  });
});

describe("Schlaf und Tageszeit", () => {
  it("22–6 Uhr schläft Mia, 6–8 verschlafen, ab 19 Uhr ruhiger", () => {
    expect(miaLook(lage("2026-10-23", "22:00")).schlaeft).toBe(true);
    expect(miaLook(lage("2026-10-23", "05:59")).schlaeft).toBe(true);
    expect(miaLook(lage("2026-10-23", "06:00"))).toMatchObject({ schlaeft: false, verschlafen: true });
    expect(miaLook(lage("2026-10-23", "08:00")).verschlafen).toBe(false);
    expect(miaLook(lage("2026-10-23", "19:30")).ruhig).toBe(true);
  });

  it("Silvester 23:55–1:00 wach mit Konfetti", () => {
    expect(isNewYear("2026-12-31", 23 * 60 + 55)).toBe(true);
    expect(miaLook(lage("2026-12-31", "23:56"))).toMatchObject({ schlaeft: false, zubehoer: "konfetti" });
    expect(miaLook(lage("2027-01-01", "00:30"))).toMatchObject({ schlaeft: false, zubehoer: "konfetti" });
    expect(miaLook(lage("2027-01-01", "01:00")).schlaeft).toBe(true);
  });
});

describe("Kurze Momente", () => {
  const nowMs = 10 * 3_600_000;
  it("Sturm wackelt nur bei Böen ≥ 60 km/h, höchstens alle 30 Min", () => {
    const sturm = lage("2027-01-10", "12:00", { wetter: { ...dry, boeen: 65 } });
    expect(miaMoment(sturm, {}, nowMs)).toBe("wackeln");
    expect(miaMoment(sturm, { wackeln: nowMs - 29 * 60_000 }, nowMs)).toBeNull();
    expect(miaMoment(sturm, { wackeln: nowMs - 30 * 60_000 }, nowMs)).toBe("wackeln");
    expect(miaMoment(lage("2027-01-10", "12:00", { wetter: { ...dry, boeen: 59 } }), {}, nowMs)).toBeNull();
  });

  it("Herbstblatt höchstens 1×/h, nur Sep–Nov", () => {
    expect(miaMoment(lage("2026-10-23"), {}, nowMs)).toBe("blatt");
    expect(miaMoment(lage("2026-10-23"), { blatt: nowMs - 59 * 60_000 }, nowMs)).toBeNull();
    expect(miaMoment(lage("2027-03-23"), {}, nowMs)).toBeNull();
  });

  it("Sonnenstrahlen drehen sich einmal, nur mit Sonne, höchstens 1×/h, vor dem Herbstblatt", () => {
    const sonne = lage("2026-10-15", "12:00", { wetter: { ...dry, sonnig: true, grad: 13 } });
    expect(miaMoment(sonne, {}, nowMs)).toBe("sonne");
    expect(miaMoment(sonne, { sonne: nowMs - 59 * 60_000 }, nowMs)).toBe("blatt");
    expect(miaMoment(lage("2027-04-10", "12:00", { wetter: { ...dry, sonnig: true, grad: 19 } }), {}, nowMs)).toBeNull();
  });
});

describe("Ton", () => {
  it("keine verbotenen Formulierungen in festen Sätzen und im Steckbrief", () => {
    const all = [...Object.values(SAETZE).flat(), steckbrief("Mia")];
    for (const s of all) for (const re of VERBOTEN) expect(re.test(s), `${s} ~ ${re}`).toBe(false);
  });

  it("3–5 Varianten, nie zweimal dieselbe hintereinander", () => {
    for (const list of Object.values(SAETZE)) expect(list.length >= 3 && list.length <= 5).toBe(true);
    let last: string | null = null;
    for (let i = 0; i < 30; i++) {
      const s = miaSatz("danke", last, () => 0);
      expect(s).not.toBe(last);
      last = s;
    }
  });

  it("Danke und Lob erkennen", () => {
    expect(miaReaktion("Danke dir!")).toBe("danke");
    expect(miaReaktion("Du bist super")).toBe("lob");
    expect(miaReaktion("Dankbarkeit ist schön")).toBeNull();
    expect(miaReaktion("Milch auf die Liste")).toBeNull();
  });

  it("große Reaktion max 1× je Gespräch, 3× am Tag", () => {
    expect(bigReactionAllowed({ conversation: 0, day: "2026-10-23", today: 2 }, "2026-10-23")).toBe(true);
    expect(bigReactionAllowed({ conversation: 1, day: "2026-10-23", today: 0 }, "2026-10-23")).toBe(false);
    expect(bigReactionAllowed({ conversation: 0, day: "2026-10-23", today: 3 }, "2026-10-23")).toBe(false);
    expect(bigReactionAllowed({ conversation: 0, day: "2026-10-22", today: 3 }, "2026-10-23")).toBe(true);
  });
});

describe("Sonne am Knopf, nie am Logo (A-033)", () => {
  it("Sonne halb hinter Mia (vor dem Körper gezeichnet), Gelb nur als Token", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { BegleitungAvatar } = await import("@/components/begleitung/BegleitungAvatar");
    const html = renderToStaticMarkup(createElement(BegleitungAvatar, { size: 60, zubehoer: "sonne" }));
    expect(html).toContain('data-zubehoer="sonne"');
    expect(html.indexOf('data-zubehoer="sonne"')).toBeLessThan(html.indexOf("av-body"));
    expect(html).toContain("var(--app-sonne)");
    expect(html.toLowerCase()).not.toContain("#f5b82e");
    const brille = renderToStaticMarkup(createElement(BegleitungAvatar, { size: 60, zubehoer: "sonnenbrille" }));
    expect(brille.indexOf('data-zubehoer="sonnenbrille"')).toBeGreaterThan(brille.indexOf("av-body"));
  });

  it("das eckige Logo (BrandMark) trägt nie Zubehör", async () => {
    const { readFileSync } = await import("node:fs");
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { BrandMark } = await import("@/components/ui/BrandMark");
    for (const variant of ["lockup", "icon", "wort"] as const) {
      const html = renderToStaticMarkup(createElement(BrandMark, { variant }));
      expect(html).not.toMatch(/zubehoer|av-sonne/);
    }
    const src = readFileSync("src/components/ui/BrandMark.tsx", "utf8");
    expect(src).not.toMatch(/MiaZubehoer|useMiaLook|zubehoer/i);
  });

  it("Token --app-sonne in globals.css, reduzierte Bewegung = Strahlen still", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/--app-sonne:\s*#f5b82e/i);
    const rule = css.match(/@media \(prefers-reduced-motion:reduce\)\{\[data-moment\][^\n]*/)?.[0] ?? "";
    expect(rule).toMatch(/\.av-sonne-strahlen\{animation:none/);
    expect(css).toMatch(/@keyframes av-sonne\{from\{transform:rotate\(0\)\}to\{transform:rotate\(360deg\)\}\}/);
  });
});

describe("Bewegung", () => {
  it("reduzierte Bewegung blendet nie das Gesicht aus (nur Animation aus, Blatt weg)", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = css.match(/@media \(prefers-reduced-motion:reduce\)\{\[data-moment\][^\n]*/)?.[0] ?? "";
    expect(rule).toContain("animation:none");
    expect(rule).not.toMatch(/\.av-body[^}]*opacity:0/);
  });
});
