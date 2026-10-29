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
    const d = demoEntries(TODAY, t.minutes);
    const termine = d.entries.filter((e) => e.typ === "termin").map((e) => e.data as { date: string; start: string; title: string });
    return { ...d, minutes: t.minutes, termine };
  };

  const halfHours = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

  it.each(halfHours)("um %s: nie ein vergangener Termin (laufende 30 Min „läuft“), sortiert, ab 20 Uhr morgen, Essen = nächste Mahlzeit", (clock) => {
    const d = demoAt(clock);
    const [hh, mm] = clock.split(":").map(Number);
    const jetzt = hh * 60 + mm;
    const stamps = d.termine.map((t) => `${t.date} ${t.start}`);
    for (const t of d.termine) {
      const [th, tm] = t.start.split(":").map(Number);
      if (t.date === TODAY) expect(th * 60 + tm + 30).toBeGreaterThan(jetzt);
    }
    expect(stamps).toEqual([...stamps].sort());
    expect(d.termine.length).toBeGreaterThanOrEqual(1);
    if (jetzt >= 20 * 60) expect(d.tomorrow).toBe(true);
    expect(d.entries.filter((e) => e.typ === "aufgabe").every((e) => !(e.data as { date?: string }).date || (e.data as { date: string }).date === d.date)).toBe(true);
    const dish = demoDishAt(TODAY, d.minutes);
    if (jetzt < 13 * 60) expect(dish).toMatchObject({ clock: "12:30", tomorrow: false });
    else if (jetzt < 20 * 60) expect(dish).toMatchObject({ clock: "18:30", tomorrow: false });
    else expect(dish).toMatchObject({ clock: "12:30", tomorrow: true });
    expect(dish.photo).toMatch(/\.webp$/);
  });

  it("gerade dran = „läuft“: ein Termin bleibt 30 Minuten nach Beginn stehen", () => {
    const plan = demoAt("06:00").termine;
    const [h0, m0] = plan[1].start.split(":").map(Number);
    const mitten = `${String(h0).padStart(2, "0")}:${String(m0 + 10).padStart(2, "0")}`;
    expect(demoAt(mitten).termine.map((t) => t.start)).toContain(plan[1].start);
  });

  it("echte Termine statt Mahlzeiten, 1–3 Wörter, keine Adressen", () => {
    for (const tag of ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-24", "2026-10-25"]) {
      const titles = demoEntries(tag, 6 * 60).entries.map((e) => (e.data as { title: string }).title);
      expect(titles.every((t) => t.split(/\s+/).length <= 3 && !/[,…]|straße|weg \d/i.test(t))).toBe(true);
      expect(titles.some((t) => /mittag|abendessen|kochen/i.test(t))).toBe(false);
    }
  });

  it("ab 20 Uhr Beispiele für morgen", () => {
    expect(demoEntries(TODAY, 20 * 60).tomorrow).toBe(true);
    expect(demoEntries(TODAY, 21 * 60 + 5)).toMatchObject({ tomorrow: true, date: "2026-10-22" });
    expect(demoEntries(TODAY, 19 * 60).tomorrow).toBe(false);
  });

  it("Essen: vor 13 Uhr Mittag, dann Abend bis 20 Uhr, danach Mittag von morgen", () => {
    expect(demoDishAt(TODAY, 12 * 60 + 59)).toMatchObject({ clock: "12:30", tomorrow: false });
    expect(demoDishAt(TODAY, 13 * 60)).toMatchObject({ clock: "18:30", tomorrow: false });
    expect(demoDishAt(TODAY, 19 * 60 + 59)).toMatchObject({ clock: "18:30", tomorrow: false });
    expect(demoDishAt(TODAY, 20 * 60)).toMatchObject({ clock: "12:30", tomorrow: true });
  });

  it("Aufgaben werktags drei, alltäglich, nichts abgehakt", () => {
    const tasks = demoEntries(TODAY, 600).entries.filter((e) => e.typ === "aufgabe");
    expect(tasks).toHaveLength(3);
    expect(tasks.every((e) => !(e.data as { done?: boolean }).done)).toBe(true);
  });

  it("verschwindet nach 3 Tagen, je Kachel beim ersten Eigenen und mit „Jetzt leeren“", () => {
    const state = { version: 1 as const, since: TODAY, cleared: [] as DemoTile[], done: [], gone: [], asked: false };
    expect(demoTiles(state, TODAY)).toEqual(["termine", "aufgaben", "pinnwand", "einkauf", "essen", "notizen", "sport", "vorrat", "wundertuete"]);
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

  it("Standardwerte ohne Fragen; die App heißt Mia", () => {
    const p = profileFrom(startState());
    expect(p.helper.name).toBe("Mia");
    expect(p.persons).toHaveLength(1);
    expect(APP_NAME).toBe("Mia");
    expect(APP_SHORT_NAME).toBe("Mia");
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
