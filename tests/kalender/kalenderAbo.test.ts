import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedError, fetchFeed, isPrivateAddress, normalizeFeedUrl, type FeedDeps } from "@/lib/kalender/abo/fetchFeed";
import { mockFeed } from "@/lib/kalender/abo/mockFeed";
import { feedEntries } from "@/lib/kalender/abo/feed";
import { aboIdOf, copyToOwn, isAboEntry, isDue, nextColor, type Abo } from "@/lib/kalender/abo/model";
import { itemsForDay } from "@/lib/kalender/model";
import { at, fakeWindow, noBrowser } from "../helpers";

const ICS = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART:20261101T100000Z\r\nSUMMARY:Test\r\nEND:VEVENT\r\nEND:VCALENDAR";

/** Antwort mit Text (optional in Stücken) */
const response = (body: string | Uint8Array[], init: ResponseInit = {}) =>
  new Response(
    typeof body === "string"
      ? body
      : new ReadableStream({
          start(c) {
            body.forEach((b) => c.enqueue(b));
            c.close();
          },
        }),
    init,
  );

const deps = (over: Partial<FeedDeps> = {}): FeedDeps => ({ lookup: async () => ["142.250.185.78"], fetch: async () => response(ICS), ...over });

describe("Kalender-Link prüfen (Server)", () => {
  it("nur https/webcal, Standard-Port, ohne Zugangsdaten", () => {
    expect(normalizeFeedUrl("webcal://p01-calendars.icloud.com/published/2/abc")?.toString()).toBe("https://p01-calendars.icloud.com/published/2/abc");
    expect(normalizeFeedUrl("https://calendar.google.com/calendar/ical/x/private-y/basic.ics")?.hostname).toBe("calendar.google.com");
    for (const bad of ["http://example.com/a.ics", "ftp://x/y", "file:///etc/passwd", "https://user:pw@example.com/a", "https://example.com:8443/a", "kein link"]) expect(normalizeFeedUrl(bad)).toBeNull();
  });

  it("erkennt private und lokale Adressen", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["142.250.185.78", "17.253.144.10", "2a00:1450:4001:82a::200e", "172.32.0.1"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("blockiert localhost, private IPs (direkt, per DNS und per Weiterleitung)", async () => {
    await expect(fetchFeed("https://localhost/a.ics", deps())).rejects.toThrow(FeedError);
    await expect(fetchFeed("https://127.0.0.1/a.ics", deps())).rejects.toThrow("kann ich nicht abrufen");
    await expect(fetchFeed("https://[::1]/a.ics", deps())).rejects.toThrow("kann ich nicht abrufen");
    await expect(fetchFeed("https://intern.example/a.ics", deps({ lookup: async () => ["10.0.0.5"] }))).rejects.toThrow("kann ich nicht abrufen");
    await expect(fetchFeed("https://mixed.example/a.ics", deps({ lookup: async () => ["142.250.185.78", "192.168.1.1"] }))).rejects.toThrow("kann ich nicht abrufen");
    const toPrivate = deps({ fetch: async () => response("", { status: 302, headers: { location: "https://169.254.169.254/latest/meta-data" } }) });
    await expect(fetchFeed("https://calendar.example/a.ics", toPrivate)).rejects.toThrow("kann ich nicht abrufen");
    const toHttp = deps({ fetch: async () => response("", { status: 301, headers: { location: "http://calendar.example/a.ics" } }) });
    await expect(fetchFeed("https://calendar.example/a.ics", toHttp)).rejects.toThrow("kann ich nicht abrufen");
  });

  it("folgt erlaubten Weiterleitungen (höchstens 3)", async () => {
    let n = 0;
    const hop = deps({ fetch: async () => (n++ < 1 ? response("", { status: 302, headers: { location: "/neu.ics" } }) : response(ICS)) });
    await expect(fetchFeed("https://calendar.example/a.ics", hop)).resolves.toContain("BEGIN:VCALENDAR");
    const loop = deps({ fetch: async () => response("", { status: 302, headers: { location: "/wieder.ics" } }) });
    await expect(fetchFeed("https://calendar.example/a.ics", loop)).rejects.toThrow(FeedError);
  });

  it("zu große Dateien, Zeitüberschreitung, kein Kalender, nicht gefunden", async () => {
    await expect(fetchFeed("https://c.example/a.ics", deps({ fetch: async () => response(ICS, { headers: { "content-length": String(6 * 1024 * 1024) } }) }))).rejects.toThrow("zu groß");
    const chunks = Array.from({ length: 3 }, () => new Uint8Array(600));
    await expect(fetchFeed("https://c.example/a.ics", { ...deps({ fetch: async () => response(chunks) }), maxBytes: 1000 })).rejects.toThrow("zu groß");
    const slow = deps({
      fetch: (_url, init) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("abort")));
        }),
      timeoutMs: 20,
    });
    await expect(fetchFeed("https://c.example/a.ics", slow)).rejects.toThrow("zu lange");
    await expect(fetchFeed("https://c.example/a.ics", deps({ fetch: async () => response("<html>Login</html>") }))).rejects.toThrow("kein Kalender");
    await expect(fetchFeed("https://c.example/a.ics", deps({ fetch: async () => response("", { status: 404 }) }))).rejects.toThrow("gibt es unter diesem Link nicht");
    await expect(fetchFeed("https://c.example/a.ics", deps({ lookup: async () => Promise.reject(new Error("ENOTFOUND")) }))).rejects.toThrow("kenne ich nicht");
  });

  it("Testmodus: kalender.test liefert selbst (mit Änderung bei v=2)", () => {
    expect(mockFeed(new URL("https://example.com/a.ics"))).toBeNull();
    expect(mockFeed(new URL("https://kalender.test/verein.ics"))).toContain("SUMMARY:Turnier");
    expect(mockFeed(new URL("https://kalender.test/verein.ics?v=2"))).toContain("Training (verlegt)");
  });
});

describe("Abo-Termine (nur lesen)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    noBrowser();
  });

  const abo: Abo = { id: "a1", name: "Verein", url: "https://kalender.test/verein.ics", color: "himmelblau", raum: "familie", on: true, fetchedAt: null, error: null };

  it("Termine mit festen ids, Besitzer abo:…, Raum des Abos", () => {
    at("2026-10-21T10:00");
    const feed = feedEntries({ ...abo, raum: "arbeit" }, mockFeed(new URL(abo.url))!, "2026-10-21")!;
    expect(feed.name).toBe("Fußballverein");
    expect(feed.entries.map((e) => [e.id, e.besitzer, e.raum])).toEqual([
      ["abo:a1:abo-training", "abo:a1", "arbeit"],
      ["abo:a1:abo-turnier", "abo:a1", "arbeit"],
    ]);
    expect(isAboEntry(feed.entries[0])).toBe(true);
    expect(aboIdOf(feed.entries[0])).toBe("a1");
    expect(itemsForDay(feed.entries, "2026-10-29", "2026-10-21").map((i) => `${i.time} ${i.title}`)).toEqual(["17:00 Training"]);
    expect(feedEntries(abo, "kein Kalender", "2026-10-21")).toBeNull();
  });

  it("Kopie wird ein eigener Termin ohne Herkunft", () => {
    at("2026-10-21T10:00");
    const [training] = feedEntries(abo, mockFeed(new URL(abo.url))!, "2026-10-21")!.entries;
    const own = copyToOwn(training);
    expect(own.besitzer).toBe("lokal");
    expect(own.id).not.toBe(training.id);
    expect(own.typ === "termin" && own.data.source).toBeUndefined();
    expect(own.data.title).toBe("Training");
  });

  it("Abruf fällig nach 30 Minuten, Farben der Reihe nach", () => {
    const t = Date.parse("2026-10-21T10:00:00Z");
    expect(isDue({ ...abo, fetchedAt: null }, t)).toBe(true);
    expect(isDue({ ...abo, fetchedAt: "2026-10-21T09:45:00Z" }, t)).toBe(false);
    expect(isDue({ ...abo, fetchedAt: "2026-10-21T09:29:00Z" }, t)).toBe(true);
    expect(isDue({ ...abo, on: false }, t)).toBe(false);
    expect(nextColor([])).toBe("himmelblau");
    expect(nextColor([abo])).toBe("waldgruen");
  });

  it("eigener Speicher nimmt nie Abo-Termine auf; ohne Baustein sind sie versteckt", async () => {
    at("2026-10-21T10:00");
    const win = fakeWindow();
    vi.resetModules();
    const { replaceEntries, loadEntries } = await import("@/lib/kalender/store");
    const { saveAbos, saveFeed, loadAboEntries } = await import("@/lib/kalender/abo/store");
    const { setFeature } = await import("@/lib/core/features");
    const { loadCalendarEntries } = await import("@/lib/kalender/useCalendarEntries");
    const feed = feedEntries(abo, mockFeed(new URL(abo.url))!, "2026-10-21")!.entries;
    replaceEntries(feed);
    expect(loadEntries()).toEqual([]);
    saveAbos([abo]);
    saveFeed(abo.id, feed);
    expect(loadAboEntries()).toEqual([]);
    setFeature("kalender", true);
    expect(loadAboEntries()).toHaveLength(2);
    expect(loadCalendarEntries()).toHaveLength(2);
    saveAbos([{ ...abo, on: false }]);
    expect(loadAboEntries()).toEqual([]);
    expect(win.localStorage.getItem("wasgibts.kalenderabos")).toContain("kalender.test");
  });
});

describe("Sicherung", () => {
  it("Kalender-Links nur auf ausdrücklichen Wunsch", async () => {
    at("2026-10-21T10:00");
    const { createBackup } = await import("@/lib/core/backup");
    const { memoryStorage } = await import("../helpers");
    const storage = memoryStorage({ "wasgibts.kalenderabos": '{"version":1,"abos":[]}', "wasgibts.kalenderabo-termine": '{"version":1,"feeds":{}}', "wasgibts.eintraege": '{"version":2,"entries":[]}' });
    expect(Object.keys(createBackup(storage).data)).toEqual(["wasgibts.eintraege"]);
    expect(Object.keys(createBackup(storage, ["wasgibts.kalenderabos"]).data).sort()).toEqual(["wasgibts.eintraege", "wasgibts.kalenderabos"]);
  });
});

describe("Aufgaben aus Kalender-Links (Todoist, VTODO) und RDATE", () => {
  const base: Abo = { id: "t1", name: "Todoist", url: "https://todoist.test/ical", color: "lila", raum: "familie", on: true, fetchedAt: null, error: null };
  it("Todoist-Link: Einträge werden schreibgeschützte Aufgaben (Tag, ggf. Uhrzeit, Etikett Todoist)", () => {
    at("2026-10-21T10:00");
    const feed = feedEntries(base, mockFeed(new URL(base.url))!, "2026-10-21")!;
    expect(feed.entries.map((e) => [e.typ, e.data.title, e.data.date, (e.data as { time?: string }).time ?? null, e.data.label])).toEqual([
      ["aufgabe", "Steuer abgeben", "2026-10-23", null, "Todoist"],
      ["aufgabe", "Oma anrufen", "2026-10-22", "10:00", "Todoist"],
    ]);
    expect(feed.entries.every(isAboEntry)).toBe(true);
  });
  it("VTODO mit DUE wird Aufgabe, erledigte bleiben draußen; RDATE gibt zusätzliche Tage", () => {
    at("2026-10-21T10:00");
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VTODO", "UID:t-a", "DUE;VALUE=DATE:20261025", "SUMMARY:Reifen wechseln", "END:VTODO",
      "BEGIN:VTODO", "UID:t-b", "DUE;VALUE=DATE:20261025", "STATUS:COMPLETED", "SUMMARY:Schon erledigt", "END:VTODO",
      "BEGIN:VEVENT", "UID:e-r", "DTSTART;TZID=Europe/Berlin:20261022T090000", "RDATE;TZID=Europe/Berlin:20261029T090000", "SUMMARY:Sprechstunde", "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const feed = feedEntries({ ...base, url: "https://kalender.test/x.ics" }, ics, "2026-10-21")!;
    expect(feed.entries.map((e) => `${e.typ} ${e.data.title} ${e.data.date}`).sort()).toEqual(["aufgabe Reifen wechseln 2026-10-25", "termin Sprechstunde 2026-10-22", "termin Sprechstunde 2026-10-29"]);
  });
  it("dieselbe UID aus zwei Kalendern nur einmal", async () => {
    at("2026-10-21T10:00");
    const { withoutDoubles } = await import("@/lib/kalender/abo/model");
    const a = feedEntries({ ...base, id: "x", url: "https://kalender.test/a.ics" }, mockFeed(new URL("https://kalender.test/a.ics"))!, "2026-10-21")!.entries;
    const b = feedEntries({ ...base, id: "y", url: "https://kalender.test/b.ics" }, mockFeed(new URL("https://kalender.test/b.ics"))!, "2026-10-21")!.entries;
    expect(withoutDoubles([...a, ...b]).map((e) => e.id)).toEqual(a.map((e) => e.id));
  });
});

