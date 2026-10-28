import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { celebrationText } from "@/lib/sport/model";
import { stempelkarte } from "@/lib/sport/stempel";
import { EMPTY_SPORT, createTraining } from "@/lib/sport/model";
import { pageLabel } from "@/lib/core/pageLabel";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { jetztInput } from "../helpers";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx|ts)$/.test(f) ? [p] : [];
  });
}
const SOURCES = files(join(__dirname, "../../src")).map((p) => ({ p, s: readFileSync(p, "utf8") }));

describe("Stilblatt: Farben und Radien nur über Tokens", () => {
  it("keine festen Tailwind-Farben (stone/red/emerald …, schwarz/weiß)", () => {
    const fixed = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|divide)-(?:stone|red|green|blue|emerald|rose|sky|amber|yellow|orange|gray|slate|zinc|neutral|black|white)(?:-\d+)?\b/;
    expect(SOURCES.filter(({ s }) => fixed.test(s)).map(({ p }) => p)).toEqual([]);
  });

  it("drei Radien: Karte, Feld/Knopf, rund – kein rounded-xl/2xl/3xl mehr", () => {
    expect(SOURCES.filter(({ s }) => /\brounded-(?:xl|2xl|3xl)\b/.test(s)).map(({ p }) => p)).toEqual([]);
  });

  it("keine frei erfundenen Radien oder Farben in Klassen (rounded-[…], bg-[#…]) – Sonderfälle haben Token-Namen", () => {
    const bad = SOURCES.flatMap(({ p, s }) => [...s.matchAll(/\brounded-\[[^\]]+\]|\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|shadow)-\[#[0-9a-fA-F]+\]/g)].map((m) => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });

  it("feste Hex-Farben nur in Zeichnungen (Avatar, Teller, Spendentopf) – sonst Tokens", () => {
    const drawings = /(BegleitungAvatar|MiaZubehoer|DishPicture|PotGraphic|ItemSymbol|AnbieterLogo)\.tsx$/;
    const bad = SOURCES.filter(({ p }) => /components\/.*\.tsx$/.test(p) && !drawings.test(p)).flatMap(({ p, s }) => [...s.replace(/\/\/.*$/gm, "").matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });

  it("im Code nie var(--color-…) – die gibt es zur Laufzeit nicht (@theme inline), nur var(--app-…)", () => {
    // Fehler v0.32: Laden-Punkte in der Einkauf-Kachel blieben unsichtbar
    expect(SOURCES.filter(({ s }) => /var\(--color-/.test(s)).map(({ p }) => p)).toEqual([]);
  });

  it("Pastell-Kacheln: Startseiten-Kacheln nutzen TILE statt weißer Karten", () => {
    for (const f of ["heute/HomeTiles.tsx", "heute/MiniCards.tsx", "pinnwand/PinboardTile.tsx", "wetter/WeatherTile.tsx", "timer/TimerTile.tsx", "sport/SportTile.tsx"]) {
      const src = SOURCES.find(({ p }) => p.endsWith(f))!.s;
      expect(src, f).toMatch(/\bTILE\b/);
      expect(src, f).not.toMatch(/\$\{CARD\}/);
    }
  });

  it("Bearbeiten-Modus: Kacheln scrollen nativ (pan-y), nie touch-none (Fehler v0.33: Seite ließ sich kaum scrollen)", () => {
    const board = SOURCES.find(({ p }) => p.endsWith("heute/HomeBoard.tsx"))!.s;
    expect(board).toMatch(/touch-pan-y/);
    expect(board).not.toMatch(/\btouch-none\b/);
    expect(board).toMatch(/const HOLD_MS = 3[5-9]\d;/);
  });

  it("einmalige Hinweise nutzen keinen stillgelegten Speicher-Schlüssel", () => {
    const hints = SOURCES.find(({ p }) => p.endsWith("core/hints.ts"))!.s;
    expect(hints).toMatch(/"wasgibts.einmalhinweise"/);
  });

  it("keine dunkle Leiste mehr (bg-bar)", () => {
    expect(SOURCES.filter(({ s }) => /\bbg-bar\b|text-on-bar/.test(s)).map(({ p }) => p)).toEqual([]);
  });
});

describe("Ohne Druck: Sport ohne Zähler und Serien", () => {
  it("die Sätze der Stempelkarte enthalten keine Zahlen und kein 🔥", () => {
    for (const n of [0, 1, 2, 3, 5]) for (const goal of [null, 2, 3]) {
      const trainings = Array.from({ length: n }, () => createTraining({ sport: "laufen", minutes: 30, date: "2026-10-20" }));
      const k = stempelkarte({ ...EMPTY_SPORT, goal, trainings }, [], "2026-10-21", 12 * 60);
      expect(`${k.satz} ${k.klein ?? ""}`).not.toMatch(/\d|🔥|fehlt|offen|musst/);
    }
    expect(celebrationText("Felix")).toBe("Stark, Felix! Dein Wochenziel ist geschafft.");
  });

  it("Jetzt-Karte: Sport nur als Packliste fürs heute geplante Training, ohne „noch N“", () => {
    const sport = { key: "s", title: "Laufen", time: "18:00", pack: ["Laufschuhe", "Kopfhörer"] };
    const t = jetztTopics(jetztInput(10 * 60, { sport })).find((x) => x.kind === "packliste");
    expect(t?.title).toBe("Laufschuhe einpacken?");
    expect(t?.detail).not.toMatch(/noch \d|\d+ von/);
    expect(jetztTopics(jetztInput(10 * 60)).some((x) => x.kind === "packliste")).toBe(false);
  });
});

describe("Seitenkopf: „‹ vorherige Seite“", () => {
  it("benennt die Seite, zu der Zurück führt", () => {
    expect(pageLabel("/")).toBe("Heute");
    expect(pageLabel("/?seite=essen")).toBe("Essen");
    expect(pageLabel("/kochbuch")).toBe("Unsere Rezepte");
    expect(pageLabel("/profil")).toBe("Einstellungen");
    expect(pageLabel("/irgendwo")).toBe("Zurück");
    expect(pageLabel(null)).toBe("Zurück");
  });
});

describe("v0.31: Kalender, Essen, Rezepte", () => {
  it("Kalender: Wochenbeginn, „morgen“, Tag-Kopf", async () => {
    const { dayHeading, mondayOf, relativeDay } = await import("@/components/kalender/CalendarPage");
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
    const t = jetztTopics(jetztInput(17 * 60 + 40, { dish: { name: "Pasta", clock: "18:30", minutes: 25, ready: false, missing: ["Basilikum"] } }))[0];
    expect(t.kind).toBe("kochstart");
    expect(t.detail).toBe("auf die Liste: Basilikum");
  });
});

describe("Fehler: Neuer Termin aus dem Kalender nahm „heute“ statt des gewählten Tags", () => {
  it("vorgegebener Tag gilt, solange im Text kein Tag steht", async () => {
    const { readTerminText, terminDay } = await import("@/lib/kalender/quick");
    const today = "2026-10-21";
    const read = (t: string) => readTerminText(t, today).date;
    expect(terminDay("Zahnarzt 16:00", read("Zahnarzt 16:00"), null, "2026-10-23", today)).toBe("2026-10-23");
    expect(terminDay("Heute 16:00 Zahnarzt", read("Heute 16:00 Zahnarzt"), null, "2026-10-23", today)).toBe(today);
    expect(terminDay("Morgen 16:00 Zahnarzt", read("Morgen 16:00 Zahnarzt"), null, "2026-10-23", today)).toBe("2026-10-22");
    expect(terminDay("Zahnarzt 16:00", read("Zahnarzt 16:00"), "2026-10-25", "2026-10-23", today)).toBe("2026-10-25");
    expect(terminDay("Zahnarzt 16:00", read("Zahnarzt 16:00"), null, undefined, today)).toBe(today);
  });
});
