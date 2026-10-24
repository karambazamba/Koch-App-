// „Kalender mitbringen“: Angebot einmal / nach 14 Tagen nochmal / nie wieder,
// Link aus der Zwischenablage (webcal/https), Anbieter aus dem Satz,
// Erfolgs-Satz, „zuletzt aktualisiert“, freundliche Fehler.
import { geraetVon, linkFehler, mailAnMich, schritte } from "@/lib/kalender/mitbringen/anleitung";
import { describe, expect, it } from "vitest";
import {
  angebotFuer,
  anbieterIn,
  erfolgsSatz,
  kalenderLink,
  laterAngebot,
  migrateAngebot,
  refreshedLabel,
  termineIn4Wochen,
  type AngebotState,
} from "@/lib/kalender/mitbringen/angebot";
import { termin } from "../helpers";
import type { CalendarEntry } from "@/lib/kalender/model";

const T = "2026-10-21";
const leer: AngebotState = { version: 1, later: [], done: false };

describe("Angebot", () => {
  it("leer = groß, mit eigenen Terminen klein, mit Kalender-Link nie", () => {
    expect(angebotFuer(leer, { today: T, ownTermine: 0, abos: 0 })).toBe("gross");
    expect(angebotFuer(leer, { today: T, ownTermine: 3, abos: 0 })).toBe("klein");
    expect(angebotFuer(leer, { today: T, ownTermine: 0, abos: 1 })).toBeNull();
    expect(angebotFuer({ ...leer, done: true }, { today: T, ownTermine: 0, abos: 0 })).toBeNull();
  });

  it("„Später“: nach 14 Tagen noch EINMAL, danach nie wieder", () => {
    const once = laterAngebot(leer, T);
    expect(angebotFuer(once, { today: "2026-11-03", ownTermine: 0, abos: 0 })).toBeNull();
    expect(angebotFuer(once, { today: "2026-11-04", ownTermine: 0, abos: 0 })).toBe("gross");
    const twice = laterAngebot(once, "2026-11-04");
    expect(angebotFuer(twice, { today: "2027-06-01", ownTermine: 0, abos: 0 })).toBeNull();
  });

  it("Speicher: Kaputtes wird verworfen", () => {
    expect(migrateAngebot({ version: 1, later: ["2026-10-21", "quatsch", 3], done: "ja" })).toEqual({ version: 1, later: ["2026-10-21"], done: false });
    expect(migrateAngebot({ version: 2 })).toBeNull();
  });
});

describe("Link und Anbieter erkennen", () => {
  it("webcal, Google-iCal, Outlook-ICS, iCloud – im Text, ohne Satzzeichen am Ende", () => {
    expect(kalenderLink("webcal://p52-caldav.icloud.com/published/2/abc")).toBe("webcal://p52-caldav.icloud.com/published/2/abc");
    expect(kalenderLink("Hier: https://calendar.google.com/calendar/ical/x%40gmail.com/private-123/basic.ics.")).toBe("https://calendar.google.com/calendar/ical/x%40gmail.com/private-123/basic.ics");
    expect(kalenderLink("https://outlook.office365.com/owa/calendar/abc/reachcalendar.ics")).toBe("https://outlook.office365.com/owa/calendar/abc/reachcalendar.ics");
    expect(kalenderLink("https://example.com/feed.ics?x=1")).toBe("https://example.com/feed.ics?x=1");
    expect(kalenderLink("https://example.com/seite")).toBeNull();
    expect(kalenderLink("kein Link")).toBeNull();
  });

  it("Anbieter aus dem Satz", () => {
    expect(anbieterIn("Hol meinen Google-Kalender rein")).toBe("google");
    expect(anbieterIn("Meine iPhone-Termine bitte")).toBe("apple");
    expect(anbieterIn("Outlook-Kalender übernehmen")).toBe("outlook");
    expect(anbieterIn("Kalender importieren")).toBeNull();
  });
});

describe("Danach", () => {
  it("Erfolgs-Satz zählt die nächsten 4 Wochen", () => {
    const entries = [termin({ title: "A", date: T, start: "09:00" }), termin({ title: "B", date: "2026-11-17", start: "09:00" }), termin({ title: "C", date: "2026-11-18", start: "09:00" }), termin({ title: "D", date: "2026-10-20", start: "09:00" })] as CalendarEntry[];
    expect(termineIn4Wochen(entries, T)).toBe(2);
    expect(erfolgsSatz(23)).toBe("Steht drin. 23 Termine in den nächsten 4 Wochen.");
    expect(erfolgsSatz(1)).toBe("Steht drin. 1 Termin in den nächsten 4 Wochen.");
    expect(erfolgsSatz(0)).toMatch(/^Steht drin\./);
  });

  it("„zuletzt aktualisiert“ heute mit Uhrzeit, sonst mit Datum", () => {
    expect(refreshedLabel("2026-10-21T08:12:00.000Z", T)).toBe("zuletzt aktualisiert 10:12");
    expect(refreshedLabel("2026-10-20T08:12:00.000Z", T)).toBe("zuletzt aktualisiert am 20.10.");
  });

  it("Anleitung per Mail an mich (Google am Computer)", () => {
    const link = mailAnMich("google", "Mia");
    expect(link.startsWith("mailto:?subject=")).toBe(true);
    expect(decodeURIComponent(link)).toContain("calendar.google.com");
  });

  it("Anleitung je Dienst und Gerät, Gerät aus dem Browser", () => {
    expect(geraetVon("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("iphone");
    expect(geraetVon("Mozilla/5.0 (Linux; Android 14; Pixel 7)")).toBe("android");
    expect(geraetVon("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("computer");
    expect(schritte("apple", "iphone")[2].text).toContain("Öffentlicher Kalender");
    expect(schritte("apple", "android")[0].text).toContain("icloud.com/calendar");
    expect(schritte("google", "iphone")[0].text).toContain("Desktop-Website anfordern");
    expect(schritte("google", "computer")[0].text).not.toContain("Desktop");
    expect(schritte("todoist", "computer")[2].text).toContain("Kalender-Abonnement-URL");
  });

  it("falsch eingefügte Links freundlich erklären", () => {
    expect(linkFehler("https://calendar.google.com/calendar/u/0/r")?.text).toContain("Geheime Adresse");
    expect(linkFehler("https://calendar.google.com/calendar/ical/x%40gmail.com/public/basic.ics")?.text).toContain("öffentliche Adresse");
    expect(linkFehler("https://calendar.google.com/calendar/ical/x%40gmail.com/private-1/basic.ics")).toBeNull();
    expect(linkFehler("https://www.icloud.com/calendar/")?.anbieter).toBe("apple");
    expect(linkFehler("webcal://p52-caldav.icloud.com/published/2/abc")).toBeNull();
    expect(linkFehler("https://outlook.live.com/calendar/0/view/month")?.anbieter).toBe("outlook");
    expect(linkFehler("https://outlook.office365.com/owa/calendar/abc/reachcalendar.ics")).toBeNull();
    expect(linkFehler("https://app.todoist.com/app/today")?.anbieter).toBe("todoist");
    expect(anbieterIn("Hol meine Todoist-Aufgaben")).toBe("todoist");
  });
});
