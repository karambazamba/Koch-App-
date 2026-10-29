// „Was los?“ (A-055): Liste nach Tagen, Reiter, Wochenende ab Freitag 15 Uhr,
// Umkreis, Sichtbarkeit (Mini-Kreis), Wochenend-Tipps, Zettel und Termin.
import { describe, expect, it } from "vitest";
import { demoEvents } from "@/lib/region/demo";
import { hatEintraege14Tage, imUmkreis, nachTagen, pinnwandZettel, reiterZeitraum, sanitizeEvent, tagTitel, terminDaten, wannText, wasLosSichtbar, wochenendTipps, wochenendeVon, zeitSpalte, type RegionEvent } from "@/lib/region/model";
import { orteImUmkreis } from "@/lib/region/orte";

const MI = "2026-10-21";
const ev = (o: Partial<RegionEvent> & { id: string; datum: string }): RegionEvent => sanitizeEvent({ titel: `T ${o.id}`, quelle: "kreisoh", ort: "Eutin", kategorien: ["kultur"], ...o })!;

describe("Einträge prüfen", () => {
  it("nur Saubere: Datum, Uhrzeit, https-Link, bekannte Kategorien; Gemeinde aus dem Ort", () => {
    const e = sanitizeEvent({ id: "kreisoh-1", titel: "  Herbstmarkt  ", datum: "2026-10-24", beginn: "10:00", ende: "09:00", ort: "Schlossplatz Eutin", link: "javascript:alert(1)", kategorien: ["markt", "werbung"] })!;
    expect(e).toMatchObject({ titel: "Herbstmarkt", beginn: "10:00", ende: null, ganztags: false, gemeinde: "Eutin", link: null, kategorien: ["markt"], quelle: "kreisoh" });
    expect(sanitizeEvent({ id: "x", titel: "", datum: MI })).toBeNull();
    expect(sanitizeEvent({ id: "x", titel: "A", datum: "morgen" })).toBeNull();
    expect(sanitizeEvent({ id: "x", titel: "A", datum: MI, bis_datum: "2026-10-20" })!.bis_datum).toBeNull();
    expect(sanitizeEvent({ id: "x", titel: "A", datum: MI })).toMatchObject({ ganztags: true, kategorien: ["sonstiges"], gemeinde: null });
  });
});

describe("Reiter und Liste nach Tagen", () => {
  const liste = demoEvents(MI);

  it("Zeiträume: Heute, Wochenende Fr–So, 2 Wochen", () => {
    expect(reiterZeitraum("heute", MI)).toEqual({ von: MI, bis: MI });
    expect(reiterZeitraum("wochenende", MI)).toEqual({ von: "2026-10-23", bis: "2026-10-25" });
    expect(wochenendeVon("2026-10-24")).toEqual({ von: "2026-10-24", bis: "2026-10-25" });
    expect(wochenendeVon("2026-10-25")).toEqual({ von: "2026-10-25", bis: "2026-10-25" });
    expect(reiterZeitraum("zwei", MI)).toEqual({ von: MI, bis: "2026-11-04" });
  });

  it("Heute: ganztags zuerst, dann nach Uhrzeit; Vorbeies fällt still weg", () => {
    const heute = nachTagen(liste, "heute", MI, 10 * 60 + 30);
    expect(heute).toHaveLength(1);
    expect(heute[0].events.map(zeitSpalte)).toEqual(["ganztags", "11:30", "14:00", "19:00"]);
    // 16:30: Beletage (11:30 + 2 Std.) und Puder vorbei
    expect(nachTagen(liste, "heute", MI, 16 * 60 + 30)[0].events.map((e) => e.id)).toEqual(["demo-fotografien", "demo-museum"]);
  });

  it("Wochenende: Freitag erst ab 15 Uhr, Mehrtägiges einmal (ab Samstag), Filter", () => {
    const fr = ev({ id: "fr-mittag", datum: "2026-10-23", beginn: "12:00" });
    const lang = ev({ id: "ausstellung", datum: "2026-10-01", bis_datum: "2026-11-30" });
    const gruppen = nachTagen([...liste, fr, lang], "wochenende", MI, 0);
    expect(gruppen.map((g) => g.tag)).toEqual(["2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(gruppen[0].events.map((e) => e.id)).toEqual(["demo-kino"]);
    expect(gruppen[1].events.map((e) => e.id)).toEqual(["demo-fotografien", "ausstellung", "demo-herbstmarkt", "demo-nachtwaechter", "demo-hafenfest"]);
    expect(nachTagen(liste, "wochenende", MI, 0, "kinder").flatMap((g) => g.events.map((e) => e.id))).toEqual(["demo-kino", "demo-herbstmarkt", "demo-laternen"]);
    expect(nachTagen(liste, "wochenende", MI, 0, "markt").flatMap((g) => g.events.map((e) => e.id))).toEqual(["demo-herbstmarkt"]);
  });

  it("2 Wochen: jeder Eintrag einmal, nach Tagen sortiert", () => {
    const tage = nachTagen(liste, "zwei", MI, 0);
    expect(tage.map((g) => g.tag)).toEqual([MI, "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-28"]);
    expect(tage.flatMap((g) => g.events).length).toBe(liste.length);
  });

  it("Abschnitts-Titel und Zeiten", () => {
    expect(tagTitel(MI, MI)).toBe("Heute · Mi 21. Okt");
    expect(tagTitel("2026-10-22", MI)).toBe("Morgen · Do 22. Okt");
    expect(tagTitel("2026-10-31", MI)).toBe("Sa 31. Okt");
    const markt = liste.find((e) => e.id === "demo-herbstmarkt")!;
    expect(wannText(markt)).toBe("Sa 24. Okt · 10:00 – 17:00");
    expect(wannText(liste.find((e) => e.id === "demo-fotografien")!)).toBe("Mi 21. Okt · ganztags · bis Di 10. Nov");
  });
});

describe("Umkreis, Sichtbarkeit, Wochenend-Tipps", () => {
  const liste = demoEvents(MI);

  it("nur Orte im Umkreis; unbekannte Gemeinde erst bei 30 km; Kategorien aus", () => {
    const fern = imUmkreis(liste, orteImUmkreis("Eutin", 15), { umkreis: 15, kategorienAus: [] });
    expect(fern.map((e) => e.id)).not.toContain("demo-hafenfest");
    const unbekannt = ev({ id: "irgendwo", datum: MI, ort: "Dorfgemeinschaftshaus" });
    expect(imUmkreis([unbekannt], orteImUmkreis("Eutin", 15), { umkreis: 15, kategorienAus: [] })).toEqual([]);
    expect(imUmkreis([unbekannt], orteImUmkreis("Eutin", 30), { umkreis: 30, kategorienAus: [] })).toHaveLength(1);
    const ohneKultur = imUmkreis(liste, orteImUmkreis("Eutin", 15), { umkreis: 15, kategorienAus: ["kultur"] });
    expect(ohneKultur.map((e) => e.id)).not.toContain("demo-beletage");
    expect(ohneKultur.map((e) => e.id)).toContain("demo-puder");
  });

  it("Mini-Kreis: nur mit Quelle, Baustein und Einträgen in 14 Tagen", () => {
    expect(hatEintraege14Tage(liste, MI)).toBe(true);
    expect(hatEintraege14Tage([ev({ id: "spaet", datum: "2026-11-20" })], MI)).toBe(false);
    expect(hatEintraege14Tage([], MI)).toBe(false);
    expect(wasLosSichtbar({ quelle: "kreisoh", baustein: true, events: liste, heute: MI })).toBe(true);
    expect(wasLosSichtbar({ quelle: "aus", baustein: true, events: liste, heute: MI })).toBe(false);
    expect(wasLosSichtbar({ quelle: "kreisoh", baustein: false, events: liste, heute: MI })).toBe(false);
    expect(wasLosSichtbar({ quelle: undefined, baustein: true, events: liste, heute: MI })).toBe(false);
    expect(wasLosSichtbar({ quelle: "kreisoh", baustein: true, events: [], heute: MI })).toBe(false);
  });

  it("wochenendTipps: höchstens 2, Familie „für Kinder“ zuerst, sonst draußen/Markt", () => {
    expect(wochenendTipps(liste, "familie", "2026-10-23", 12 * 60).map((e) => e.id)).toEqual(["demo-herbstmarkt", "demo-kino"]);
    expect(wochenendTipps(liste, "paar", "2026-10-23", 12 * 60).map((e) => e.id)).toEqual(["demo-herbstmarkt", "demo-nachtwaechter"]);
    expect(wochenendTipps([], "familie", "2026-10-23")).toEqual([]);
  });
});

describe("Zettel und Termin", () => {
  const nw = demoEvents(MI).find((e) => e.id === "demo-nachtwaechter")!;
  it("Pinnwand: „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“", () => {
    expect(pinnwandZettel(nw)).toBe("Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?");
    expect(pinnwandZettel(ev({ id: "g", datum: "2026-10-25", titel: "Ausstellung" }))).toBe("So Ausstellung · Wer kommt mit?");
  });
  it("Termin: Titel, Tag, Beginn/Ende, Ort, Link; ganztags ohne Uhrzeit, mehrtägig mit Ende", () => {
    expect(terminDaten(nw)).toEqual({ title: "Nachtwächter-Rundgang", date: "2026-10-24", start: "17:00", place: "Treffpunkt Tourist-Info, Markt 19, Eutin", link: nw.link });
    const lang = ev({ id: "l", datum: "2026-10-01", bis_datum: "2026-11-30", titel: "Ausstellung", link: "https://www.kreis-oh.de/x" });
    expect(terminDaten(lang, MI)).toEqual({ title: "Ausstellung", date: MI, start: "", place: "Eutin", link: "https://www.kreis-oh.de/x", endDate: "2026-11-30" });
  });
});

describe("Hinweis für Entwickler", () => {
  it("„Was los?: Quelle liefert nichts“ nur beim Kreis ohne Treffer, mit Grund", async () => {
    const { quellenHinweis } = await import("@/lib/region/model");
    expect(quellenHinweis("kreisoh", { treffer: 12, grund: "ok" })).toBeNull();
    expect(quellenHinweis("kreisoh", { treffer: 0, grund: "wartet" })).toBe("Was los?: Quelle liefert nichts (Parser wartet auf echte Beispielseiten)");
    expect(quellenHinweis("kreisoh", { treffer: 0, grund: "leer" })).toBe("Was los?: Quelle liefert nichts (0 Treffer)");
    expect(quellenHinweis("kreisoh", null)).toBe("Was los?: Quelle liefert nichts (noch kein Lauf)");
    expect(quellenHinweis("aus", null)).toBeNull();
    expect(quellenHinweis("demo", null)).toBeNull();
  });
});
