import { describe, expect, it } from "vitest";
import { durationMinutes, parseIcs } from "@/lib/kalender/import/ics";
import { describeRule, lastDate, occurrences, simpleRepeat } from "@/lib/kalender/import/rrule";
import { mergeImport, planImport, reminderFrom, summarize } from "@/lib/kalender/import/plan";
import { itemsForDay, type CalendarEntry, type TerminData } from "@/lib/kalender/model";

const TODAY = "2026-10-21";
const ics = (lines: string[]) => lines.join("\r\n");

/** Selbst gebaut im Stil eines Google-Exports (keine echten Daten) */
const GOOGLE = ics([
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "X-WR-CALNAME:Familie Müller",
  "X-WR-TIMEZONE:Europe/Berlin",
  // Wöchentliche Serie mit Ausnahme und verschobenem Einzeltermin
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Berlin:20261006T170000",
  "DTEND;TZID=Europe/Berlin:20261006T180000",
  "RRULE:FREQ=WEEKLY;BYDAY=TU",
  "EXDATE;TZID=Europe/Berlin:20261027T170000",
  "UID:schwimmen@google.com",
  "SUMMARY:Schwimmen Mathis",
  "LOCATION:Hallenbad\\, Eutin",
  "BEGIN:VALARM",
  "ACTION:DISPLAY",
  "TRIGGER:-PT30M",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Berlin:20261104T160000",
  "DTEND;TZID=Europe/Berlin:20261104T170000",
  "RECURRENCE-ID;TZID=Europe/Berlin:20261103T170000",
  "UID:schwimmen@google.com",
  "SUMMARY:Schwimmen Mathis (Mittwoch!)",
  "END:VEVENT",
  // Ganztägig und mehrtägig
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261030",
  "DTEND;VALUE=DATE:20261031",
  "UID:geburtstag@google.com",
  "SUMMARY:Omas Geburtstag 🎂",
  "BEGIN:VALARM",
  "TRIGGER:-PT6H",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261102",
  "DTEND;VALUE=DATE:20261106",
  "UID:herbstferien@google.com",
  "SUMMARY:Herbstferien",
  "END:VEVENT",
  // Andere Zeitzone (New York, Sommerzeit) und UTC im Winter
  "BEGIN:VEVENT",
  "DTSTART;TZID=America/New_York:20261023T090000",
  "DTEND;TZID=America/New_York:20261023T100000",
  "UID:call@google.com",
  "SUMMARY:Call mit Tante Ute",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261201T080000Z",
  "DURATION:PT90M",
  "UID:arzt@google.com",
  "SUMMARY:Kinderarzt",
  "DESCRIPTION:Impfpass mitnehmen\\nhttps://praxis.example/termin",
  "END:VEVENT",
  // Vergangen
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Berlin:20260901T100000",
  "UID:alt@google.com",
  "SUMMARY:Elternabend alt",
  "END:VEVENT",
  "END:VCALENDAR",
]);

/** Selbst gebaut im Stil von iCloud/Apple (gefaltete Zeilen, besondere Serien) */
const APPLE = ics([
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Apple Inc.//macOS 15.0//EN",
  "X-WR-CALNAME:Arbeit",
  "BEGIN:VEVENT",
  "UID:7A1B-elternabend",
  "DTSTART;TZID=Europe/Berlin:20261013T193000",
  "DTEND;TZID=Europe/Berlin:20261013T210000",
  "RRULE:FREQ=MONTHLY;BYDAY=2TU",
  "SUMMARY:Elternrat – Schule ",
  " am See",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:7A1B-kurs",
  "DTSTART;TZID=Europe/Berlin:20261022T090000",
  "RRULE:FREQ=WEEKLY;COUNT=5",
  "SUMMARY:Erste-Hilfe-Kurs",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:7A1B-alle2",
  "DTSTART;TZID=Europe/Berlin:20261026T080000",
  "RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T225959Z",
  "SUMMARY:Teamrunde",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:7A1B-abgesagt",
  "DTSTART;TZID=Europe/Berlin:20261028T090000",
  "STATUS:CANCELLED",
  "SUMMARY:Fällt aus",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:7A1B-sommer",
  "DTSTART;TZID=Europe/Berlin:20270328T013000",
  "SUMMARY:Vor der Zeitumstellung",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:7A1B-sommer2",
  "DTSTART;TZID=Europe/Berlin:20270329T090000",
  "SUMMARY:Nach der Zeitumstellung",
  "END:VEVENT",
  "END:VCALENDAR",
]);

const termin = (list: CalendarEntry[], title: string) => list.find((e) => e.data.title === title) as (CalendarEntry & { data: TerminData }) | undefined;

describe("Kalender-Datei lesen", () => {
  it("erkennt Quelle, Name, Zeiten in Berlin und Erinnerungen", () => {
    const cal = parseIcs(GOOGLE)!;
    expect([cal.source, cal.name]).toEqual(["google", "Familie Müller"]);
    const call = cal.events.find((e) => e.uid === "call@google.com")!;
    expect(call.start).toEqual({ date: "2026-10-23", time: "15:00" });
    const arzt = cal.events.find((e) => e.uid === "arzt@google.com")!;
    expect([arzt.start.time, arzt.end?.time]).toEqual(["09:00", "10:30"]);
    expect(cal.events.find((e) => e.uid === "herbstferien@google.com")!.end).toEqual({ date: "2026-11-05", time: null });
    expect(cal.events.find((e) => e.uid === "schwimmen@google.com" && !e.recurrenceId)!.location).toBe("Hallenbad, Eutin");
    expect(parseIcs("kein Kalender")).toBeNull();
  });

  it("Apple: gefaltete Zeilen, Umlaute, Sommerzeit-Wechsel", () => {
    const cal = parseIcs(APPLE)!;
    expect(cal.source).toBe("apple");
    expect(cal.events[0].summary).toBe("Elternrat – Schule am See");
    expect(cal.events.find((e) => e.uid === "7A1B-sommer")!.start.time).toBe("01:30");
    expect(cal.events.find((e) => e.uid === "7A1B-sommer2")!.start.time).toBe("09:00");
    expect(cal.events.find((e) => e.uid === "7A1B-alle2")!.rrule?.until).toBe("2026-12-31");
  });

  it("Dauer und Erinnerungsstufen", () => {
    expect([durationMinutes("-PT15M"), durationMinutes("P1D"), durationMinutes("-PT1H30M"), durationMinutes("P1W"), durationMinutes("x")]).toEqual([-15, 1440, -90, 10080, null]);
    expect([reminderFrom([10], { time: "17:00" }), reminderFrom([30], { time: "17:00" }), reminderFrom([45], { time: "17:00" }), reminderFrom([1440 - 19 * 60 + 17 * 60], { time: "17:00" }), reminderFrom([600], { time: "17:00" })]).toEqual(["15", "30", "60", "vorabend", "aus"]);
    expect([reminderFrom([360], { time: null }), reminderFrom([900], { time: null }), reminderFrom([], { time: "08:00" })]).toEqual(["vorabend", "aus", "aus"]);
  });
});

describe("Wiederholungen", () => {
  const rule = (r: string) => parseIcs(ics(["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART:20261006T100000", `RRULE:${r}`, "END:VEVENT", "END:VCALENDAR"]))!.events[0].rrule!;
  it("einfach → unsere Serie", () => {
    expect(simpleRepeat(rule("FREQ=WEEKLY;BYDAY=TU"), "2026-10-06")).toEqual({ kind: "woechentlich" });
    expect(simpleRepeat(rule("FREQ=WEEKLY;INTERVAL=2"), "2026-10-06")).toEqual({ kind: "woechentlich", every: 2 });
    expect(simpleRepeat(rule("FREQ=WEEKLY;BYDAY=MO,WE,FR"), "2026-10-06")).toEqual({ kind: "wochentage", days: [0, 2, 4] });
    expect(simpleRepeat(rule("FREQ=DAILY"), "2026-10-06")).toEqual({ kind: "taeglich" });
    expect(simpleRepeat(rule("FREQ=MONTHLY"), "2026-10-06")).toEqual({ kind: "monatlich" });
    expect(simpleRepeat(rule("FREQ=MONTHLY;BYDAY=2TU"), "2026-10-06")).toBeNull();
    expect(simpleRepeat(rule("FREQ=YEARLY"), "2026-10-06")).toBeNull();
  });

  it("besondere Serien rechnen", () => {
    expect(occurrences(rule("FREQ=MONTHLY;BYDAY=2TU"), "2026-10-13", "2027-01-31")).toEqual(["2026-10-13", "2026-11-10", "2026-12-08", "2027-01-12"]);
    expect(occurrences(rule("FREQ=MONTHLY;BYDAY=-1FR"), "2026-10-30", "2026-12-31")).toEqual(["2026-10-30", "2026-11-27", "2026-12-25"]);
    expect(occurrences(rule("FREQ=YEARLY"), "2026-10-06", "2028-12-31")).toEqual(["2026-10-06", "2027-10-06", "2028-10-06"]);
    expect(occurrences(rule("FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1"), "2026-10-30", "2026-11-30")).toEqual(["2026-10-30", "2026-11-30"]);
    expect(lastDate(rule("FREQ=WEEKLY;COUNT=5"), "2026-10-22")).toBe("2026-11-19");
    expect([describeRule(rule("FREQ=MONTHLY;BYDAY=2TU")), describeRule(rule("FREQ=YEARLY")), describeRule(rule("FREQ=DAILY;INTERVAL=3"))]).toEqual(["jeden 2. Dienstag im Monat", "jährlich", "alle 3 Tage"]);
  });
});

describe("Übernehmen", () => {
  const cals = [parseIcs(GOOGLE)!, parseIcs(APPLE)!];

  it("Vorschau-Zahlen je Kalender", () => {
    expect(summarize(cals, TODAY)).toEqual([
      { name: "Familie Müller", source: "google", found: 6, series: 1, fromToday: 5 },
      { name: "Arbeit", source: "apple", found: 5, series: 3, fromToday: 5 },
    ]);
  });

  it("ab heute: Serie mit Ausnahmen, verschobener Einzeltermin, ganztägig, mehrtägig, Raum je Kalender", () => {
    const { entries, expanded } = planImport(cals, { range: "ab-heute", today: TODAY, rooms: ["familie", "arbeit"] });
    const swim = termin(entries, "Schwimmen Mathis")!;
    expect(swim.data).toMatchObject({ date: "2026-10-06", start: "17:00", end: "18:00", repeat: { kind: "woechentlich" }, reminder: "30", place: "Hallenbad, Eutin", skipDates: ["2026-10-27", "2026-11-03"], source: { kind: "google", uid: "schwimmen@google.com" } });
    expect(termin(entries, "Schwimmen Mathis (Mittwoch!)")!.data).toMatchObject({ date: "2026-11-04", start: "16:00" });
    expect(termin(entries, "Omas Geburtstag 🎂")!.data).toMatchObject({ date: "2026-10-30", start: "", reminder: "vorabend" });
    expect(termin(entries, "Herbstferien")!.data).toMatchObject({ date: "2026-11-02", endDate: "2026-11-05", start: "" });
    expect(termin(entries, "Kinderarzt")!.data).toMatchObject({ link: "https://praxis.example/termin", note: "Impfpass mitnehmen https://praxis.example/termin" });
    expect(termin(entries, "Elternabend alt")).toBeUndefined();
    expect(termin(entries, "Fällt aus")).toBeUndefined();
    expect(termin(entries, "Erste-Hilfe-Kurs")!.data).toMatchObject({ repeat: { kind: "woechentlich" }, until: "2026-11-19" });
    expect(termin(entries, "Teamrunde")!.data).toMatchObject({ repeat: { kind: "woechentlich", every: 2 }, until: "2026-12-31" });
    expect(termin(entries, "Teamrunde")!.raum).toBe("arbeit");
    // „jeden 2. Dienstag im Monat“ → einzeln, 12 Monate ab heute
    const elternrat = entries.filter((e) => e.data.title === "Elternrat – Schule am See");
    expect(elternrat).toHaveLength(12);
    expect(elternrat[0].data.date).toBe("2026-11-10");
    expect(expanded).toEqual([{ title: "Elternrat – Schule am See", rule: "jeden 2. Dienstag im Monat", count: 12 }]);
  });

  it("so erscheinen sie im Kalender", () => {
    const { entries } = planImport(cals, { range: "ab-heute", today: TODAY });
    const swimDays = ["2026-10-27", "2026-11-03", "2026-11-10"].map((d) => itemsForDay(entries, d, TODAY).filter((i) => i.title.startsWith("Schwimmen")).length);
    expect(swimDays).toEqual([0, 0, 1]);
    expect(itemsForDay(entries, "2026-11-04", TODAY).map((i) => i.title)).toContain("Schwimmen Mathis (Mittwoch!)");
    expect(itemsForDay(entries, "2026-11-04", TODAY).find((i) => i.title === "Herbstferien")?.time).toBeNull();
    expect(itemsForDay(entries, "2026-11-06", TODAY).find((i) => i.title === "Herbstferien")).toBeUndefined();
    expect(itemsForDay(entries, "2026-11-26", TODAY).find((i) => i.title === "Erste-Hilfe-Kurs")).toBeUndefined();
    expect(itemsForDay(entries, "2026-11-09", TODAY).find((i) => i.title === "Teamrunde")).toBeDefined();
    expect(itemsForDay(entries, "2026-11-02", TODAY).find((i) => i.title === "Teamrunde")).toBeUndefined();
  });

  it("alles: auch Vergangenes", () => {
    expect(termin(planImport(cals, { range: "alles", today: TODAY }).entries, "Elternabend alt")).toBeDefined();
  });

  it("doppelt einlesen aktualisiert statt doppelt (Abgehaktes bleibt)", () => {
    const first = planImport(cals, { range: "ab-heute", today: TODAY });
    const once = mergeImport([], first.entries, "2026-10-21T10:00:00Z");
    expect(once.added).toBe(first.entries.length);
    const ticked = once.entries.map((e) => (e.data.title === "Kinderarzt" ? { ...e, data: { ...e.data, doneDates: ["2026-12-01"] } } : e)) as CalendarEntry[];
    const again = mergeImport(ticked, planImport(cals, { range: "ab-heute", today: TODAY }).entries, "2026-10-22T10:00:00Z");
    expect([again.added, again.updated, again.entries.length]).toEqual([0, first.entries.length, first.entries.length]);
    expect(termin(again.entries, "Kinderarzt")!.data.doneDates).toEqual(["2026-12-01"]);
    expect(termin(again.entries, "Kinderarzt")!.id).toBe(termin(once.entries, "Kinderarzt")!.id);
  });
});

describe("Begleitung: Kalender übernehmen", () => {
  it.each(["Übernimm meinen Google-Kalender", "Wie bekomme ich meine Apple-Termine rein?", "Kannst du meine Termine aus Google holen?", "Kalender importieren", "Hol meinen iCloud Kalender rüber"])("erkennt: %s", async (t) => {
    const { isCalendarImportRequest } = await import("@/lib/kalender/import/chat");
    expect(isCalendarImportRequest(t)).toBe(true);
  });
  it.each(["Was steht im Kalender?", "Morgen 16 Uhr Zahnarzt", "Zeig mir den Kalender"])("nicht: %s", async (t) => {
    const { isCalendarImportRequest } = await import("@/lib/kalender/import/chat");
    expect(isCalendarImportRequest(t)).toBe(false);
  });
});
