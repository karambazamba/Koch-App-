import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { celebrationText, statusLine } from "@/lib/sport/model";
import { pageLabel } from "@/lib/core/pageLabel";
import { jetztTopics, type JetztInput } from "@/lib/jetzt/topics";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx|ts)$/.test(f) ? [p] : [];
  });
}
const SOURCES = files(join(__dirname, "../src")).map((p) => ({ p, s: readFileSync(p, "utf8") }));

describe("Stilblatt: Farben und Radien nur über Tokens", () => {
  it("keine festen Tailwind-Farben (stone/red/emerald …, schwarz/weiß)", () => {
    const fixed = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|divide)-(?:stone|red|green|blue|emerald|rose|sky|amber|yellow|orange|gray|slate|zinc|neutral|black|white)(?:-\d+)?\b/;
    expect(SOURCES.filter(({ s }) => fixed.test(s)).map(({ p }) => p)).toEqual([]);
  });

  it("drei Radien: Karte, Feld/Knopf, rund – kein rounded-xl/2xl/3xl mehr", () => {
    expect(SOURCES.filter(({ s }) => /\brounded-(?:xl|2xl|3xl)\b/.test(s)).map(({ p }) => p)).toEqual([]);
  });

  it("keine dunkle Leiste mehr (bg-bar)", () => {
    expect(SOURCES.filter(({ s }) => /\bbg-bar\b|text-on-bar/.test(s)).map(({ p }) => p)).toEqual([]);
  });
});

describe("Ohne Druck: Sport ohne Zähler und Serien", () => {
  const week = (count: number, goal = 3) => ({ monday: "2026-10-19", count, goal, reached: count >= goal, bonus: count > goal });
  it("der Satz zur Woche enthält keine Zahlen und kein 🔥", () => {
    for (const n of [0, 1, 2, 3, 5]) for (const wd of [0, 3]) {
      const line = statusLine(week(n) as never, wd, true);
      expect(line).not.toMatch(/\d|🔥/);
    }
    expect(celebrationText("Felix")).toBe("Stark, Felix! Dein Wochenziel ist geschafft.");
  });

  it("Jetzt-Karte: Sport nur als heute geplantes Training, ohne „noch N“", () => {
    const base = { minutes: 10 * 60, today: "2026-10-21", calm: false, upcoming: [], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] }, urgent: [], dueToday: [], allDone: false, pin: null, weatherTip: null, weatherNow: null, dish: null, dinnerFree: false, birthdays: [], shop: null, timer: null, cookingStep: null, reminder: null, pause: null, leisure: null, tip: null, demo: false, firstTiles: [], weights: {}, hidden: [] } as unknown as JetztInput;
    const t = jetztTopics({ ...base, sport: { today: "Heute 18:00 Laufen" } }).find((x) => x.kind === "sport");
    expect(t?.title).toBe("Heute 18:00 Laufen");
    expect(jetztTopics({ ...base, sport: null }).some((x) => x.kind === "sport")).toBe(false);
  });
});

describe("Seitenkopf: „‹ vorherige Seite“", () => {
  it("benennt die Seite, zu der Zurück führt", () => {
    expect(pageLabel("/")).toBe("Heute");
    expect(pageLabel("/?seite=essen")).toBe("Essen");
    expect(pageLabel("/kochbuch")).toBe("Rezepte");
    expect(pageLabel("/profil")).toBe("Einstellungen");
    expect(pageLabel("/irgendwo")).toBe("Zurück");
    expect(pageLabel(null)).toBe("Zurück");
  });
});

describe("v0.31: Kalender, Essen, Rezepte", () => {
  it("Kalender-Punkte: Familie orange, Arbeit blau, Sport grün – Erledigtes zählt nicht", async () => {
    const { dayDots, dayHeading, mondayOf, relativeDay } = await import("@/components/kalender/CalendarPage");
    const item = (room: "familie" | "arbeit", label: string | null = null, done = false) => ({ room, label, done }) as never;
    expect(dayDots([item("familie"), item("arbeit"), item("familie", "Sport")])).toEqual(["familie", "arbeit", "sport"]);
    expect(dayDots([item("familie", null, true)])).toEqual([]);
    expect(mondayOf("2026-10-21")).toBe("2026-10-19");
    expect(relativeDay("2026-10-22", "2026-10-21")).toBe("morgen");
    expect(dayHeading("2026-10-22", "2026-10-21")).toBe("22. Oktober · morgen");
    expect(dayHeading("2026-10-30", "2026-10-21")).toBe("30. Oktober");
  });

  it("Kalender ist der alte Wochen-Reiter: alter Link bleibt gültig", () => {
    expect(pageLabel("/?seite=woche")).toBe("Kalender");
    expect(pageLabel("/?seite=kalender")).toBe("Kalender");
  });

  it("Teller-Farbe: gleiches Gericht, gleiche Farbe", async () => {
    const { dishTone } = await import("@/lib/essen/dishLook");
    expect(dishTone("Gulasch", "fleisch")).toBe(dishTone("gulasch", "fleisch"));
    expect(dishTone("Shakshuka", "vegetarisch")).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it("„auf die Liste“ statt „noch:“ – auch in der Jetzt-Karte", () => {
    const base = { minutes: 16 * 60, today: "2026-10-21", calm: false, upcoming: [], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] }, urgent: [], dueToday: [], allDone: false, pin: null, weatherTip: null, weatherNow: null, dinnerFree: false, birthdays: [], sport: null, shop: null, timer: null, cookingStep: null, reminder: null, pause: null, leisure: null, tip: null, demo: false, firstTiles: [], weights: {}, hidden: [] } as unknown as JetztInput;
    const t = jetztTopics({ ...base, dish: { name: "Pasta", clock: "18:30", minutes: 25, ready: false, missing: ["Basilikum"] } })[0];
    expect(t.title).toBe("Pasta – auf die Liste: Basilikum");
  });
});
