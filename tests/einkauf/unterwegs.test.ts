// Einkauf Teil 6 – „Familie Bescheid sagen“: geteilter Einkauf, Schnellknöpfe,
// Gelb für Neues während des Einkaufs, „Eingekauft ✓“, Ruhezeit und Pause,
// zählt nicht als proaktiv.
import { describe, expect, it } from "vitest";
import {
  addTrip,
  boughtCount,
  endText,
  finishTrip,
  migrateBescheid,
  migrateTrips,
  newDuringTrip,
  plusFromLink,
  sameTrip,
  startText,
  tripSuggestions,
  type ActiveTrip,
  type Trip,
} from "@/lib/einkauf/unterwegs/unterwegs";
import { ADAPTERS, stableJson } from "@/lib/konten/sync/docs";
import { planPushes, sentKeys, type PushAbo, type PushEntryRow } from "@/lib/heute/mitteilungen/versand";
import { newsFromDocs } from "@/lib/konten/wer";
import type { ListItem, Staple } from "@/lib/einkauf/listModel";
import type { Member } from "@/lib/konten/model";

const T = "2026-10-21";
const at = (clock: string) => Date.parse(`${T}T${clock}:00+02:00`);
const iso = (clock: string) => new Date(at(clock)).toISOString();
const trip = (extra: Partial<Trip> = {}): Trip => ({ id: "w1", shop: "REWE", by: "Felix", start: iso("17:00"), end: null, count: null, vorschlaege: ["Butter", "Kaffee"], ...extra });
const item = (key: string, extra: Partial<ListItem> = {}): ListItem => ({ key, name: key, originalName: key, amount: "", section: "sonstiges", dishes: [], days: [], shop: "", checked: false, hidden: false, ...extra });
const staple = (name: string, purchases: string[], intervalDays: number | null = 7): Staple => ({ id: name, name, amount: "", section: "sonstiges", purchases, intervalDays, active: true });

describe("Speicher", () => {
  it("migriert und verwirft Kaputtes", () => {
    expect(migrateTrips({ version: 1, trips: [trip(), { id: 3 }, { ...trip({ id: "w2" }), von: "felix", vorschlaege: ["a", "b", "c", 4] }] })?.trips).toEqual([trip(), { ...trip({ id: "w2" }), von: "felix", vorschlaege: ["b", "c"] }]);
    expect(migrateTrips({ version: 2 })).toBeNull();
    expect(migrateBescheid({ version: 1, answer: "vielleicht", active: { shop: "REWE", since: iso("17:00"), known: ["a", 1] } })).toEqual({
      version: 1,
      answer: null,
      active: { tripId: null, shop: "REWE", since: iso("17:00"), known: ["a"], doneBefore: [] },
    });
    expect(migrateBescheid({ version: 1, answer: "ja", active: { shop: 1 } })).toEqual({ version: 1, answer: "ja", active: null });
    expect(migrateBescheid(null)).toBeNull();
  });

  it("neuer Einkauf räumt Altes (2 Tage) weg, Ende nur einmal", () => {
    const old = trip({ id: "alt", start: "2026-10-18T10:00:00.000Z" });
    const s = addTrip({ version: 1, trips: [old, trip()] }, trip({ id: "w9" }), at("17:30"));
    expect(s.trips.map((t) => t.id)).toEqual(["w1", "w9"]);
    const done = finishTrip(s, "w1", iso("17:40"), 9);
    expect(done.trips[0]).toMatchObject({ end: iso("17:40"), count: 9 });
    expect(finishTrip(done, "w1", iso("18:00"), 2).trips[0]).toMatchObject({ end: iso("17:40"), count: 9 });
  });
});

describe("Logik", () => {
  it("Schnellknöpfe: die 2 häufigsten fälligen Stammartikel", () => {
    expect(tripSuggestions([staple("Milch", ["a"]), staple("Butter", ["a", "b", "c"]), staple("Kaffee", ["a", "b"], 14), staple("Brot", ["a", "b"], 3)])).toEqual(["Butter", "Brot"]);
    expect(tripSuggestions([])).toEqual([]);
  });

  it("gleicher Einkauf: gleicher Laden (groß/klein egal), höchstens 3 Std.", () => {
    const a: ActiveTrip = { tripId: null, shop: "REWE", since: iso("17:00"), known: [], doneBefore: [] };
    expect(sameTrip(a, "rewe", at("19:59"))).toBe(true);
    expect(sameTrip(a, "REWE", at("20:01"))).toBe(false);
    expect(sameTrip(a, "Lidl", at("17:01"))).toBe(false);
    expect(sameTrip(null, "REWE", at("17:01"))).toBe(false);
  });

  it("gelb nur, was andere während des Einkaufs dazusetzen", () => {
    const a: ActiveTrip = { tripId: "w1", shop: "REWE", since: iso("17:00"), known: ["alt"], doneBefore: ["x"] };
    const items = [item("alt", { von: "lisa" }), item("neu", { von: "lisa" }), item("meins", { von: "felix" }), item("ohne"), item("weg", { von: "lisa", checked: true })];
    expect([...newDuringTrip(items, a, "felix")]).toEqual(["neu"]);
    expect(newDuringTrip(items, null, "felix").size).toBe(0);
    expect(newDuringTrip(items, a, null).size).toBe(0);
    expect(boughtCount([item("x", { checked: true }), item("y", { checked: true }), item("z", { checked: true, hidden: true }), item("q")], a)).toBe(1);
    expect(boughtCount([item("x", { checked: true })], null)).toBe(1);
  });

  it("Texte ohne Druck", () => {
    expect(startText(trip())).toBe("Felix ist gleich bei REWE. Braucht ihr noch was?");
    expect(startText(trip({ by: " " }))).toBe("Jemand ist gleich bei REWE. Braucht ihr noch was?");
    expect(endText(trip({ count: 9 }))).toBe("Eingekauft ✓ – 9 Sachen bei REWE");
    expect(endText(trip({ count: 1 }))).toBe("Eingekauft ✓ – 1 Sache bei REWE");
    expect(endText(trip({ count: 0 }))).toBe("Felix ist fertig bei REWE.");
  });

  it("Schnellknopf-Link: einmal drauf, nicht doppelt", () => {
    expect(plusFromLink("?plus=Butter", [])).toEqual({ name: "Butter", already: false });
    expect(plusFromLink("?plus=%20butter%20", [item("x", { name: "Butter" })])).toEqual({ name: "butter", already: true });
    expect(plusFromLink("?plus=Butter", [item("x", { name: "Butter", checked: true })])).toEqual({ name: "Butter", already: false });
    expect(plusFromLink("", [])).toBeNull();
    expect(plusFromLink("?plus=", [])).toBeNull();
  });
});

describe("Abgleich", () => {
  const a = ADAPTERS.find((x) => x.name === "unterwegs")!;

  it("„von“ setzt der Server, wird nicht hochgeladen", () => {
    const value = { version: 1, trips: [{ ...trip(), von: "felix" }] };
    const docs = a.toDocs(value);
    expect(docs).toEqual([{ id: "uw:w1", typ: "unterwegs", raum: "familie", besitzer: "felix", erstellt: iso("17:00"), data: trip() }]);
    expect(stableJson(a.fromDocs(docs, null))).toBe(stableJson(value));
    expect(a.fromDocs([{ ...docs[0], besitzer: null }], null)).toEqual({ version: 1, trips: [trip()] });
  });

  it("Neuigkeit für die Jetzt-Karte bei den anderen (nur solange unterwegs)", () => {
    const members: Member[] = [
      { userId: "felix", displayName: "Felix", role: "erwachsener", personId: null },
      { userId: "lisa", displayName: "Lisa", role: "erwachsener", personId: null },
    ];
    const doc = { id: "uw:w1", typ: "unterwegs", raum: "familie" as const, besitzer: "felix", erstellt: iso("17:00"), geaendert: iso("17:00"), geloescht: false, data: trip() };
    expect(newsFromDocs([doc], () => false, members, "lisa")).toEqual([{ id: "uw:w1", title: "Felix ist gleich bei REWE", detail: "Braucht ihr noch was?", at: iso("17:00"), href: "/einkaufsliste" }]);
    expect(newsFromDocs([doc], () => false, members, "felix")).toEqual([]);
    expect(newsFromDocs([{ ...doc, data: trip({ end: iso("17:30") }) }], () => false, members, "lisa")).toEqual([]);
  });
});

describe("Mitteilungen vom Server", () => {
  const HH = "hh-1";
  const row = (data: Trip, extra: Partial<PushEntryRow> = {}): PushEntryRow => ({ household_id: HH, id: "uw:w1", typ: "unterwegs", raum: "familie", besitzer: "felix", erstellt: data.start, geaendert: data.start, data, ...extra });
  const abo = (id: string, user: string, settings: PushAbo["settings"] = {}): PushAbo => ({ id, user_id: user, household_id: HH, settings });
  const plan = (abos: PushAbo[], rows: PushEntryRow[], clock = "17:02", extra: Partial<Parameters<typeof planPushes>[0]> = {}) => {
    const [h, m] = clock.split(":").map(Number);
    return planPushes({ abos, rows, today: T, minute: h * 60 + m, nowMs: at(clock), sent: new Set(), proactiveToday: new Set(), ...extra });
  };

  it("Start an die anderen mit Schnellknöpfen, nie an die Person selbst", () => {
    const out = plan([abo("F", "felix"), abo("L", "lisa")], [row(trip())]);
    expect(out).toEqual([
      {
        aboId: "L",
        key: "unterwegs:uw:w1:start",
        payload: {
          title: "Mia",
          body: "Felix ist gleich bei REWE. Braucht ihr noch was?",
          href: "/einkaufsliste",
          tag: "unterwegs:uw:w1",
          actions: [
            { action: "plus:Butter", title: "+ Butter" },
            { action: "plus:Kaffee", title: "+ Kaffee" },
            { action: "nichts", title: "Nichts, danke" },
          ],
        },
      },
    ]);
  });

  it("Ende: „Eingekauft ✓“, kein Start mehr", () => {
    const out = plan([abo("L", "lisa")], [row(trip({ end: iso("17:20"), count: 9 }))], "17:21");
    expect(out.map((m) => [m.key, m.payload.body, m.payload.actions])).toEqual([["unterwegs:uw:w1:ende", "Eingekauft ✓ – 9 Sachen bei REWE", undefined]]);
  });

  it("nur frisch, nie doppelt, nicht 20–7 Uhr, nie in der Pause, Schalter aus = nichts", () => {
    expect(plan([abo("L", "lisa")], [row(trip())], "17:30")).toEqual([]);
    const first = plan([abo("L", "lisa")], [row(trip())]);
    expect(plan([abo("L", "lisa")], [row(trip())], "17:03", { sent: sentKeys(first.map((m) => ({ abo_id: m.aboId, key: m.key }))) })).toEqual([]);
    const late = trip({ start: iso("20:00") });
    expect(plan([abo("L", "lisa")], [row(late)], "20:01")).toEqual([]);
    const early = trip({ start: iso("06:55") });
    expect(plan([abo("L", "lisa")], [row(early)], "06:58")).toEqual([]);
    expect(plan([abo("L", "lisa", { pause: { from: "2026-10-20", until: null } })], [row(trip())])).toEqual([]);
    expect(plan([abo("L", "lisa", { kinds: { einkauf: false } })], [row(trip())])).toEqual([]);
  });

  it("zählt nicht als proaktiv (vom Menschen ausgelöst)", () => {
    const out = plan([abo("L", "lisa")], [row(trip())], "17:02", { proactiveToday: new Set(["L"]) });
    expect(out).toHaveLength(1);
    expect(out[0].key.startsWith("proaktiv:")).toBe(false);
  });

  it("ohne Laden oder ohne Vorschläge: nur „Nichts, danke“", () => {
    expect(plan([abo("L", "lisa")], [row(trip({ shop: "" }))])).toEqual([]);
    expect(plan([abo("L", "lisa")], [row(trip({ vorschlaege: [] }))])[0].payload.actions).toEqual([{ action: "nichts", title: "Nichts, danke" }]);
  });
});
