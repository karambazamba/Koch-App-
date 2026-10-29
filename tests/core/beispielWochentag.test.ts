// Beispiel-Tag passt zum Wochentag (v0.100, Tafel 150): Werktag mit Kita,
// Schwimmen, Elternabend; Samstag und Sonntag eigene Pläne, Feiertage
// (bundesweit + Schleswig-Holstein) wie Sonntag; je Art mehrere Varianten;
// am Wochenende kein „heute dran“.
import { describe, expect, it } from "vitest";
import { demoArt, demoDay, demoEntries, demoSportRing } from "@/lib/core/demo";
import { demoDishAt } from "@/lib/essen/demoDish";
import { feiertage, istFeiertag, ostersonntag } from "@/lib/core/feiertage";

// Oktober 2026: Mo 19. · Di 20. · Mi 21. · Do 22. · Fr 23. · Sa 24. · So 25.
const titel = (date: string) => demoDay(date).map((t) => t.title);
const termine = (today: string, minutes: number) =>
  demoEntries(today, minutes).entries.filter((e) => e.typ === "termin").map((e) => (e.data as { title: string; start: string }).title);
const aufgaben = (today: string) => demoEntries(today, 6 * 60).entries.filter((e) => e.typ === "aufgabe").map((e) => e.data as { date?: string; week?: string; dringend?: boolean });

describe("Feiertage (bundesweit + Schleswig-Holstein)", () => {
  it("Ostern und die beweglichen Tage", () => {
    expect(ostersonntag(2026)).toBe("2026-04-05");
    expect(ostersonntag(2027)).toBe("2027-03-28");
    expect(ostersonntag(2025)).toBe("2025-04-20");
    const f = feiertage(2026);
    expect(f["2026-04-03"]).toBe("Karfreitag");
    expect(f["2026-04-06"]).toBe("Ostermontag");
    expect(f["2026-05-14"]).toBe("Christi Himmelfahrt");
    expect(f["2026-05-25"]).toBe("Pfingstmontag");
  });

  it("feste Tage inkl. Reformationstag (SH), sonst kein Feiertag", () => {
    for (const d of ["2026-01-01", "2026-05-01", "2026-10-03", "2026-10-31", "2026-12-25", "2026-12-26"]) expect(istFeiertag(d), d).toBe(true);
    for (const d of ["2026-10-21", "2026-11-01", "2026-01-06", "2026-06-04"]) expect(istFeiertag(d), d).toBe(false);
  });
});

// Tafel 150: 5 Uhrzeiten × Werktag/Wochenende – nie ein vergangener Termin, nie Kita am Wochenende, nie „…“
const UHRZEITEN = [7 * 60, 10 * 60 + 15, 13 * 60 + 30, 16 * 60 + 5, 21 * 60];
const TAGE = { werktag: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"], wochenende: ["2026-10-24", "2026-10-25", "2026-10-31", "2026-12-25"] };
const NUR_WERKTAGS = /kita|elternabend|schule/i;

describe("Beispiel-Termine je Wochentag (Tafel 150)", () => {
  it("Mo–Fr mit Kita, Schwimmen bzw. Elternabend; mehrere Varianten, nicht jeden Tag gleich", () => {
    const plaene = TAGE.werktag.map((d) => titel(d).join("|"));
    expect(new Set(plaene).size).toBeGreaterThan(1);
    for (const d of TAGE.werktag) expect(demoArt(d)).toBe("werktag");
    expect(TAGE.werktag.some((d) => titel(d).includes("Kita"))).toBe(true);
    expect(TAGE.werktag.some((d) => titel(d).includes("Elternabend") || titel(d).includes("Schwimmen"))).toBe(true);
  });

  it("Sa/So/Feiertag: Familie, Ausflug, Laternenumzug – nie Kita oder Elternabend", () => {
    expect(demoArt("2026-10-24")).toBe("samstag");
    expect(demoArt("2026-10-25")).toBe("sonntag");
    for (const d of TAGE.wochenende) {
      expect(titel(d).some((t) => NUR_WERKTAGS.test(t)), d).toBe(false);
      // tagsüber (vor 20 Uhr) nie Kita/Elternabend – ab 20 Uhr ist ggf. schon der Werktag von morgen dran
      for (const m of UHRZEITEN.filter((x) => x < 20 * 60)) expect(termine(d, m).some((t) => NUR_WERKTAGS.test(t)), `${d} ${m}`).toBe(false);
    }
  });

  it.each(Object.entries(TAGE).flatMap(([art, tage]) => tage.flatMap((d) => UHRZEITEN.map((m) => [art, d, m] as const))))("%s %s um %i Min: nie vergangen, nie „…“, 1–3 Wörter", (_art, d, m) => {
    const e = demoEntries(d, m);
    for (const x of e.entries) {
      const data = x.data as { title: string; start?: string; date?: string };
      expect(data.title).not.toMatch(/…/);
      expect(data.title.split(/\s+/).length).toBeLessThanOrEqual(3);
      if (x.typ === "termin" && data.date === d) {
        const [h, mi] = data.start!.split(":").map(Number);
        expect(h * 60 + mi + 30).toBeGreaterThan(m);
      }
    }
    // Am Samstag/Sonntag gezeigt: nie Kita oder Elternabend (auch wenn der Plan von morgen dran ist)
    if (demoArt(e.date) !== "werktag") expect(e.entries.some((x) => NUR_WERKTAGS.test((x.data as { title: string }).title))).toBe(false);
  });

  it("Feiertag wie Sonntag – auch an einem Werktag (Reformationstag, Tag der Deutschen Einheit)", () => {
    expect(demoArt("2027-10-04")).toBe("werktag");
    for (const d of ["2025-10-31", "2027-05-06", "2026-12-25"]) expect(demoArt(d), d).toBe("sonntag");
  });

  it("spät am Freitag: Beispiele für Samstag (der Plan wechselt mit dem Tag)", () => {
    const d = demoEntries("2026-10-23", 21 * 60);
    expect(d).toMatchObject({ tomorrow: true, date: "2026-10-24" });
    expect(termine("2026-10-23", 21 * 60)).toEqual(titel("2026-10-24"));
  });

  it("Sport-Ring passt zum Wochentag: Mo leer, Do/Fr 2 von 3, am Wochenende geschafft", () => {
    expect(demoSportRing("2026-10-19").trainings).toBe(0);
    expect(demoSportRing("2026-10-22").trainings).toBe(2);
    expect(demoSportRing("2026-10-24")).toEqual({ trainings: 3, ziel: 3 });
  });
});

describe("Aufgaben und Essen am Wochenende", () => {
  it("werktags „heute“, am Wochenende/Feiertag alles für die Woche, nie dringend (kein Druck im Beispiel)", () => {
    expect(aufgaben("2026-10-21").every((a) => a.date === "2026-10-21")).toBe(true);
    expect(aufgaben("2026-10-21").some((a) => a.dringend)).toBe(false);
    for (const d of ["2026-10-24", "2026-10-25", "2026-10-31"]) {
      expect(aufgaben(d).every((a) => !a.date && a.week), d).toBe(true);
      expect(aufgaben(d).some((a) => a.dringend), d).toBe(false);
    }
  });

  it("Essen = nächste Mahlzeit mit Foto: vormittags Mittag, nachmittags Abend, spät das Mittag von morgen", () => {
    for (const d of [...TAGE.werktag, ...TAGE.wochenende]) {
      expect(demoDishAt(d, 600)).toMatchObject({ clock: "12:30", tomorrow: false });
      expect(demoDishAt(d, 16 * 60)).toMatchObject({ clock: "18:30", tomorrow: false });
      expect(demoDishAt(d, 21 * 60)).toMatchObject({ clock: "12:30", tomorrow: true });
      expect(demoDishAt(d, 600).photo).toMatch(/\.webp$/);
    }
    expect(demoDishAt("2026-10-24", 16 * 60).recipe.title).toBe("Lasagne");
    expect(demoDishAt("2026-10-25", 600).recipe.title).toBe("Ofen-Hähnchen mit Kartoffeln");
  });
});
