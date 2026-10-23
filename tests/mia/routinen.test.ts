// Mias Routinen (Tafel 81/82, Punkt 2): Morgen-Info, Überschneidung mit
// knapper Fahrtzeit, Packliste am Vorabend – Zeiten, Texte ohne Druck.
import { describe, expect, it } from "vitest";
import { morgenInfo, packFrage, ueberschneidungen, type RoutineTermin } from "@/lib/mia/routinen";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { VERBOTEN } from "@/lib/mia/persona";
import { jetztInput } from "../helpers";

const t = (key: string, title: string, time: string | null, extra: Partial<RoutineTermin> = {}): RoutineTermin => ({ key, title, time, end: null, who: [], ...extra });

describe("Morgen-Info", () => {
  const list = [t("z", "Zahnarzt", "16:00"), t("f", "Fußball", "15:00"), t("k", "Kunde", "09:00", { work: true })];
  it("6–10 Uhr, Familie, sortiert, Mia-Ton", () => {
    expect(morgenInfo(list, 7 * 60, null)).toEqual({ title: "Moin! Fußball 15, Zahnarzt 16", detail: "Rest vom Tag ist ruhig." });
    expect(morgenInfo(list, 5 * 60 + 59, null)).toBeNull();
    expect(morgenInfo(list, 10 * 60, null)).toBeNull();
    expect(morgenInfo([t("x", "Kunde", "09:00", { work: true })], 7 * 60, null)).toBeNull();
  });
  it("Regen nur mit Planbezug", () => {
    expect(morgenInfo(list, 7 * 60, { time: "14:00", title: "Mathis" })?.detail).toBe("Ab 14 Uhr Regen. Regenjacke für Mathis?");
  });
});

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

describe("Jetzt-Karte", () => {
  it("Themen erscheinen sanft, nachts nicht; Texte ohne Druck", () => {
    const routinen = { morgen: { title: "Moin! Fußball 15", detail: "Rest vom Tag ist ruhig." }, ueber: { key: "ueber:a+b", title: "Fußball und Zahnarzt", detail: "15 und 16 Uhr. Das wird knapp. Wer fährt?" }, pack: null };
    const day = jetztTopics(jetztInput(8 * 60, { routinen }));
    expect(day.map((x) => x.kind)).toEqual(expect.arrayContaining(["ueberschneidung", "morgen"]));
    expect(jetztTopics(jetztInput(23 * 60, { routinen })).some((x) => x.kind === "ueberschneidung")).toBe(false);
    for (const x of day) for (const re of VERBOTEN) expect(re.test(`${x.title} ${x.detail}`)).toBe(false);
  });
});
