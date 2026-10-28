// „Nur für mich“ und Reihenfolge beim Partner (A-028, Tafel 123): zwei
// Handys, zwei Konten, der echte Abgleich gegen das Test-Backend mit den
// Regeln der Datenbank. Platz und Größe kommen beim Partner an, private
// Zettel nie – auch nicht, wenn ein geteilter Zettel nachträglich privat wird
// (neue ID, alte als Lösch-Markierung). „Für alle“ macht ihn wieder sichtbar.
import { beforeEach, describe, expect, it } from "vitest";
import { applyRemote, detectChanges, emptyState, markSent, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import type { CloudDoc } from "@/lib/konten/sync/docs";
import { makePinPrivate, type PinMessage } from "@/lib/pinnwand";

const T0 = "2026-10-28T10:00:00.000Z";

function handy(values: Record<string, Record<string, unknown>> = {}) {
  const data = new Map(Object.entries(structuredClone(values)));
  let clock = Date.parse(T0);
  return {
    read: (key: string) => (data.has(key) ? structuredClone(data.get(key)!) : null),
    write: (key: string, value: Record<string, unknown>) => void data.set(key, structuredClone(value)),
    now: () => new Date(clock).toISOString(),
    tick: (min = 1) => void (clock += min * 60_000),
    get: (key: string) => data.get(key),
  } satisfies Io & Record<string, unknown>;
}

const login = (email: string) => {
  testKonten({ action: "send_code", email });
  const code = testKonten({ action: "admin_code", email }).code as string;
  return testKonten({ action: "verify", email, code }) as { token: string };
};

function sync(state: SyncState, io: Io, token: string): SyncState {
  let s = detectChanges(state, io);
  if (s.queue.length) {
    expect(testKonten({ action: "push_entries", token, docs: s.queue }).error).toBeUndefined();
    s = markSent(s, s.queue);
  }
  return applyRemote(s, io, testKonten({ action: "pull_entries", token, since: s.cursor }).docs as CloudDoc[]).state;
}

const pin = (id: string, text: string, extra: Partial<PinMessage["data"]> = {}) => ({
  id,
  typ: "pinnwand",
  raum: "familie",
  besitzer: "lokal",
  erstellt: T0,
  geaendert: T0,
  data: { text, author: "Felix", reactions: {}, replyTo: null, readBy: ["Felix"], pinned: false, farbe: null, papier: "zettel", foto: null, erledigt: null, archiv: null, notizFrage: false, groesse: "klein", sort: null, privat: false, ...extra },
});
const zettel = (io: ReturnType<typeof handy>) => ((io.get("wasgibts.pinnwand")?.messages ?? []) as PinMessage[]);
const texte = (io: ReturnType<typeof handy>) => zettel(io).map((m) => m.data.text).sort();
const aendern = (io: ReturnType<typeof handy>, fn: (list: PinMessage[]) => PinMessage[]) => {
  io.tick();
  const v = io.get("wasgibts.pinnwand")!;
  io.write("wasgibts.pinnwand", { ...v, messages: fn(zettel(io)) });
};

describe("Pinnwand beim Partner: Reihenfolge ja, „Nur für mich“ nie", () => {
  beforeEach(() => resetTestKonten());

  it("Platz und Größe kommen an, private Zettel nicht – auch nicht nachträglich privat gemachte", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const hh = testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const a = handy({ "wasgibts.pinnwand": { version: 5, messages: [pin("p1", "Elternabend Do 19:30"), pin("p2", "Geschenk für Lisa", { privat: true })], memos: [] } });
    const b = handy();
    let sa = sync(takeOver(emptyState(hh), a, []), a, felix.token);
    let sb = sync(takeOver(emptyState(hh), b, testKonten({ action: "pull_entries", token: lisa.token, since: 0 }).docs as CloudDoc[]), b, lisa.token);
    expect(texte(b)).toEqual(["Elternabend Do 19:30"]);

    // gezogen und groß gemacht → beim Partner gleich
    aendern(a, (list) => list.map((m) => (m.id === "p1" ? { ...m, geaendert: a.now(), data: { ...m.data, sort: -42, groesse: "gross" } } : m)));
    sa = sync(sa, a, felix.token);
    sb = sync(sb, b, lisa.token);
    expect(zettel(b).find((m) => m.id === "p1")!.data).toMatchObject({ sort: -42, groesse: "gross" });

    // nachträglich „Nur für mich“: neue ID, beim Partner verschwindet er
    aendern(a, (list) => makePinPrivate(list, "p1", "p1-privat", a.now()));
    sa = sync(sa, a, felix.token);
    sb = sync(sb, b, lisa.token);
    expect(texte(b)).toEqual([]);
    expect(texte(a)).toEqual(["Elternabend Do 19:30", "Geschenk für Lisa"]);

    // „Für alle“ → sieht Lisa
    aendern(a, (list) => list.map((m) => (m.id === "p2" ? { ...m, geaendert: a.now(), data: { ...m.data, privat: false } } : m)));
    sa = sync(sa, a, felix.token);
    sb = sync(sb, b, lisa.token);
    expect(texte(b)).toEqual(["Geschenk für Lisa"]);
    void sa;
    void sb;
  });

  it("Partner kann einen Zettel nicht privat machen (er wäre für den Besitzer weg)", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const hh = testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const a = handy({ "wasgibts.pinnwand": { version: 5, messages: [pin("p1", "Milch ist alle")], memos: [] } });
    sync(takeOver(emptyState(hh), a, []), a, felix.token);
    const doc = (testKonten({ action: "pull_entries", token: lisa.token, since: 0 }).docs as CloudDoc[])[0];
    const r = testKonten({ action: "push_entries", token: lisa.token, docs: [{ ...doc, geaendert: "2030-01-01T00:00:00.000Z", data: { ...(doc.data as object), data: { text: "Milch ist alle", privat: true } } }] });
    expect(r.skipped).toEqual(["p1"]);
  });

  it("Raum „ich“ (A-034) gilt auch für Pinnwand-Einträge: nur der Besitzer, niemand stellt fremde Zettel auf „ich“", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const hh = testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const push = (token: string, docs: unknown[]) => testKonten({ action: "push_entries", token, docs });
    const doc = (id: string, raum: string, text: string, geaendert = T0) => ({ id, typ: "pinnwand", raum, geaendert, data: { id, typ: "pinnwand", raum, data: { text } } });
    expect(push(felix.token, [doc("p-ich", "ich", "Nur in meinem Raum"), doc("p-arbeit", "arbeit", "Lieferant"), doc("p-alle", "familie", "Milch ist alle")]).skipped).toEqual([]);
    const ids = (token: string) => (testKonten({ action: "pull_entries", token, since: 0 }).docs as CloudDoc[]).map((d) => d.id).sort();
    expect(ids(lisa.token)).toEqual(["p-alle"]);
    expect(ids(felix.token)).toEqual(["p-alle", "p-arbeit", "p-ich"]);
    // Lisa stellt Felix’ Zettel nicht auf „ich“ (er wäre für ihn weg)
    expect(push(lisa.token, [doc("p-alle", "ich", "weg", "2030-01-01T00:00:00.000Z")]).skipped).toEqual(["p-alle"]);
    expect(ids(lisa.token)).toEqual(["p-alle"]);
    void hh;
  });
});
