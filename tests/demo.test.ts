import { describe, expect, it } from "vitest";
import { askRemoveAll, demoEntries, demoTiles, type DemoTile } from "@/lib/core/demo";
import { STORAGE } from "@/lib/core/storage";
import { APP_NAME, APP_SHORT_NAME } from "@/lib/core/app";
import { withoutEmoji } from "@/lib/core/text";
import { profileFrom, startState } from "@/lib/einstellungen/welcome";

const TODAY = "2026-10-21";
const startsOf = (minutes: number) => demoEntries(TODAY, minutes, "Mia").entries.filter((e) => e.typ === "termin").map((e) => (e.data as { start: string }).start);

describe("Beispiel-Tag (erster Start)", () => {
  it("Uhrzeiten beim Öffnen berechnet: alle in der Zukunft, sortiert", () => {
    const at10 = startsOf(10 * 60);
    expect(at10[0]).toBe("11:00");
    expect(at10).toEqual([...at10].sort());
    const at19 = startsOf(19 * 60 + 10);
    expect(at19.every((t) => t > "19:10")).toBe(true);
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
