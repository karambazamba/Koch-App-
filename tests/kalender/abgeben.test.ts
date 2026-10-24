// Aufgaben sind persönlich – abgeben geht (Tafel 52 B): Rollen, „von Felix“,
// An … geben, Passt gerade nicht, Zurückholen, Erledigt-Meldung, Mia.
import { describe, expect, it } from "vitest";
import { changeTask, doneNotes, fromLabel, giveBack, giveTargets, giveTo, isMyTask, memberByName, resolveGiving, takeBack, taskRole } from "@/lib/kalender/abgeben/model";
import { parseGiveTask } from "@/lib/begleitung/mockAlltag";
import type { Member } from "@/lib/konten/model";
import { sanitizeEntry } from "@/lib/kalender/model";

const FELIX = "u-felix";
const LISA = "u-lisa";
const members: Member[] = [
  { userId: FELIX, displayName: "Felix", role: "erwachsener", personId: null },
  { userId: LISA, displayName: "Lisa", role: "erwachsener", personId: null },
];
const task = (besitzer: string, data: Record<string, unknown> = {}) => ({ id: "a1", typ: "aufgabe", besitzer, geaendert: "2026-10-24T08:00:00Z", data: { title: "Turnbeutel waschen", ...data } });

describe("Rollen", () => {
  it("ohne Konto ist jede Aufgabe meine (auch fremde Besitzer)", () => {
    expect(taskRole(task("lokal"), null)).toBe("meine");
    expect(taskRole(task(LISA), null)).toBe("meine");
  });
  it("mit Konto: meine, bekommen, abgegeben, fremd", () => {
    expect(taskRole(task("lokal"), FELIX)).toBe("meine");
    expect(taskRole(task(FELIX), FELIX)).toBe("meine");
    expect(taskRole(task(FELIX, { fuer: LISA }), FELIX)).toBe("abgegeben");
    expect(taskRole(task(LISA, { fuer: FELIX }), FELIX)).toBe("bekommen");
    expect(taskRole(task(LISA), FELIX)).toBe("fremd");
    expect(taskRole(task(LISA, { zurueck: FELIX }), FELIX)).toBe("fremd");
  });
  it("Termine sind nie persönlich", () => {
    expect(taskRole({ ...task(LISA), typ: "termin" }, FELIX)).toBe("meine");
  });
  it("sichtbar sind meine und bekommene", () => {
    expect(isMyTask(task(LISA, { fuer: FELIX }), FELIX)).toBe(true);
    expect(isMyTask(task(FELIX, { fuer: LISA }), FELIX)).toBe(false);
    expect(isMyTask(task(LISA), FELIX)).toBe(false);
  });
  it("„von Felix“ nur bei bekommenen", () => {
    expect(fromLabel(task(FELIX, { fuer: LISA }), LISA, members)).toBe("von Felix");
    expect(fromLabel(task(FELIX), FELIX, members)).toBeNull();
    expect(giveTargets(members, FELIX).map((m) => m.displayName)).toEqual(["Lisa"]);
  });
});

describe("Abgeben und zurück", () => {
  it("An Lisa geben, Passt gerade nicht, Zurückholen", () => {
    const given = giveTo({ title: "x", zurueck: LISA }, LISA);
    expect(given).toEqual({ title: "x", fuer: LISA });
    expect(giveBack(given, LISA)).toEqual({ title: "x", zurueck: LISA });
    expect(takeBack({ title: "x", fuer: LISA, zurueck: LISA })).toEqual({ title: "x" });
  });
  it("changeTask ändert nur die eine Aufgabe und setzt den Zeitstempel", () => {
    const list = [task(FELIX), { ...task(FELIX), id: "a2" }];
    const next = changeTask(list, "a1", (d) => giveTo(d, LISA), "2026-10-24T09:00:00Z");
    expect(next[0]).toMatchObject({ geaendert: "2026-10-24T09:00:00Z", data: { fuer: LISA } });
    expect(next[1]).toBe(list[1]);
  });
  it("Erledigt-Meldung für den Absender, nur beim Wechsel auf erledigt", () => {
    const before = [task(FELIX, { fuer: LISA })];
    const after = [task(FELIX, { fuer: LISA, doneOn: "2026-10-24" })];
    expect(doneNotes(before, after, FELIX, members)).toEqual(["Lisa hat „Turnbeutel waschen“ erledigt ✓"]);
    expect(doneNotes(after, after, FELIX, members)).toEqual([]);
    expect(doneNotes(before, after, LISA, members)).toEqual([]);
  });
});

describe("Mia: „Sag Lisa, sie soll …“", () => {
  it("erkennt Name und Aufgabe (ohne KI)", () => {
    expect(parseGiveTask("Sag Lisa, sie soll den Turnbeutel waschen")).toEqual({ name: "Lisa", title: "Turnbeutel waschen" });
    expect(parseGiveTask("Ben soll Brot kaufen.")).toEqual({ name: "Ben", title: "Brot kaufen" });
    expect(parseGiveTask("Ich soll mehr trinken")).toBeNull();
    expect(parseGiveTask("Morgen um 9 Steuerberater")).toBeNull();
  });
  it("beim Übernehmen wird aus dem Namen das Konto – unbekannt bleibt bei mir", () => {
    const entries = [{ typ: "aufgabe", data: { title: "Turnbeutel waschen", an: "lisa" } }];
    const r = resolveGiving(entries, members, FELIX);
    expect(r.entries[0].data).toEqual({ title: "Turnbeutel waschen", fuer: LISA });
    expect(r.notes[0]).toContain("bei Lisa");
    const unknown = resolveGiving([{ typ: "aufgabe", data: { title: "x", an: "Oma" } }], members, FELIX);
    expect(unknown.entries[0].data).toEqual({ title: "x" });
    expect(unknown.notes[0]).toBe("Oma ist noch nicht im Haushalt – ich hab’s erstmal bei dir notiert.");
    expect(memberByName(members, "felix")?.userId).toBe(FELIX);
  });
});

describe("Beim Laden bleibt die Abgabe erhalten (Fehler: fuer/an fielen weg)", () => {
  it("fuer, zurueck und an überleben die Prüfung", () => {
    const e = sanitizeEntry({ ...task(FELIX, { reminder: "aus", fuer: LISA, zurueck: FELIX }), raum: "familie" });
    expect(e?.data).toMatchObject({ fuer: LISA, zurueck: FELIX });
    const vonMia = sanitizeEntry({ ...task(FELIX, { reminder: "aus", an: "Lisa" }), raum: "familie" });
    expect(resolveGiving([vonMia!], members, FELIX).entries[0].data).toMatchObject({ fuer: LISA });
  });
});

describe("Formular behält, was es nicht zeigt (Fehler: Ändern löschte „abgegeben“ und „dringend“)", () => {
  it("aufgabeExtras", async () => {
    const { aufgabeExtras } = await import("@/lib/kalender/model");
    expect(aufgabeExtras({ dringend: true, seit: "s", fuer: LISA, zurueck: FELIX, liste: "Haus" })).toEqual({ dringend: true, seit: "s", fuer: LISA, zurueck: FELIX, liste: "Haus" });
    expect(aufgabeExtras(undefined)).toEqual({});
  });
});
