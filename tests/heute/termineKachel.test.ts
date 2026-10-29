// Termine-Kachel: läuft 30 Min (bzw. bis Ende), ganztägig oben, „gleich“, alles vorbei → Morgen.
import { describe, expect, it } from "vitest";
import { terminRows, termineDiePassen, termineTile, titelUndOrt, zeilenBedarf } from "@/lib/heute/termineKachel";
import type { DayItem } from "@/lib/kalender/model";

const t = (title: string, time: string | null, end: string | null = null, done = false): DayItem =>
  ({ key: title, entry: { typ: "termin" } as DayItem["entry"], date: "2026-10-23", time, end, title, label: null, room: "familie", reminder: "aus", done, carried: null, dueLabel: null, repeat: null }) as DayItem;
const H = (h: number, m = 0) => h * 60 + m;
const names = (rows: { item: DayItem }[]) => rows.map((r) => r.item.title);

describe("Termine-Kachel", () => {
  const day = [t("Spiel", "10:30"), t("Kita bringen", "08:00"), t("Geburtstag Oma", null), t("Arzt", "15:00", "16:30")];

  it("8:00 bis 8:29 „läuft“, ab 8:30 weg und der nächste rückt hoch", () => {
    expect(terminRows(day, H(8, 0)).find((r) => r.item.title === "Kita bringen")?.state).toBe("laeuft");
    expect(terminRows(day, H(8, 29)).find((r) => r.item.title === "Kita bringen")?.state).toBe("laeuft");
    expect(names(terminRows(day, H(8, 30)))).toEqual(["Geburtstag Oma", "Spiel", "Arzt"]);
  });

  it("ganztägig oben, den ganzen Tag", () => {
    expect(names(terminRows(day, H(7)))[0]).toBe("Geburtstag Oma");
    expect(names(terminRows(day, H(23, 59)))).toEqual(["Geburtstag Oma"]);
  });

  it("mit Ende-Zeit: sichtbar bis zum Ende", () => {
    expect(terminRows(day, H(16, 29)).find((r) => r.item.title === "Arzt")?.state).toBe("laeuft");
    expect(names(terminRows(day, H(16, 30)))).not.toContain("Arzt");
  });

  it("„gleich“ beim nächsten (bis 60 Min vorher), sonst nur hervorgehoben", () => {
    expect(terminRows(day, H(9, 45)).find((r) => r.item.title === "Spiel")?.state).toBe("gleich");
    expect(terminRows(day, H(7)).find((r) => r.item.title === "Kita bringen")?.state).toBe("gleich");
    expect(terminRows(day, H(8, 40)).find((r) => r.item.title === "Spiel")?.state).toBe("naechster");
    expect(terminRows(day, H(8, 40)).find((r) => r.item.title === "Arzt")?.state).toBeNull();
  });

  it("Erledigtes zählt nicht", () => {
    expect(names(terminRows([t("Weg", "10:00", null, true)], H(9)))).toEqual([]);
  });

  it("alles vorbei → „Morgen · Sa“ mit den ersten Terminen von morgen", () => {
    const tomorrow = [t("Training", "10:00"), t("Frühstück", "08:30")];
    const tile = termineTile([t("Kita bringen", "08:00")], tomorrow, "2026-10-24", H(18));
    expect(tile.label).toBe("Morgen · Sa");
    expect(names(tile.rows)).toEqual(["Frühstück", "Training"]);
    expect(tile.rows.every((r) => r.state === null)).toBe(true);
    expect(termineTile([], [], "2026-10-24", H(18))).toEqual({ label: null, rows: [] });
    expect(termineTile(day, tomorrow, "2026-10-24", H(9)).label).toBeNull();
  });
});

// Tafel 147: Termin-Zeile nie mit „…“ kürzen – Ort klein in der zweiten Zeile, sonst umbrechen
describe("Titel und Ort der Termin-Zeile", () => {
  it("Ort nach dem letzten Komma bzw. „ · “ in die zweite Zeile", () => {
    expect(titelUndOrt("Zahnarzt, Praxis Meyer")).toEqual({ titel: "Zahnarzt", ort: "Praxis Meyer" });
    expect(titelUndOrt("Elternabend, Klasse 3b, Grundschule Eutin")).toEqual({ titel: "Elternabend, Klasse 3b", ort: "Grundschule Eutin" });
    expect(titelUndOrt("Laternenumzug · Marktplatz")).toEqual({ titel: "Laternenumzug", ort: "Marktplatz" });
  });
  it("sonst bleibt der Titel ganz (bricht um), nie gekürzt", () => {
    expect(titelUndOrt("Kita – Laternenfest mit Basteln für alle Kinder")).toEqual({ titel: "Kita – Laternenfest mit Basteln für alle Kinder", ort: null });
    expect(titelUndOrt("Zahnarzt, 10 Uhr")).toEqual({ titel: "Zahnarzt, 10 Uhr", ort: null });
    expect(titelUndOrt("Training")).toEqual({ titel: "Training", ort: null });
  });
  it("Kachel: kein truncate in der Termin-Zeile, Höhe wächst mit, passt es nicht → eine Zeile weniger", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/heute/MiniCards.tsx", "utf8");
    const zeile = src.slice(src.indexOf("function TerminLine"), src.indexOf("export function TermineSection"));
    expect(zeile).not.toMatch(/truncate|line-clamp|(?<!min-)h-\[30px\]/);
    expect(zeile).toMatch(/min-h-\[30px\]/);
    expect(src).toMatch(/termineDiePassen\(rows\.map/);
  });
  it("lange Titel: weniger Termine, mindestens einer – nie abgeschnitten (je = Zeichen pro Zeile)", () => {
    expect(zeilenBedarf("Training", 13)).toBe(1);
    expect(zeilenBedarf("Zahnarzt, Praxis Meyer", 13)).toBe(2);
    expect(zeilenBedarf("Elternabend der Klasse 3b", 13)).toBe(2);
    // iPhone SE, halbe Kachel: ~8 Zeichen
    expect(zeilenBedarf("Mathis Fußball", 8)).toBe(2);
    expect(zeilenBedarf("Laternelaufen", 8)).toBe(2);
    expect(termineDiePassen(["Mathis Fußball", "Laternelaufen"], 3, 8)).toBe(1);
    expect(termineDiePassen(["Training", "Kita", "Yoga", "Chor"], 3, 13)).toBe(3);
    expect(termineDiePassen(["Zahnarzt, Praxis Meyer", "Kita", "Yoga"], 3, 13)).toBe(2);
    expect(termineDiePassen(["Elternabend der Klasse 3b in der Grundschule am Wald", "Kita"], 3, 13)).toBe(1);
    expect(termineDiePassen(["Elternabend der Klasse 3b", "Kita"], 3, 30)).toBe(2);
    expect(termineDiePassen([], 3, 13)).toBe(1);
  });

});
