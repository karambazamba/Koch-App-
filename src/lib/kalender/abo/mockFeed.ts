// Testmodus (KUECHENHELFER_MOCK=1): Kalender-Links auf https://kalender.test/… (und Todoist auf https://todoist.test/…)
// liefert der Server selbst – ohne Netz. `?v=2` zeigt eine Änderung (verlegt,
// ein Termin entfällt), damit der Durchklick „Änderung kommt an“ prüfen kann.

export function mockFeed(url: URL): string | null {
  if (url.hostname === "todoist.test") return mockTodoist();
  if (url.hostname !== "kalender.test") return null;
  const changed = url.searchParams.get("v") === "2";
  const event = (uid: string, start: string, summary: string, extra: string[] = []) => ["BEGIN:VEVENT", `UID:${uid}`, `DTSTART;TZID=Europe/Berlin:${start}`, `SUMMARY:${summary}`, ...extra, "END:VEVENT"];
  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
    "X-WR-CALNAME:Fußballverein",
    ...event("abo-training", changed ? "20261022T180000" : "20261022T170000", changed ? "Training (verlegt)" : "Training", ["RRULE:FREQ=WEEKLY", "LOCATION:Sportplatz"]),
    ...(changed ? [] : event("abo-turnier", "20261024T100000", "Turnier")),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Todoist-Stil: Aufgaben als VEVENT (ganztägig bzw. mit Uhrzeit und Dauer) – https://todoist.test/… */
function mockTodoist(): string {
  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//Todoist//Todoist//EN",
    "X-WR-CALNAME:Todoist",
    ...["BEGIN:VEVENT", "UID:todo-steuer", "DTSTART;VALUE=DATE:20261023", "DTEND;VALUE=DATE:20261024", "SUMMARY:Steuer abgeben", "END:VEVENT"],
    ...["BEGIN:VEVENT", "UID:todo-anruf", "DTSTART:20261022T080000Z", "DURATION:PT30M", "SUMMARY:Oma anrufen", "END:VEVENT"],
    "END:VCALENDAR",
  ].join("\r\n");
}
