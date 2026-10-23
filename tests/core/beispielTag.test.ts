import { afterEach, describe, expect, it } from "vitest";
import { askRemoveAll, demoEntries, demoTiles, type DemoTile } from "@/lib/core/demo";
import { demoDishAt } from "@/lib/essen/demoDish";
import { berlinTime, setNowForTests } from "@/lib/core/now";
import { at } from "../helpers";
import { STORAGE } from "@/lib/core/storage";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/core/app";
import { withoutEmoji } from "@/lib/core/text";
import { profileFrom, startState } from "@/lib/einstellungen/welcome";

const TODAY = "2026-10-21";

describe("Beispiel-Tag (erster Start)", () => {
  afterEach(() => setNowForTests(null));

  /** Beispiel-Termine zur Uhrzeit (über at()), als [Datum, Start, Titel] */
  const demoAt = (clock: string) => {
    at(`${TODAY}T${clock}`);
    const t = berlinTime();
    const d = demoEntries(TODAY, t.minutes, "Mia");
    const termine = d.entries.filter((e) => e.typ === "termin").map((e) => e.data as { date: string; start: string; title: string });
    return { ...d, minutes: t.minutes, termine };
  };

  const halfHours = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

  it.each(halfHours)("um %s: Termine in der Zukunft, sortiert, mindestens 2, keine Kaffeepause nach 17 Uhr, Essen nicht vorbei", (clock) => {
    const d = demoAt(clock);
    const stamps = d.termine.map((t) => `${t.date} ${t.start}`);
    expect(stamps.every((s) => s > `${TODAY} ${clock}`)).toBe(true);
    expect(stamps).toEqual([...stamps].sort());
    expect(d.termine.length).toBeGreaterThanOrEqual(2);
    expect(d.termine.some((t) => t.title === "Kaffeepause" && t.date === TODAY && t.start > "17:00")).toBe(false);
    expect(d.entries.filter((e) => e.typ === "aufgabe").every((e) => !(e.data as { date?: string }).date || (e.data as { date: string }).date === d.date)).toBe(true);
    const dish = demoDishAt(d.minutes);
    const dishStamp = `${dish.tomorrow ? "2026-10-22" : TODAY} ${dish.clock}`;
    expect(dishStamp > `${TODAY} ${clock}` || !dish.tomorrow).toBe(true);
    if (!dish.tomorrow) expect(d.minutes).toBeLessThan(18 * 60 + 30 + 90);
  });

  it("19:00 → nur, was noch kommt: Elternabend 19:30, Lieblingsserie 20:15 (Fehler: Kaffeepause 21:00)", () => {
    const d = demoAt("19:00");
    expect(d.tomorrow).toBe(false);
    expect(d.termine.map((t) => [t.start, t.title])).toEqual([
      ["19:30", "Elternabend"],
      ["20:15", "Lieblingsserie"],
    ]);
  });

  it("echte Termine statt Mahlzeiten (Tafel 51)", () => {
    const titles = demoAt("06:00").termine.map((t) => t.title);
    expect(titles).toEqual(["Kita bringen", "Telefonat Versicherung", "Mathis Fußball", "Zahnarzt Jonne", "Elternabend", "Lieblingsserie"]);
    expect(titles.some((t) => /frühstück|mittag|abendessen|kochen|essen/i.test(t))).toBe(false);
  });

  it("weniger als 2 heute → morgen ab dem Morgen; früh der ganze Tag", () => {
    const late = demoAt("21:00");
    expect(late.tomorrow).toBe(true);
    expect(late.date).toBe("2026-10-22");
    expect(late.termine[0]).toMatchObject({ start: "08:00", title: "Kita bringen" });
    expect(demoAt("06:00").termine.slice(0, 3).map((t) => t.title)).toEqual(["Kita bringen", "Telefonat Versicherung", "Mathis Fußball"]);
  });

  it("Essen: bis 18:30 + 90 Min Pasta heute, danach Ofengemüse für morgen", () => {
    expect(demoDishAt(19 * 60 + 59)).toMatchObject({ tomorrow: false, clock: "18:30" });
    expect(demoDishAt(19 * 60 + 59).recipe.title).toBe("Pasta mit Tomaten & Burrata");
    const later = demoDishAt(20 * 60);
    expect(later.tomorrow).toBe(true);
    expect(later.recipe.title).toBe("Ofengemüse mit Feta");
    expect(later.photo).toBe("/gerichte/ofengemuese-mit-feta.webp");
  });

  it("ab 21 Uhr Beispiele für morgen", () => {
    const d = demoEntries(TODAY, 21 * 60 + 5, "Mia");
    expect(d.tomorrow).toBe(true);
    expect(d.date).toBe("2026-10-22");
  });

  it("Name der Begleitung nie fest: „Theo etwas fragen“", () => {
    const titles = demoEntries(TODAY, 600, "Theo").entries.map((e) => (e.data as { title: string }).title);
    expect(titles).toContain("Theo etwas fragen");
  });

  it("verschwindet nach 3 Tagen, je Kachel beim ersten Eigenen und mit „Jetzt leeren“", () => {
    const state = { version: 1 as const, since: TODAY, cleared: [] as DemoTile[], done: [], gone: [], asked: false };
    expect(demoTiles(state, TODAY)).toEqual(["termine", "aufgaben", "pinnwand", "einkauf", "essen"]);
    expect(demoTiles(state, "2026-10-24")).toEqual([]);
    expect(demoTiles({ ...state, cleared: ["termine"] }, TODAY)).not.toContain("termine");
    expect(demoTiles(null, TODAY)).toEqual([]);
  });

  it("nach dem ersten eigenen Termin einmal fragen: „Alle Beispiele entfernen?“", () => {
    const base = { version: 1 as const, since: TODAY, cleared: [] as DemoTile[], done: [], gone: [], asked: false };
    expect(askRemoveAll(base, ["termine", "pinnwand"])).toBe(false);
    const own = { ...base, cleared: ["termine"] as DemoTile[] };
    expect(askRemoveAll(own, ["aufgaben", "pinnwand"])).toBe(true);
    expect(askRemoveAll({ ...own, asked: true }, ["aufgaben"])).toBe(false);
    expect(askRemoveAll({ ...base, cleared: ["pinnwand"] as DemoTile[] }, ["termine"])).toBe(false);
  });

  it("nie in der Sicherung", () => {
    expect(STORAGE.find((s) => s.key === "wasgibts.beispiel")?.backup).toBe(false);
  });

  it("Standardwerte ohne Fragen; App-Name mit typografischem Apostroph", () => {
    const p = profileFrom(startState());
    expect(p.helper.name).toBe("Mia");
    expect(p.persons).toHaveLength(1);
    expect(APP_NAME).toBe("Was gibt’s?");
    expect(APP_SHORT_NAME).toBe("Was gibt’s?");
  });
});

describe("Beispiel-Tag ohne Emojis in Kacheln", () => {
  it("withoutEmoji nimmt Emojis aus Titeln", () => {
    expect(withoutEmoji("Kaffeepause ☕")).toBe("Kaffeepause");
    expect(withoutEmoji("🍳 Kochen · seit 18:10")).toBe("Kochen · seit 18:10");
    expect(withoutEmoji("Ab 15 Uhr Regen ☂️ – Schirm")).toBe("Ab 15 Uhr Regen – Schirm");
    expect(withoutEmoji("Alles geschafft 🎉")).toBe("Alles geschafft");
  });
});
