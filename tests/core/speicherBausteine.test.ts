import { afterEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, fakeWindow, noBrowser } from "../helpers";
import { createLocalStore, readRaw, writeRaw } from "@/lib/core/localStore";
import { addDays, berlinTime, fromIsoDate, now, nowIso, setNowForTests, toIsoDate, todayIso } from "@/lib/core/now";
import { createEntry, updateEntry } from "@/lib/core/entries";
import { APP_VERSION, icon, iconFor, versionLabel } from "@/lib/core/app";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  noBrowser();
  setNowForTests(null);
});

describe("Lokaler Speicher", () => {
  type V = { version: 2; n: number };
  const migrate = (raw: unknown): V | null => {
    const r = raw as { version?: number; n?: number };
    if (r?.version === 2) return { version: 2, n: r.n ?? 0 };
    if (r?.version === 1) return { version: 2, n: (r.n ?? 0) * 10 };
    return null;
  };

  it("lädt, migriert einmal und schreibt den neuen Stand zurück", () => {
    const win = fakeWindow({ "wasgibts.sport": JSON.stringify({ version: 1, n: 4 }) });
    const store = createLocalStore("wasgibts.sport", migrate);
    const first = store.load();
    expect(first).toEqual({ version: 2, n: 40 });
    expect(JSON.parse(win.localStorage.getItem("wasgibts.sport")!)).toEqual({ version: 2, n: 40 });
    // gleiches Objekt, solange sich nichts ändert
    expect(store.load()).toBe(first);
  });

  it("speichern benachrichtigt, löschen auch; Abmelden beendet das", () => {
    const win = fakeWindow();
    const store = createLocalStore("wasgibts.sport", migrate);
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.save({ version: 2, n: 1 });
    expect(store.load()).toEqual({ version: 2, n: 1 });
    // Änderung aus einem anderen Tab
    win.dispatchEvent({ type: "storage", key: "wasgibts.sport" });
    win.dispatchEvent({ type: "storage", key: "wasgibts.timer" });
    expect(fn).toHaveBeenCalledTimes(2);
    store.clear();
    expect(store.load()).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);
    off();
    store.save({ version: 2, n: 2 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(win.listenerCount("storage")).toBe(0);
  });

  it("kaputte Daten oder gesperrter Speicher → null, ohne Fehler", () => {
    const win = fakeWindow({ "wasgibts.sport": "{kaputt" });
    const store = createLocalStore("wasgibts.sport", migrate);
    expect(store.load()).toBeNull();
    win.localStorage.getItem = () => {
      throw new Error("gesperrt");
    };
    expect(store.load()).toBeNull();
    expect(readRaw("wasgibts.avatargruss")).toBeNull();
  });

  it("einfache Werte lesen/schreiben, lokal und in der Sitzung; Fehler still", () => {
    const win = fakeWindow();
    writeRaw("wasgibts.avatargruss", "2026-10-22");
    writeRaw("wasgibts.zeitvorschau", "x", "session");
    expect(readRaw("wasgibts.avatargruss")).toBe("2026-10-22");
    expect(readRaw("wasgibts.zeitvorschau", "session")).toBe("x");
    expect(win.localStorage.getItem("wasgibts.zeitvorschau")).toBeNull();
    writeRaw("wasgibts.avatargruss", null);
    expect(readRaw("wasgibts.avatargruss")).toBeNull();
    noBrowser();
    expect(() => writeRaw("wasgibts.avatargruss", "x")).not.toThrow();
    expect(readRaw("wasgibts.avatargruss")).toBeNull();
  });
});

describe("Zeit", () => {
  it("rechnet Datum und Uhrzeit in Berlin", () => {
    at("2026-10-21T18:30");
    expect(todayIso()).toBe("2026-10-21");
    expect(berlinTime()).toEqual({ iso: "2026-10-21", minutes: 1110, clock: "18:30" });
    // 23:30 UTC ist in Berlin (Winterzeit) schon der nächste Tag
    expect(berlinTime(new Date("2026-12-31T23:30:00Z"))).toEqual({ iso: "2027-01-01", minutes: 30, clock: "00:30" });
    expect(nowIso()).toBe("2026-10-21T16:30:00.000Z");
  });

  it("Tage addieren über Monats- und Zeitumstellung", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(toIsoDate(fromIsoDate("2026-01-05"))).toBe("2026-01-05");
  });

  it("feste Zeit als Funktion, im Browser über __WASGIBTS_NOW__, sonst echte Uhr", () => {
    setNowForTests(() => new Date("2026-05-01T08:00:00Z"));
    expect(now().toISOString()).toBe("2026-05-01T08:00:00.000Z");
    setNowForTests(null);
    const win = fakeWindow() as unknown as { __WASGIBTS_NOW__?: string };
    win.__WASGIBTS_NOW__ = "2026-10-21T18:00:00";
    expect(toIsoDate(now())).toBe("2026-10-21");
    win.__WASGIBTS_NOW__ = "";
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
    noBrowser();
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000);
  });
});

describe("Einträge und App-Angaben", () => {
  it("neuer Eintrag: Familie, lokal, Zeitstempel; Ändern setzt nur 'geändert' neu", () => {
    at("2026-10-21T09:00");
    const e = createEntry("notiz", { title: "WLAN", text: "x" });
    expect(e).toMatchObject({ typ: "notiz", raum: "familie", besitzer: "lokal", erstellt: "2026-10-21T07:00:00.000Z" });
    expect(e.id).toBeTruthy();
    const own = createEntry("termin", {}, { raum: "arbeit", besitzer: "konto-1", id: "fest" });
    expect(own).toMatchObject({ id: "fest", raum: "arbeit", besitzer: "konto-1" });
    at("2026-10-21T10:00");
    const u = updateEntry(e, { text: "neu" });
    expect(u.data).toEqual({ title: "WLAN", text: "neu" });
    expect(u.erstellt).toBe(e.erstellt);
    expect(u.geaendert).toBe("2026-10-21T08:00:00.000Z");
  });

  it("ohne crypto.randomUUID gibt es trotzdem eindeutige Kennungen", () => {
    vi.stubGlobal("crypto", {});
    const a = createEntry("notiz", {});
    const b = createEntry("notiz", {});
    expect(a.id).not.toBe(b.id);
  });

  it("Icon-Pfade mit Version und Farbe", () => {
    expect(icon("icon-192.png")).toBe("/icons/icon-192-v4.png");
    expect(iconFor("lila", "apple-touch-icon.png")).toBe("/icons/lila/apple-touch-icon-v4.png");
    expect(iconFor("pink", "icon.svg")).toBe("/icons/orange/icon-v4.svg");
    expect(iconFor(undefined, "icon.svg")).toBe("/icons/orange/icon-v4.svg");
  });

  it("Versions-Zeile mit und ohne Bau-Datum", async () => {
    expect(versionLabel()).toBe(`Version ${APP_VERSION.replace(/\.0$/, "")}`);
    vi.stubEnv("BUILD_DATE", "2026-10-20");
    vi.resetModules();
    const app = await import("@/lib/core/app");
    expect(app.versionLabel()).toBe(`Version ${APP_VERSION.replace(/\.0$/, "")} · Stand 20.10.2026`);
  });
});

describe("Aktivität (Ohne Druck)", () => {
  const read = (win: ReturnType<typeof fakeWindow>) => JSON.parse(win.localStorage.getItem("wasgibts.aktivitaet")!);

  it("nach 3+ Tagen weg: einmal Willkommen zurück fällig", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const a = await import("@/lib/core/activity");
    a.recordOpen("2026-10-01");
    expect(read(win)).toMatchObject({ lastOpen: "2026-10-01", since: "2026-10-01", welcomeDue: null });
    a.recordOpen("2026-10-01"); // gleicher Tag: nichts
    a.recordOpen("2026-10-03");
    expect(read(win).welcomeDue).toBeNull();
    a.recordOpen("2026-10-07");
    expect(read(win)).toMatchObject({ lastOpen: "2026-10-07", since: "2026-10-01", welcomeDue: "2026-10-07" });
  });

  it("eigenes Tun und einmalige Angebote merken", async () => {
    const win = fakeWindow({ "wasgibts.aktivitaet": JSON.stringify({ version: 1, proactive: "x", asked: null }) });
    vi.resetModules();
    const a = await import("@/lib/core/activity");
    a.noteUserAction("2026-10-22");
    a.noteUserAction("2026-10-22");
    a.markAsked("pause-ende");
    expect(read(win)).toMatchObject({ lastAction: "2026-10-22", asked: { "pause-ende": true }, proactive: {} });
    await atFresh("2026-03-05T08:00");
    expect(a.todayIso()).toBe("2026-03-05");
  });

  it("fremde Version wird ignoriert", async () => {
    const win = fakeWindow({ "wasgibts.aktivitaet": JSON.stringify({ version: 2, lastOpen: "2026-01-01" }) });
    vi.resetModules();
    const a = await import("@/lib/core/activity");
    a.markAsked("x");
    expect(read(win)).toEqual({ version: 1, proactive: {}, asked: { x: true } });
    fakeWindow({ "wasgibts.aktivitaet": "7" });
    a.recordOpen("2026-10-22");
  });
});
