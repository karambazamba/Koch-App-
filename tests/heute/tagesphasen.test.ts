import { describe, expect, it } from "vitest";
import { PHASES, currentPhase, eveningStart, type PhaseContext, type PhaseDef } from "@/lib/heute/phases";
import { DEFAULT_ROUTINE, clockMinutes, previewLabel, type DayRoutine } from "@/lib/heute/tagesablauf";
import { begleitungPush, pushAllowed, type PushCheck } from "@/lib/heute/push";

const H = (h: number, m = 0) => h * 60 + m;

function ctx(over: Partial<PhaseContext> = {}, routine: Partial<DayRoutine> = {}): PhaseContext {
  return {
    minutes: H(12),
    weekday: 2,
    routine: { ...DEFAULT_ROUTINE, ...routine },
    mealClock: null,
    cooking: { manualAt: null, timerRunning: false, firstTimerAt: null, lastTimerEnd: null },
    sport: { on: false, training: null },
    workEnd: null,
    ...over,
  };
}
const phase = (c: PhaseContext) => currentPhase(c).def.id;

describe("Tagesphasen", () => {
  it("Morgens bis zur Einstellung, dann Tagsüber, ab Feierabend bis 5 Uhr Feierabend", () => {
    expect(phase(ctx({ minutes: H(4, 59) }))).toBe("feierabend");
    expect(phase(ctx({ minutes: H(5) }))).toBe("morgen");
    expect(phase(ctx({ minutes: H(9, 59) }))).toBe("morgen");
    expect(phase(ctx({ minutes: H(10) }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(8) }, { morgenBis: "08:00" }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(20) }))).toBe("feierabend");
    expect(currentPhase(ctx({ minutes: H(7) })).def.label).toBe("Morgens");
  });

  it("Feierabend frühestens nach dem letzten Arbeit-Termin (abschaltbar)", () => {
    expect(eveningStart(ctx({ workEnd: H(21) }))).toBe(H(21));
    expect(eveningStart(ctx({ workEnd: H(17) }))).toBe(H(20));
    expect(eveningStart(ctx({ workEnd: H(21) }, { nachArbeit: false }))).toBe(H(20));
    expect(phase(ctx({ minutes: H(20, 30), workEnd: H(21) }))).toBe("tagsueber");
  });

  it("Feierabend mit Ruhe: Arbeit und Aufgaben machen Pause, Wetter zeigt morgen", () => {
    expect(currentPhase(ctx({ minutes: H(21) })).view).toEqual({ hideWork: true, familyUpcomingOnly: true, tasksRest: true, weatherTomorrow: true });
    expect(currentPhase(ctx({ minutes: H(21) }, { ruhe: false })).view).toEqual({ hideWork: false, familyUpcomingOnly: false, tasksRest: false, weatherTomorrow: true });
    // ohne Ruhe, aber freier Tag: Arbeit trotzdem weg
    expect(currentPhase(ctx({ minutes: H(21), weekday: 6 }, { ruhe: false, arbeitstage: [0, 1, 2, 3, 4] })).view.hideWork).toBe(true);
  });

  it("an freien Tagen ist Arbeit den ganzen Tag weg", () => {
    const free = { arbeitstage: [0, 1, 2, 3, 4] };
    expect(currentPhase(ctx({ weekday: 5 }, free)).view.hideWork).toBe(true);
    expect(currentPhase(ctx({ weekday: 4 }, free)).view.hideWork).toBe(false);
    expect(currentPhase(ctx({ weekday: 5, minutes: H(7) }, free)).view.hideWork).toBe(true);
  });

  it("Kochen automatisch 20 Min vor dem Essen bis 45 Min danach – mit Schritten und Wake Lock", () => {
    const meal = { mealClock: "18:30" };
    expect(phase(ctx({ ...meal, minutes: H(18, 9) }))).toBe("tagsueber");
    expect(phase(ctx({ ...meal, minutes: H(18, 10) }))).toBe("kochen");
    expect(currentPhase(ctx({ ...meal, minutes: H(18, 10) })).view).toEqual({ hideWork: false, cooking: true, wakeLock: true });
    expect(phase(ctx({ ...meal, minutes: H(19, 14) }))).toBe("kochen");
    expect(phase(ctx({ ...meal, minutes: H(19, 15) }))).toBe("tagsueber");
    expect(phase(ctx({ ...meal, minutes: H(18, 10) }, { kochenAuto: false }))).toBe("tagsueber");
    expect(phase(ctx({ ...meal, minutes: H(17, 50) }, { kochenMin: 40 }))).toBe("kochen");
  });

  it("Kochen mit Timer: solange er läuft und 15 Min nach dem letzten", () => {
    const running = { manualAt: null, timerRunning: true, firstTimerAt: H(17), lastTimerEnd: H(17, 10) };
    expect(phase(ctx({ minutes: H(17, 5), cooking: running }))).toBe("kochen");
    const over = { ...running, timerRunning: false };
    expect(phase(ctx({ minutes: H(17, 24), cooking: over }))).toBe("kochen");
    expect(phase(ctx({ minutes: H(17, 25), cooking: over }))).toBe("tagsueber");
    // läuft gegen Mitternacht über – vor dem ersten Start nicht
    expect(phase(ctx({ minutes: H(16, 59), cooking: over }))).toBe("tagsueber");
  });

  it("Kochen von Hand: bis zu einer Stunde, länger mit Timer oder Essenszeit", () => {
    const manual = { manualAt: H(17), timerRunning: false, firstTimerAt: null, lastTimerEnd: null };
    expect(phase(ctx({ minutes: H(16, 59), cooking: manual }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(17, 59), cooking: manual }))).toBe("kochen");
    expect(phase(ctx({ minutes: H(18), cooking: manual }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(18, 30), cooking: { ...manual, timerRunning: true } }))).toBe("kochen");
    expect(phase(ctx({ minutes: H(18, 30), cooking: { ...manual, lastTimerEnd: H(18, 20) } }))).toBe("kochen");
    expect(phase(ctx({ minutes: H(19), mealClock: "18:30", cooking: manual }, { kochenAuto: false }))).toBe("kochen");
  });

  it("Sport: 60 Min vor dem Training bis zu seinem Ende, nur mit Sport-Kachel", () => {
    const training = { start: H(18), end: H(19), title: "Laufen" };
    expect(phase(ctx({ minutes: H(17), sport: { on: true, training } }))).toBe("sport");
    expect(phase(ctx({ minutes: H(16, 59), sport: { on: true, training } }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(19), sport: { on: true, training } }))).toBe("tagsueber");
    expect(phase(ctx({ minutes: H(17), sport: { on: false, training } }))).toBe("tagsueber");
    expect(currentPhase(ctx({ minutes: H(17), weekday: 6, sport: { on: true, training } }, { arbeitstage: [0] })).view).toEqual({ hideWork: true });
    // Kochen schlägt Sport
    expect(phase(ctx({ minutes: H(18, 15), mealClock: "18:30", sport: { on: true, training } }))).toBe("kochen");
  });

  it("eigene Phasen-Liste: keine aktiv → die letzte", () => {
    const never: PhaseDef = { id: "morgen", label: "Nie", rank: 99, active: () => false, view: () => ({ hideWork: false }) };
    const last: PhaseDef = { id: "tagsueber", label: "Rest", rank: 1, active: () => false, view: () => ({ hideWork: true }) };
    expect(currentPhase(ctx(), [never, last])).toEqual({ def: last, view: { hideWork: true } });
    expect(PHASES.map((p) => p.id)).toEqual(["kochen", "sport", "feierabend", "morgen", "tagsueber"]);
  });
});

describe("Push-Regeln (vorbereitet)", () => {
  const base: PushCheck = { kind: "proaktiv", minutes: H(12), routine: DEFAULT_ROUTINE, workEnd: null, paused: false, proactiveSentToday: false };

  it("Timer dürfen immer – auch in der Pause und nachts", () => {
    expect(pushAllowed({ ...base, kind: "timer", paused: true, minutes: H(23) })).toBe(true);
  });

  it("Pause = absolute Ruhe", () => {
    expect(pushAllowed({ ...base, kind: "termin-familie", paused: true })).toBe(false);
  });

  it("proaktiv höchstens einmal am Tag, Ruhezeit 20–7 Uhr", () => {
    expect(pushAllowed(base)).toBe(true);
    expect(pushAllowed({ ...base, proactiveSentToday: true })).toBe(false);
    expect(pushAllowed({ ...base, minutes: H(20) })).toBe(false);
    expect(pushAllowed({ ...base, minutes: H(6, 59) })).toBe(false);
    expect(pushAllowed({ ...base, minutes: H(7) })).toBe(true);
  });

  it("Ruhe nach Feierabend: nichts zu Arbeit und Aufgaben, Familien-Termine schon", () => {
    expect(pushAllowed({ ...base, kind: "termin-arbeit", minutes: H(21) })).toBe(false);
    expect(pushAllowed({ ...base, kind: "aufgabe", minutes: H(8) })).toBe(false);
    expect(pushAllowed({ ...base, kind: "termin-familie", minutes: H(21) })).toBe(true);
    expect(pushAllowed({ ...base, kind: "aufgabe", minutes: H(12) })).toBe(true);
    expect(pushAllowed({ ...base, kind: "termin-arbeit", minutes: H(20, 30), workEnd: H(21) })).toBe(true);
    expect(pushAllowed({ ...base, kind: "termin-arbeit", minutes: H(21), routine: { ...DEFAULT_ROUTINE, ruhe: false } })).toBe(true);
  });

  it("Mitteilung im Namen der Begleitung mit ihrem Gesicht", () => {
    const push = begleitungPush({ helper: { name: "Theo", art: "assistent", voice: "maennlich", farbe: "nachtblau" } } as never, "Nudeln sind fertig.");
    expect(push.body).toBe("Mia: Nudeln sind fertig.");
    expect(push.icon).toMatch(/^\/icons\/lotte-192-v\d+\.png$/);
    expect(push.badge).toMatch(/^\/icons\/favicon-48-v\d+\.png$/);
  });
});

describe("Kleine Helfer", () => {
  it("Uhrzeit in Minuten und Vorschau-Text", () => {
    expect(clockMinutes("18:20")).toBe(1100);
    expect(previewLabel({ clock: "18:20", weekday: 5 })).toBe("Sa 18:20");
    expect(previewLabel({ clock: "07:00", weekday: null })).toBe("07:00");
  });
});
