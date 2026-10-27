// Zwei Looks „Farbig“ und „Schlicht“ (Tafel 51): Profil v21 mit Migration,
// Lieblingsfarbe → „Meine Farbe im Kalender“, Mia-Befehle, Jetzt-Karte ohne
// Doppelung und Kontrast aller Kachel-Farben (beide Looks, hell und dunkel).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateProfile } from "@/lib/einstellungen/profileStore";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { settingsChange } from "@/lib/begleitung/settingsChat";
import { jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
import { jetztInput, jetztTermin } from "../helpers";

describe("Profil v21: Look und Kalenderfarbe", () => {
  it("neue Profile: Farbig, Kalenderfarbe Orange", () => {
    const p = createEmptyProfile();
    expect(p.version).toBe(22);
    expect(p.look).toBe("farbig");
    expect(p.calendarColor).toBe("orange");
  });

  it("v20 ohne Look → Farbig; die Lieblingsfarbe der Begleitung wird die Kalenderfarbe", () => {
    const old = { ...createEmptyProfile(), version: 20, helper: { name: "Mia", art: "assistentin", voice: "weiblich", farbe: "lila" } } as Record<string, unknown>;
    delete old.look;
    delete old.calendarColor;
    const p = migrateProfile(old)!;
    expect(p.version).toBe(22);
    expect(p.look).toBe("farbig");
    expect(p.calendarColor).toBe("lila");
    // Verstecken heißt nie löschen: die alte Farbe bleibt in den Daten
    expect(p.helper.farbe).toBe("lila");
  });

  it("v21 behält Schlicht und die gewählte Kalenderfarbe; Unsinn → Standard", () => {
    expect(migrateProfile({ ...createEmptyProfile(), look: "schlicht", calendarColor: "senf" })).toMatchObject({ look: "schlicht", calendarColor: "senf" });
    expect(migrateProfile({ ...createEmptyProfile(), look: "neon", calendarColor: "regenbogen" })).toMatchObject({ look: "farbig", calendarColor: "orange" });
  });
});

describe("Mia: ruhiger ↔ farbig", () => {
  const p = createEmptyProfile();
  it.each(["Mach die Startseite ruhiger", "Bitte weniger bunt", "Mach die App schlichter", "Die Kacheln sachlicher bitte", "Startseite dezenter"])("„%s“ → Schlicht", (text) => {
    expect(settingsChange(text, p)?.profile.look).toBe("schlicht");
  });
  it.each(["Wieder farbig bitte", "Mach die Startseite bunter", "Kacheln farbiger"])("„%s“ → Farbig", (text) => {
    expect(settingsChange(text, { ...p, look: "schlicht" })?.profile.look).toBe("farbig");
  });
  it("„ruhiger“ ohne Bezug zur Startseite ändert den Look nicht", () => {
    expect(settingsChange("Sprich ruhiger", p)?.profile.look ?? "farbig").toBe("farbig");
  });
  it("Mia bleibt orange: „Mach dich lila“ ändert keine Farbe", () => {
    const r = settingsChange("Mach dich lila", p);
    expect(r?.profile.helper.farbe ?? "orange").toBe("orange");
  });
});

describe("Jetzt-Karte ohne Doppelung", () => {
  const evening = (over: Partial<JetztInput> = {}) =>
    jetztInput(20 * 60, { tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [jetztTermin("Kita bringen", "08:00", {}, "2026-10-22")] }, ...over });
  it("abends EIN Thema: früher Termin morgen mit Wecker, nie die Kachel-Zeile „Morgen · Do: …“; Wetter nie ohne Plan", () => {
    const list = jetztTopics(evening());
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "frueh", title: "Morgen 8 Uhr Kita bringen.", detail: "Wecker auf 7?" });
    expect(list.map((t) => t.kind)).not.toContain("wetter");
    expect(list.some((t) => t.title.startsWith("Morgen · "))).toBe(false);
  });
  it("Regen zum Draußen-Termin bleibt – auch wenn die Wetter-Kachel da ist", () => {
    const planWeather = { key: "f", title: "Fußball", time: "17:00", word: "Regen" };
    expect(jetztTopics(jetztInput(14 * 60, { planWeather })).map((t) => t.kind)).toContain("wetter");
  });
});

/** Kontrast nach WCAG */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe("Kontrast der Kachel-Farben (2 Looks × hell/dunkel)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = (start: string) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
  const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--app-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
  const light = tokens(block(":root {"));
  const dark = tokens(block(':root[data-theme="nacht"] {'));
  const ids = ["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "tipps", "sport", "vorrat", "timer", "notizen", "spendentopf"];

  it.each(ids)("%s: Tonfarbe auf der Fläche ≥ 4,5:1 (Farbig, hell und dunkel)", (id) => {
    expect(contrast(light[`tile-${id}-ac`], light[`tile-${id}`])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark[`tile-${id}-ac`], dark[`tile-${id}`])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.ink, light[`tile-${id}`])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(ids)("%s: Tonfarbe auf Weiß bzw. dunkler Karte ≥ 4,5:1 (Schlicht)", (id) => {
    expect(contrast(light[`tile-${id}-ac`], light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark[`tile-${id}-ac`], dark.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
