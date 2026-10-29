// Mias Routinen (Tafel 81/82, Punkt 2): Überschneidung mit
// knapper Fahrtzeit, Packliste am Vorabend – Zeiten, Texte ohne Druck.
import { describe, expect, it } from "vitest";
import { packFrage, ueberschneidungen, type RoutineTermin } from "@/lib/mia/routinen";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { VERBOTEN } from "@/lib/mia/persona";
import { jetztInput } from "../helpers";

const t = (key: string, title: string, time: string | null, extra: Partial<RoutineTermin> = {}): RoutineTermin => ({ key, title, time, end: null, who: [], ...extra });

describe("Überschneidungen", () => {
  it("Überlappung oder knappe Fahrtzeit (< 15 Min) mit Personen", () => {
    const list = [t("a", "Fußball", "15:00", { end: "16:00", who: ["k1"] }), t("b", "Zahnarzt", "16:10", { who: ["k2"] })];
    const u = ueberschneidungen(list);
    expect(u).toHaveLength(1);
    expect(u[0]).toMatchObject({ title: "Fußball und Zahnarzt", detail: "15 und 16:10 Uhr. Das wird knapp. Wer fährt?" });
    expect(ueberschneidungen([list[0], { ...list[1], time: "16:15" }])).toEqual([]);
    expect(ueberschneidungen([{ ...list[0], who: [] }, list[1]])).toEqual([]);
  });
  it("ohne Ende zählt 1 Stunde", () => {
    expect(ueberschneidungen([t("a", "A", "15:00", { who: ["x"] }), t("b", "B", "15:30", { who: ["y"] })])).toHaveLength(1);
  });
});

describe("Packliste am Vorabend", () => {
  const morgen = [t("k", "Kita-Ausflug", "08:00", { note: "Brotdose und Matschhose für Jonne." })];
  it("17–20 Uhr, morgen früh mit Notiz", () => {
    expect(packFrage(morgen, 18 * 60)).toMatchObject({ title: "Morgen früh: Kita-Ausflug.", detail: "Brotdose und Matschhose für Jonne. Soll ich’s auf die Packliste setzen?", items: "Brotdose und Matschhose für Jonne" });
    expect(packFrage(morgen, 20 * 60)).toBeNull();
    expect(packFrage(morgen, 16 * 60 + 59)).toBeNull();
    expect(packFrage([{ ...morgen[0], time: "14:00" }], 18 * 60)).toBeNull();
    expect(packFrage([{ ...morgen[0], note: "" }], 18 * 60)).toBeNull();
  });
});

describe("Jetzt-Karte (A-054)", () => {
  it("Routinen füllen die Karte nicht mehr – sie fragen nur in „Dein Tag“", () => {
    expect(jetztTopics(jetztInput(8 * 60, { tiles: ["pinnwand", "wetter"] }))).toEqual([]);
    for (const x of jetztTopics(jetztInput(8 * 60, { reminder: { key: "r", text: "Mama anrufen" } }))) for (const re of VERBOTEN) expect(re.test(`${x.title} ${x.detail}`)).toBe(false);
  });
});
