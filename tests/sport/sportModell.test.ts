import { beforeEach, describe, expect, it } from "vitest";
import { at, termin } from "../helpers";
import {
  EMPTY_SPORT,
  celebrationText,
  createTraining,
  endOf,
  guessMinutes,
  guessSport,
  hoursLabel,
  lastTraining,
  monthName,
  monthStats,
  nextTraining,
  packFor,
  parseSportCommand,
  praiseFor,
  sanitizeSport,
  sportById,
  statusLine,
  todaysTraining,
  trainingsBetween,
  weekDots,
  weekStatus,
  type SportState,
  type TrainingData,
} from "@/lib/sport/model";

const TODAY = "2026-10-21"; // Mittwoch
const run = (date: string, extra: Partial<TrainingData> = {}) => createTraining({ sport: "laufen", minutes: 30, date, ...extra });
const withRuns = (trainings: ReturnType<typeof run>[], goal = 3): SportState => ({ ...EMPTY_SPORT, goal, trainings });
const sportTermin = (date: string, start: string, extra: Record<string, unknown> = {}) => termin({ title: "Laufen am See", date, start, label: "Sport", ...extra });

beforeEach(() => at(`${TODAY}T12:00`));

describe("Training anlegen und prüfen", () => {
  it("räumt Werte auf: Minuten 1–600, km gerundet, Uhrzeit nur HH:MM", () => {
    const t = createTraining({ sport: "", minutes: 9999, km: 5.27, date: TODAY, time: "7 Uhr", note: "x".repeat(300), terminKey: "k" });
    expect(t.typ).toBe("training");
    expect(t.data).toEqual({ sport: "fitness", minutes: 600, km: 5.3, date: TODAY, note: "x".repeat(200), terminKey: "k" });
    expect(createTraining({ sport: "rad", minutes: Number.NaN, km: -1, date: TODAY, time: "07:30" }).data).toEqual({ sport: "rad", minutes: 30, date: TODAY, time: "07:30" });
    expect(createTraining({ sport: "yoga", minutes: 0.2, date: TODAY }).data.minutes).toBe(1);
  });

  it("prüft gespeicherten Stand", () => {
    expect(sanitizeSport(null)).toBe(EMPTY_SPORT);
    const s = sanitizeSport({
      goal: 9,
      trainings: [run(TODAY), { id: "x", typ: "notiz", data: { date: TODAY } }, { id: 1 }, null, { id: "y", typ: "training", data: { date: 5 } }],
      packs: { laufen: ["Schuhe", "", 3, ...Array(20).fill("x")], rad: "Helm" },
      celebrated: ["2026-10-12", 4],
      hidden: "nein",
    });
    expect(s.goal).toBe(3);
    expect(s.trainings).toHaveLength(1);
    expect(s.packs).toEqual({ laufen: ["Schuhe", "3", ...Array(10).fill("x")] });
    expect(s.celebrated).toEqual(["2026-10-12"]);
    expect(s.hidden).toEqual([]);
    expect(sanitizeSport({ goal: 5, packs: null }).goal).toBe(5);
  });

  it("Sportarten, eigene Packlisten, Unbekanntes als eigener Name", () => {
    expect(sportById("rad").label).toBe("Rad");
    expect(sportById("Klettern")).toMatchObject({ id: "Klettern", label: "Klettern", emoji: "💪" });
    expect(packFor(EMPTY_SPORT, "schwimmen")).toEqual(["Badesachen", "Handtuch", "Duschgel"]);
    expect(packFor({ packs: { schwimmen: ["Brille"] } }, "schwimmen")).toEqual(["Brille"]);
    expect(guessSport("War 5 km joggen")).toBe("laufen");
    expect(guessSport("Gassi mit dem Hund")).toBe("spazieren");
    expect(guessSport("Zahnarzt")).toBeNull();
  });
});

describe("Sport-Termine zählen mit", () => {
  it("abgehakte Sport-Termine werden Trainings (Dauer aus dem Termin), sonst 60 Min", () => {
    const entries = [sportTermin("2026-10-20", "18:00", { end: "18:45", doneDates: ["2026-10-20"] }), sportTermin("2026-10-19", "07:00", { doneDates: ["2026-10-19"] }), sportTermin("2026-10-22", "18:00")];
    const list = trainingsBetween(EMPTY_SPORT, entries, "2026-10-19", "2026-10-25", TODAY);
    expect(list.map((t) => [t.data.date, t.data.minutes, t.data.sport])).toEqual([
      ["2026-10-19", 60, "laufen"],
      ["2026-10-20", 45, "laufen"],
    ]);
    expect(list[0].id).toMatch(/^termin:/);
    expect(list[0].data.note).toBe("Laufen am See");
  });

  it("nur Termine mit Etikett Sport und für mich; geändert ersetzt, gelöscht zählt nicht", () => {
    const mine = sportTermin("2026-10-20", "18:00", { doneDates: ["2026-10-20"], who: ["felix"] });
    const other = sportTermin("2026-10-20", "19:00", { doneDates: ["2026-10-20"], who: ["lisa"] });
    const noLabel = termin({ title: "Laufen", date: "2026-10-20", start: "08:00", doneDates: ["2026-10-20"] });
    const entries = [mine, other, noLabel];
    expect(trainingsBetween(EMPTY_SPORT, entries, "2026-10-20", "2026-10-20", TODAY, "felix")).toHaveLength(1);
    expect(trainingsBetween(EMPTY_SPORT, entries, "2026-10-20", "2026-10-20", TODAY)).toHaveLength(2);
    const key = `${mine.id}@2026-10-20`;
    const edited = withRuns([run("2026-10-20", { terminKey: key, minutes: 90, time: "18:00" })]);
    const list = trainingsBetween(edited, entries, "2026-10-20", "2026-10-20", TODAY, "felix");
    expect(list.map((t) => t.data.minutes)).toEqual([90]);
    expect(trainingsBetween({ ...EMPTY_SPORT, hidden: [key] }, entries, "2026-10-20", "2026-10-20", TODAY, "felix")).toEqual([]);
  });

  it("sortiert nach Tag und Uhrzeit", () => {
    const s = withRuns([run("2026-10-20", { time: "19:00" }), run("2026-10-20", { time: "07:00" }), run("2026-10-19")]);
    expect(trainingsBetween(s, [], "2026-10-19", "2026-10-25", TODAY).map((t) => `${t.data.date} ${t.data.time ?? ""}`)).toEqual(["2026-10-19 ", "2026-10-20 07:00", "2026-10-20 19:00"]);
  });
});

describe("Woche, Monat, Sätze ohne Druck", () => {
  it("Wochenstatus mit Ziel und Bonus", () => {
    expect(weekStatus(withRuns([run("2026-10-19"), run("2026-10-20")]), [], TODAY)).toEqual({ monday: "2026-10-19", count: 2, goal: 3, reached: false, bonus: false });
  });

  it("ein Satz – Erfolge zeigen, Versäumnisse nicht", () => {
    const w = (count: number, goal = 3) => ({ monday: "2026-10-19", count, goal, reached: count >= goal, bonus: count > goal });
    expect(statusLine(w(4), 2, false)).toBe("Mehr als geplant – richtig schöne Woche.");
    expect(statusLine(w(3), 2, false)).toBe("Wochenziel geschafft – schön.");
    expect(statusLine(w(0), 0, true)).toBe("Letzte Woche lief richtig gut – auf ein Neues.");
    expect(statusLine(w(0), 0, false)).toBe("Neue Woche, neues Glück.");
    expect(statusLine(w(0), 3, false)).toBe("Die Woche ist bereit für dich.");
    expect(statusLine(w(2), 3, false)).toBe("Ein Training noch, dann ist die Woche rund.");
    expect(statusLine(w(1, 4), 3, false)).toBe("Schön dabei diese Woche.");
    for (const n of [0, 1, 2, 3, 4]) expect(statusLine(w(n), 3, false)).not.toMatch(/\d|nicht|fehlt|musst/);
  });

  it("Monat: Anzahl, Minuten, km – laufender Monat bis heute", () => {
    const s = withRuns([run("2026-10-01", { km: 5 }), run("2026-10-21", { km: 4.25, minutes: 25 }), run("2026-10-25"), run("2026-09-30")]);
    expect(monthStats(s, [], TODAY)).toEqual({ month: "2026-10", count: 2, minutes: 55, km: 9.3 });
    expect(monthStats(s, [], TODAY, null, "2026-09")).toEqual({ month: "2026-09", count: 1, minutes: 30, km: 0 });
    expect(monthStats(withRuns([run("2025-12-31")]), [], TODAY, null, "2025-12").count).toBe(1);
    expect(monthName("2026-03-01")).toBe("März");
  });

  it("Stunden-Text, Feier, konkretes Lob", () => {
    expect(hoursLabel(560)).toBe("9 h 20 min");
    expect(hoursLabel(120)).toBe("2 h");
    expect(hoursLabel(45)).toBe("45 min");
    expect(celebrationText("Felix")).toBe("Stark, Felix! Dein Wochenziel ist geschafft.");
    expect(celebrationText("")).toBe("Stark! Dein Wochenziel ist geschafft.");
    const s = withRuns([run("2026-10-02"), run("2026-10-10")]);
    expect(praiseFor(s, [], { sport: "laufen", minutes: 30, date: "2026-10-10" }, TODAY)).toBe("Das ist dein 2. Lauf im Oktober.");
    expect(praiseFor(s, [], { sport: "yoga", minutes: 30, date: "2026-10-10" }, TODAY)).toBe("Dein erstes Mal Yoga im Oktober.");
  });

  it("Punkte Mo–So: trainiert, geplant (ab heute), frei", () => {
    const entries = [sportTermin("2026-10-23", "18:00"), sportTermin("2026-10-19", "07:00")];
    const dots = weekDots(withRuns([run("2026-10-20")]), entries, TODAY);
    expect(dots.map((d) => d.state)).toEqual(["frei", "trainiert", "frei", "frei", "geplant", "frei", "frei"]);
    expect(dots[4]).toMatchObject({ label: "Fr", time: "18:00", today: false });
    expect(dots[2].today).toBe(true);
  });

  it("Punkte kennen die Sportart (Kachel zeigt ein Icon statt nur „18“)", () => {
    const entries = [sportTermin("2026-10-22", "18:00"), termin({ title: "Kurs", date: "2026-10-24", start: "10:00", label: "Sport" })];
    const dots = weekDots(withRuns([run("2026-10-20", { sport: "yoga" })]), entries, TODAY);
    expect(dots.map((d) => d.sport)).toEqual([null, "yoga", null, "laufen", null, "Kurs", null]);
  });

  it("Ende eines geplanten Trainings bleibt am selben Tag", () => {
    expect(endOf("18:00", 45)).toBe("18:45");
    expect(endOf("07:30", 90)).toBe("09:00");
    // vorher: 23:30 + 45 Min ergab „23:15“ (vor dem Start)
    expect(endOf("23:30", 45)).toBe("23:59");
  });
});

describe("Nächstes und heutiges Training, letztes Mal", () => {
  it("nächstes geplantes: heute nur, solange es noch nicht vorbei ist", () => {
    const entries = [sportTermin(TODAY, "07:00"), sportTermin("2026-10-23", "18:00", { end: "19:00" })];
    expect(nextTraining(entries, TODAY, 7 * 60 + 30)?.date).toBe(TODAY);
    expect(nextTraining(entries, TODAY, 8 * 60 + 5)?.date).toBe("2026-10-23");
    const withEnd = [sportTermin(TODAY, "07:00", { end: "07:45" })];
    expect(nextTraining(withEnd, TODAY, 7 * 60 + 50)).toBeNull();
    expect(nextTraining([termin({ title: "Ohne Zeit", date: TODAY, start: "", label: "Sport" })], TODAY, 23 * 60)?.title).toBe("Ohne Zeit");
  });

  it("heutiges Training mit Start und Ende (für die Sport-Phase)", () => {
    expect(todaysTraining([sportTermin(TODAY, "18:00", { end: "19:30" })], TODAY)).toEqual({ start: 1080, end: 1170, title: "Laufen am See" });
    expect(todaysTraining([sportTermin(TODAY, "18:00", { end: "17:00" })], TODAY)?.end).toBe(1140);
    expect(todaysTraining([sportTermin(TODAY, "18:00", { doneDates: [TODAY] })], TODAY)).toBeNull();
    expect(todaysTraining([], TODAY)).toBeNull();
  });

  it("letztes Training der letzten 90 Tage", () => {
    expect(lastTraining(withRuns([run("2026-10-01", { sport: "rad" }), run("2026-10-15", { sport: "yoga" })]), [], TODAY)?.sport).toBe("yoga");
    expect(lastTraining(withRuns([run("2026-06-01")]), [], TODAY)).toBeNull();
  });
});

describe("Sätze ohne KI", () => {
  it("eintragen: Sportart, Minuten, km, Tag", () => {
    expect(parseSportCommand("War heute 5 km laufen", TODAY)).toEqual({ kind: "add", sport: "laufen", minutes: null, km: 5, date: TODAY });
    expect(parseSportCommand("45 Minuten Fitnessstudio gestern", TODAY)).toEqual({ kind: "add", sport: "fitness", minutes: 45, km: null, date: "2026-10-20" });
    expect(parseSportCommand("Ich war vorgestern eine Stunde schwimmen", TODAY)).toMatchObject({ sport: "schwimmen", minutes: 60, date: "2026-10-19" });
    expect(parseSportCommand("Bin anderthalb Stunden geradelt", TODAY)).toMatchObject({ sport: "rad", minutes: 90 });
    expect(parseSportCommand("Hab eine halbe Stunde Yoga gemacht", TODAY)).toMatchObject({ sport: "yoga", minutes: 30 });
    expect(parseSportCommand("Ich bin 2,5 km spazieren gewesen", TODAY)).toMatchObject({ sport: "spazieren", km: 2.5 });
    // Partizip ohne weiteres Sport-Wort – bis v0.47.5 nicht erkannt
    expect(parseSportCommand("Ich bin heute 5 km gelaufen", TODAY)).toMatchObject({ kind: "add", sport: "laufen", km: 5 });
    expect(parseSportCommand("Bin gestern 30 Minuten geschwommen", TODAY)).toMatchObject({ sport: "schwimmen", minutes: 30, date: "2026-10-20" });
    expect(parseSportCommand("Hab heute 2 Stunden gewandert", TODAY)).toMatchObject({ sport: "spazieren", minutes: 120 });
    expect(parseSportCommand("Ich bin 20 Minuten gejoggt", TODAY)).toMatchObject({ sport: "laufen", minutes: 20 });
  });

  it("nicht eintragen: Fragen, Zukunft, andere Personen, ohne Sportart", () => {
    expect(parseSportCommand("Gehst du laufen?", TODAY)).toBeNull();
    expect(parseSportCommand("Ich gehe morgen laufen", TODAY)).toBeNull();
    expect(parseSportCommand("Mathis war heute beim Fußball", TODAY, ["Mathis"])).toBeNull();
    expect(parseSportCommand("Ich war mit Mathis heute beim Fußball", TODAY, ["Mathis"])).toBeNull();
    expect(parseSportCommand("Laufen ist toll", TODAY)).toBeNull();
    expect(parseSportCommand("Ich mag Yoga", TODAY)).toBeNull();
    expect(parseSportCommand("Zahnarzt heute", TODAY)).toBeNull();
  });

  it("Wochenziel, Statistik, Planen", () => {
    expect(parseSportCommand("Ich will 4× pro Woche Sport machen", TODAY)).toEqual({ kind: "goal", goal: 4 });
    expect(parseSportCommand("Zweimal die Woche laufen gehen", TODAY)).toEqual({ kind: "goal", goal: 2 });
    expect(parseSportCommand("zwei mal pro Woche Training", TODAY)).toEqual({ kind: "goal", goal: 2 });
    expect(parseSportCommand("Setz mein Wochenziel auf 9", TODAY)).toEqual({ kind: "goal", goal: 7 });
    expect(parseSportCommand("Wie oft hab ich diese Woche trainiert?", TODAY)).toEqual({ kind: "stats", what: "woche", km: false });
    expect(parseSportCommand("Wie viele Kilometer bin ich im Oktober gelaufen?", TODAY)).toEqual({ kind: "stats", what: "monat", km: true });
    expect(parseSportCommand("Plan mir 3 Trainings nächste Woche, am liebsten morgens", TODAY)).toEqual({ kind: "plan", count: 3, part: "morgens", week: "naechste" });
    expect(parseSportCommand("Plane diese Woche zwei Läufe abends", TODAY)).toEqual({ kind: "plan", count: 2, part: "abends", week: "diese" });
    expect(parseSportCommand("Kannst du Trainings planen, gern in der Mittagspause?", TODAY)).toEqual({ kind: "plan", count: 3, part: "mittags", week: "naechste" });
  });

  it("geschätzte Dauer ohne Angabe", () => {
    expect(guessMinutes("laufen", 5)).toBe(30);
    expect(guessMinutes("rad", 20)).toBe(60);
    expect(guessMinutes("spazieren", null)).toBe(45);
    expect(guessMinutes("yoga", null)).toBe(45);
    expect(guessMinutes("fitness", null)).toBe(60);
  });
});
