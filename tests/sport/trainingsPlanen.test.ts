import { beforeEach, describe, expect, it } from "vitest";
import { at, termin } from "../helpers";
import { freeStarts, planTrainings, plannedOn } from "@/lib/sport/model";

const TODAY = "2026-10-21"; // Mittwoch; nächste Woche ab Mo 26.10.
const base = { entries: [], today: TODAY, count: 3, part: null, week: "naechste" as const };
const days = (r: ReturnType<typeof planTrainings>) => r.slots.map((s) => `${s.date} ${s.start}-${s.end} ${s.sport}`);

beforeEach(() => at(`${TODAY}T12:00`));

describe("Trainings planen", () => {
  it("verteilt auf Mo, Mi, Fr – standardmäßig abends, 60 Minuten", () => {
    const r = planTrainings(base);
    expect(days(r)).toEqual(["2026-10-26 18:00-19:00 laufen", "2026-10-28 18:00-19:00 laufen", "2026-10-30 18:00-19:00 laufen"]);
    expect(r.slots[0].title).toBe("Laufen");
    expect(r.notes).toEqual([]);
  });

  it("Wunsch-Tageszeit, Sportart und Dauer", () => {
    const r = planTrainings({ ...base, count: 2, part: "morgens", sport: "yoga", minutes: 45 });
    expect(days(r)).toEqual(["2026-10-27 07:00-07:45 yoga", "2026-10-29 07:00-07:45 yoga"]);
    expect(days(planTrainings({ ...base, count: 1, part: "mittags" }))).toEqual(["2026-10-28 12:15-13:15 laufen"]);
  });

  it("60 Minuten Abstand zu Arbeit, 15 zu anderen Terminen", () => {
    const work = termin({ title: "Kundentermin", date: "2026-10-26", start: "16:30", end: "17:30" }, "arbeit");
    expect(planTrainings({ ...base, entries: [work] }).slots[0]).toMatchObject({ date: "2026-10-26", start: "07:00" });
    const family = termin({ title: "Kita-Fest", date: "2026-10-26", start: "16:30", end: "17:30" });
    expect(planTrainings({ ...base, entries: [family] }).slots[0]).toMatchObject({ date: "2026-10-26", start: "18:00" });
  });

  it("Wunschzeit belegt: Tag frei gelassen mit kurzer Erklärung, andere Tage dafür", () => {
    const evening = termin({ title: "Elternabend", date: "2026-10-26", start: "17:00", end: "21:00" });
    const r = planTrainings({ ...base, part: "abends", entries: [evening] });
    expect(r.slots.map((s) => s.date)).toEqual(["2026-10-28", "2026-10-30", "2026-11-01"]);
    expect(r.notes).toEqual(["Mo abends frei gelassen – da kommt Elternabend"]);
    const work = termin({ title: "Spätdienst", date: "2026-10-26", start: "06:00", end: "23:00" }, "arbeit");
    expect(planTrainings({ ...base, entries: [work] }).notes).toEqual(["Mo da frei gelassen – da ist Arbeit"]);
  });

  it("draußen bei Regen: trockene Zeit am selben Tag – sonst drinnen", () => {
    const rainEvening = (date: string, hour: number) => date === "2026-10-28" && hour >= 17;
    const r = planTrainings({ ...base, rainAt: rainEvening });
    expect(r.slots[1]).toMatchObject({ date: "2026-10-28", start: "07:00", sport: "laufen" });
    expect(r.notes).toEqual(["Mi: auf 07:00 gelegt – vorher regnet es"]);
    const allDay = planTrainings({ ...base, count: 1, rainAt: () => true });
    expect(allDay.slots[0]).toMatchObject({ date: "2026-10-28", sport: "fitness", title: "Fitnessstudio" });
    expect(allDay.notes).toEqual(["Mi: Regen angesagt – lieber drinnen"]);
    // Drinnen-Sport kümmert Regen nicht; ohne Vorhersage auch nicht
    expect(planTrainings({ ...base, count: 1, sport: "schwimmen", rainAt: () => true }).slots[0].sport).toBe("schwimmen");
    expect(planTrainings({ ...base, count: 1, rainAt: () => null }).slots[0].sport).toBe("laufen");
  });

  it("diese Woche: nur Tage nach heute; zu wenig Lücken wird gesagt", () => {
    const r = planTrainings({ ...base, count: 7, week: "diese" });
    expect(r.slots.map((s) => s.date)).toEqual(["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
    expect(r.notes).toEqual(["Nur 4 freie Lücken gefunden."]);
    // zu viele gewünscht: wie 7
    expect(planTrainings({ ...base, count: 9 }).slots).toHaveLength(7);
  });

  it("Tage nebeneinander erst im zweiten Durchgang (zuerst mit Lücke dazwischen)", () => {
    const r = planTrainings({ ...base, count: 5 });
    expect(r.slots.map((s) => s.date)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-30", "2026-11-01"]);
  });
});

describe("Freie Startzeiten und geplante Trainings", () => {
  it("freie Startzeiten eines Tages, früh bis abends", () => {
    expect(freeStarts([], "2026-10-26", TODAY, 60)).toEqual(["07:00", "18:00", "19:00"]);
    const evening = termin({ title: "Chor", date: "2026-10-26", start: "18:00", end: "20:00" });
    expect(freeStarts([evening], "2026-10-26", TODAY, 60, 5)).toEqual(["07:00", "08:00", "12:15"]);
    expect(freeStarts([evening], "2026-10-26", TODAY, 60, 2)).toEqual(["07:00", "12:15"]);
  });

  it("geplante Sport-Termine (nicht abgehakt)", () => {
    const planned = termin({ title: "Laufen", date: "2026-10-26", start: "18:00", label: "Sport" });
    const done = termin({ title: "Yoga", date: "2026-10-26", start: "07:00", label: "sport", doneDates: ["2026-10-26"] });
    expect(plannedOn([planned, done], "2026-10-26", TODAY).map((i) => i.title)).toEqual(["Laufen"]);
  });
});
