// Härtetest „Familie teilen“ (Clip „Mia“): zwei Handys, zwei Konten, ein
// Haushalt – der echte Abgleich (engine.ts + Übersetzer) gegen das
// Test-Backend mit den Regeln der Datenbank (testServer.ts). Einkauf, Termine,
// Pinnwand und „Steh grad davor“ kommen beim anderen an; „Arbeit“ bleibt beim
// Besitzer – auch wenn der andere es überschreiben oder löschen will.
import { beforeEach, describe, expect, it } from "vitest";
import { applyRemote, detectChanges, emptyState, markSent, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import type { CloudDoc } from "@/lib/konten/sync/docs";
import { answersForMe, answerTrip, newDuringTrip, type ActiveTrip, type Trip } from "@/lib/einkauf/unterwegs/unterwegs";

const T0 = "2026-10-21T15:00:00.000Z";

/** Speicher eines Handys im Arbeitsspeicher, mit eigener Uhr */
function handy(values: Record<string, Record<string, unknown>> = {}) {
  const data = new Map(Object.entries(structuredClone(values)));
  let clock = Date.parse(T0);
  const io: Io & { tick(min?: number): void; get(key: string): Record<string, unknown> | undefined; set(key: string, v: Record<string, unknown>): void } = {
    read: (key) => (data.has(key) ? structuredClone(data.get(key)!) : null),
    write: (key, value) => void data.set(key, structuredClone(value)),
    now: () => new Date(clock).toISOString(),
    tick: (min = 1) => void (clock += min * 60_000),
    get: (key) => data.get(key),
    set: (key, v) => void data.set(key, structuredClone(v)),
  };
  return io;
}

const login = (email: string) => {
  testKonten({ action: "send_code", email });
  const code = testKonten({ action: "admin_code", email }).code as string;
  return testKonten({ action: "verify", email, code }) as { token: string; user: { userId: string } };
};

/** Ein Durchgang wie `runner.ts`: erkennen, hochladen, holen */
function sync(state: SyncState, io: Io, token: string): SyncState {
  let s = detectChanges(state, io);
  if (s.queue.length) {
    const r = testKonten({ action: "push_entries", token, docs: s.queue });
    expect(r.error).toBeUndefined();
    s = markSent(s, s.queue);
  }
  return applyRemote(s, io, testKonten({ action: "pull_entries", token, since: s.cursor }).docs as CloudDoc[]).state;
}

const entry = (id: string, typ: string, data: Record<string, unknown>, raum = "familie") => ({ id, typ, raum, besitzer: "lokal", erstellt: T0, geaendert: T0, data });
const kalender = (...entries: ReturnType<typeof entry>[]) => ({ version: 2, migratedTermine: true, seenReminders: [], entries });
const WEEK = "2026-10-19";
const liste = (...manual: { id: string; name: string }[]) => ({ version: 6, weeks: { [WEEK]: { manual: manual.map((m) => ({ ...m, amount: "", section: "sonstiges" })), checked: [], have: [] } } });

type Eintrag = { id: string; raum: string; besitzer: string; data: { title?: string; text?: string } };
const eintraege = (io: ReturnType<typeof handy>) => ((io.get("wasgibts.eintraege")?.entries ?? []) as Eintrag[]);
const titel = (io: ReturnType<typeof handy>) => eintraege(io).map((e) => e.data.title).sort();
const einkauf = (io: ReturnType<typeof handy>) => (((io.get("wasgibts.einkaufsliste")?.weeks as Record<string, { manual: { name: string; von?: string }[] }> | undefined)?.[WEEK]?.manual ?? []) as { name: string; von?: string; id: string }[]);
const pinnwand = (io: ReturnType<typeof handy>) => (((io.get("wasgibts.pinnwand")?.messages ?? []) as Eintrag[]).map((m) => m.data.text));
const trips = (io: ReturnType<typeof handy>) => ((io.get("wasgibts.einkaufswege")?.trips ?? []) as Trip[]);

describe("Härtetest „Familie teilen“: zwei Konten, ein Haushalt", () => {
  beforeEach(() => resetTestKonten());

  const setup = () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const hh = testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const a = handy({
      "wasgibts.eintraege": kalender(entry("t1", "termin", { title: "Elternabend", date: "2026-10-23", start: "19:30" }), entry("w1", "termin", { title: "Kundentermin", date: "2026-10-22", start: "09:00" }, "arbeit")),
      "wasgibts.pinnwand": { version: 3, messages: [entry("p1", "pinnwand", { text: "Bin um 20 Uhr da", author: "Felix" })], memos: [] },
    });
    const b = handy();
    const sa = sync(takeOver(emptyState(hh), a, []), a, felix.token);
    const sb = sync(takeOver(emptyState(hh), b, testKonten({ action: "pull_entries", token: lisa.token, since: 0 }).docs as CloudDoc[]), b, lisa.token);
    return { felix, lisa, a, b, sa, sb };
  };

  it("Familie-Termin bei beiden, Arbeit nur beim Besitzer – auch nach weiteren Runden", () => {
    const s = setup();
    const { a, b, felix, lisa } = s;
    expect(titel(a)).toEqual(["Elternabend", "Kundentermin"]);
    expect(titel(b)).toEqual(["Elternabend"]);
    // Neuer Arbeit-Termin bei Felix: kommt nie bei Lisa an
    a.tick();
    a.set("wasgibts.eintraege", { ...a.get("wasgibts.eintraege")!, entries: [...eintraege(a), entry("w2", "termin", { title: "Abgabe Angebot", date: "2026-10-24" }, "arbeit")] });
    s.sa = sync(s.sa, a, felix.token);
    s.sb = sync(s.sb, b, lisa.token);
    expect(titel(b)).toEqual(["Elternabend"]);
    expect(JSON.stringify(b.get("wasgibts.eintraege"))).not.toMatch(/Kundentermin|Abgabe Angebot/);
    // Neuer Familie-Termin von Lisa: kommt bei Felix an, „von“ = Lisa
    b.tick(2);
    b.set("wasgibts.eintraege", { ...b.get("wasgibts.eintraege")!, entries: [...eintraege(b), entry("t2", "termin", { title: "Zahnarzt Mathis", date: "2026-10-26", start: "16:00" })] });
    s.sb = sync(s.sb, b, lisa.token);
    s.sa = sync(s.sa, a, felix.token);
    expect(titel(a)).toEqual(["Abgabe Angebot", "Elternabend", "Kundentermin", "Zahnarzt Mathis"]);
    expect(eintraege(a).find((e) => e.id === "t2")?.besitzer).toBe(lisa.user.userId);
  });

  it("Lisa kann Felix’ Arbeit weder überschreiben noch löschen", () => {
    const { lisa, felix } = setup();
    const fake = { id: "w1", typ: "termin", raum: "arbeit", besitzer: null, erstellt: T0, geaendert: "2026-10-22T08:00:00.000Z", geloescht: true, data: {} };
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [fake] }).skipped).toEqual(["w1"]);
    // Auch als „Familie“ getarnt nicht
    expect(testKonten({ action: "push_entries", token: lisa.token, docs: [{ ...fake, raum: "familie", geloescht: false, data: { data: { title: "x" } } }] }).skipped).toEqual(["w1"]);
    const rows = testKonten({ action: "pull_entries", token: felix.token, since: 0 }).docs as CloudDoc[];
    expect(rows.find((d) => d.id === "w1")).toMatchObject({ raum: "arbeit", geloescht: false });
  });

  it("Einkauf: Lisa setzt Milch drauf → bei Felix in der Liste und gelb im Laden", () => {
    const s = setup();
    const { a, b, felix, lisa } = s;
    const active: ActiveTrip = { tripId: null, shop: "REWE", since: T0, known: [], doneBefore: [] };
    b.tick(3);
    b.set("wasgibts.einkaufsliste", liste({ id: "m1", name: "Milch" }));
    s.sb = sync(s.sb, b, lisa.token);
    s.sa = sync(s.sa, a, felix.token);
    const milch = einkauf(a).find((i) => i.name === "Milch");
    expect(milch?.von).toBe(lisa.user.userId);
    const items = einkauf(a).map((i) => ({ key: i.id, name: i.name, originalName: i.name, amount: "", section: "sonstiges" as const, dishes: [], days: [], shop: "", checked: false, hidden: false, von: i.von }));
    expect([...newDuringTrip(items, active, felix.user.userId)]).toEqual(["m1"]);
  });

  it("Pinnwand in beide Richtungen", () => {
    const s = setup();
    const { a, b, felix, lisa } = s;
    expect(pinnwand(b)).toEqual(["Bin um 20 Uhr da"]);
    b.tick(4);
    b.set("wasgibts.pinnwand", { version: 3, messages: [...((b.get("wasgibts.pinnwand")?.messages ?? []) as unknown[]), entry("p2", "pinnwand", { text: "Pizza ist im Ofen", author: "Lisa" })], memos: [] });
    s.sb = sync(s.sb, b, lisa.token);
    s.sa = sync(s.sa, a, felix.token);
    expect(pinnwand(a).sort()).toEqual(["Bin um 20 Uhr da", "Pizza ist im Ofen"]);
  });

  it("„Steh grad davor“: Felix antwortet am geteilten Einkauf, Lisa sieht die Antwort", () => {
    const s = setup();
    const { a, b, felix, lisa } = s;
    const trip: Trip = { id: "w1", shop: "REWE", by: "Felix", start: T0, end: null, count: null, vorschlaege: [] };
    a.set("wasgibts.einkaufswege", { version: 1, trips: [trip] });
    s.sa = sync(s.sa, a, felix.token);
    s.sb = sync(s.sb, b, lisa.token);
    expect(trips(b).map((t) => [t.shop, t.von])).toEqual([["REWE", felix.user.userId]]);
    a.tick(5);
    a.set("wasgibts.einkaufswege", answerTrip({ version: 1, trips: trips(a) }, "w1", { an: lisa.user.userId, was: "Milch", at: a.now() }) as unknown as Record<string, unknown>);
    s.sa = sync(s.sa, a, felix.token);
    s.sb = sync(s.sb, b, lisa.token);
    expect(answersForMe(trips(b), lisa.user.userId, Date.parse(T0) + 6 * 60_000)).toEqual([{ by: "Felix", was: "Milch", at: a.now() }]);
    expect(answersForMe(trips(a), felix.user.userId, Date.parse(T0) + 6 * 60_000)).toEqual([]);
  });
});
