// Beispiel-Tag passt zum Wochentag (v0.100): Werktag wie bisher (Elternabend
// nur Di bis Do), Samstag und Sonntag eigene Pläne, Feiertage (bundesweit +
// Schleswig-Holstein) wie Sonntag; am Wochenende kein „heute dran“ und Zeit
// zum Kochen.
import { describe, expect, it } from "vitest";
import { demoArt, demoDay, demoEntries } from "@/lib/core/demo";
import { demoDishAt } from "@/lib/essen/demoDish";
import { feiertage, istFeiertag, ostersonntag } from "@/lib/core/feiertage";

// Oktober 2026: Mo 19. · Di 20. · Mi 21. · Do 22. · Fr 23. · Sa 24. · So 25.
const titel = (date: string) => demoDay(date).map((t) => t.title);
const termine = (today: string, minutes: number) =>
  demoEntries(today, minutes, "Mia").entries.filter((e) => e.typ === "termin").map((e) => (e.data as { title: string; start: string }).title);
const aufgaben = (today: string) => demoEntries(today, 6 * 60, "Mia").entries.filter((e) => e.typ === "aufgabe").map((e) => e.data as { date?: string; week?: string; dringend?: boolean });

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

describe("Beispiel-Termine je Wochentag", () => {
  it("Mo bis Fr wie bisher, Elternabend nur Di bis Do", () => {
    expect(titel("2026-10-21")).toEqual(["Kita bringen", "Telefonat Versicherung", "Mathis Fußball", "Zahnarzt Jonne", "Elternabend", "Lieblingsserie"]);
    for (const d of ["2026-10-20", "2026-10-22"]) expect(titel(d)).toContain("Elternabend");
    for (const d of ["2026-10-19", "2026-10-23"]) {
      expect(titel(d)).toContain("Kita bringen");
      expect(titel(d)).not.toContain("Elternabend");
    }
  });

  it("Samstag", () => {
    expect(demoArt("2026-10-24")).toBe("samstag");
    expect(titel("2026-10-24")).toEqual(["Brötchen holen", "Wochenmarkt", "Fußballspiel Mathis", "Kindergeburtstag Ben", "Grillen mit Nachbarn"]);
  });

  it("Sonntag", () => {
    expect(demoArt("2026-10-25")).toBe("sonntag");
    expect(titel("2026-10-25")).toEqual(["Familienfrühstück", "Spaziergang am See", "Kaffee bei Oma", "Pizza backen", "Tatort"]);
  });

  it("Feiertag wie Sonntag – auch an einem Werktag (Reformationstag, Tag der Deutschen Einheit)", () => {
    expect(demoArt("2027-10-04")).toBe("werktag");
    for (const d of ["2025-10-31", "2027-05-06", "2026-12-25"]) {
      expect(demoArt(d), d).toBe("sonntag");
      expect(titel(d)).toContain("Familienfrühstück");
    }
  });

  it("Sa/So/Feiertag: kein Elternabend, keine Kita", () => {
    for (const d of ["2026-10-24", "2026-10-25", "2026-10-31", "2026-12-25"]) {
      expect(titel(d), d).not.toContain("Elternabend");
      expect(titel(d), d).not.toContain("Kita bringen");
      expect(termine(d, 6 * 60), d).not.toContain("Kita bringen");
    }
  });

  it("spät am Freitag: Beispiele für Samstag (der Plan wechselt mit dem Tag)", () => {
    const d = demoEntries("2026-10-23", 21 * 60, "Mia");
    expect(d).toMatchObject({ tomorrow: true, date: "2026-10-24" });
    expect(termine("2026-10-23", 21 * 60)[0]).toBe("Brötchen holen");
    expect(termine("2026-10-25", 21 * 60)[0]).toBe("Kita bringen");
  });
});

describe("Aufgaben und Essen am Wochenende", () => {
  it("werktags „heute“ und eine dringend, am Wochenende/Feiertag alles für die Woche, nichts dringend", () => {
    expect(aufgaben("2026-10-21").some((a) => a.date === "2026-10-21")).toBe(true);
    expect(aufgaben("2026-10-21").some((a) => a.dringend)).toBe(true);
    for (const d of ["2026-10-24", "2026-10-25", "2026-10-31"]) {
      expect(aufgaben(d).every((a) => !a.date && a.week), d).toBe(true);
      expect(aufgaben(d).some((a) => a.dringend), d).toBe(false);
    }
  });

  it("Essen: werktags Pasta, samstags Lasagne, sonntags Ofen-Hähnchen am Mittag", () => {
    expect(demoDishAt("2026-10-21", 600).recipe.title).toBe("Pasta mit Tomaten & Burrata");
    expect(demoDishAt("2026-10-24", 600)).toMatchObject({ clock: "18:30", tomorrow: false, photo: "/gerichte/lasagne.webp" });
    expect(demoDishAt("2026-10-24", 600).recipe.title).toBe("Lasagne");
    const so = demoDishAt("2026-10-25", 600);
    expect(so).toMatchObject({ clock: "12:30", tomorrow: false });
    expect(so.recipe.title).toBe("Ofen-Hähnchen mit Kartoffeln");
    expect(demoDishAt("2026-10-31", 600).recipe.title).toBe("Ofen-Hähnchen mit Kartoffeln");
  });

  it("nach dem Essen das Gericht von morgen: Fr → Lasagne, Sa → Hähnchen, So → Pasta, Mi → Ofengemüse", () => {
    expect(demoDishAt("2026-10-23", 21 * 60).recipe.title).toBe("Lasagne");
    expect(demoDishAt("2026-10-24", 21 * 60)).toMatchObject({ tomorrow: true, clock: "12:30" });
    expect(demoDishAt("2026-10-25", 15 * 60)).toMatchObject({ tomorrow: true, clock: "18:30" });
    expect(demoDishAt("2026-10-25", 15 * 60).recipe.title).toBe("Pasta mit Tomaten & Burrata");
    expect(demoDishAt("2026-10-21", 21 * 60).recipe.title).toBe("Ofengemüse mit Feta");
  });
});
