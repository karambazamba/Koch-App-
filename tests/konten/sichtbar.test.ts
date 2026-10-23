// Etappe 3d: Sichtbar machen – „von Lisa“ nur bei anderen und mehreren
// Personen, leise Neuigkeiten für die Jetzt-Karte (höchstens eine am Tag,
// jede nur einmal), Einkauf merkt sich „von“, Spendentopf je Haushalt.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addedBy, addNews, emptyNews, markNewsShown, migrateNews, newsForCard, newsFromDocs, NEWS_FRESH_MS } from "@/lib/konten/wer";
import { ADAPTERS, type CloudDoc } from "@/lib/konten/sync/docs";
import { jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
import type { Member } from "@/lib/konten/model";

const FELIX = "u-felix";
const LISA = "u-lisa";
const members: Member[] = [
  { userId: FELIX, displayName: "Felix", role: "erwachsener", personId: null },
  { userId: LISA, displayName: "Lisa", role: "erwachsener", personId: null },
];
const T = "2026-10-21T08:00:00.000Z";
const doc = (id: string, typ: string, data: unknown, besitzer: string | null = LISA, extra: Partial<CloudDoc> = {}): CloudDoc => ({ id, typ, raum: "familie", besitzer, erstellt: T, geaendert: T, geloescht: false, data, ...extra });

describe("Von wem", () => {
  it("nur andere, nur mit mehreren Personen, nur bekannte", () => {
    expect(addedBy(LISA, members, FELIX)).toEqual({ name: "Lisa" });
    expect(addedBy(FELIX, members, FELIX)).toBeNull();
    expect(addedBy(LISA, [members[1]], FELIX)).toBeNull();
    expect(addedBy("u-fremd", members, FELIX)).toBeNull();
    expect(addedBy(undefined, members, FELIX)).toBeNull();
    expect(addedBy("lokal", members, FELIX)).toBeNull();
  });
});

describe("Neuigkeiten aus dem Haushalt", () => {
  const docs = [
    doc("ek:2026-10-19:i1", "einkauf", { week: "2026-10-19", item: { id: "i1", name: "Milch" } }),
    doc("t9", "termin", { id: "t9", typ: "termin", data: { title: "Elternabend", date: "2026-10-22" } }),
    doc("t10", "termin", { id: "t10", typ: "termin", data: { title: "Kunde" } }, LISA, { raum: "arbeit" }),
    doc("ek:2026-10-19:i2", "einkauf", { week: "2026-10-19", item: { id: "i2", name: "Brot" } }, FELIX),
    doc("ek:2026-10-19:i3", "einkauf", { week: "2026-10-19", item: { id: "i3", name: "Eier" } }, LISA, { geloescht: true }),
    doc("a1", "aufgabe", { id: "a1", typ: "aufgabe", data: { title: "Müll" } }),
  ];

  it("nur Neues von anderen: Einkauf und Familien-Termine", () => {
    const news = newsFromDocs(docs, (id) => id === "known", members, FELIX);
    expect(news.map((n) => [n.title, n.detail, n.href])).toEqual([
      ["Milch steht auf der Liste", "Hat Lisa gerade gesetzt.", "/einkaufsliste"],
      ["Neu: Elternabend", "Hat Lisa eingetragen.", "/tag?datum=2026-10-22"],
    ]);
    expect(newsFromDocs(docs, () => true, members, FELIX)).toEqual([]);
    expect(newsFromDocs(docs, () => false, [members[0]], FELIX)).toEqual([]);
  });

  it("jedes Ziel ist eine echte Seite (früher „/kalender“ – gibt es nicht)", () => {
    for (const n of newsFromDocs(docs, () => false, members, FELIX)) {
      const path = n.href.split("?")[0];
      expect(existsSync(`src/app${path === "/" ? "" : path}/page.tsx`)).toBe(true);
    }
  });

  it("Zeile 1 höchstens 32 Zeichen", () => {
    const long = newsFromDocs([doc("ek:w:x", "einkauf", { week: "w", item: { id: "x", name: "Hafermilch ohne Zucker Barista" } })], () => false, members, FELIX);
    expect(long[0].title.length).toBeLessThanOrEqual(32);
  });

  it("höchstens eine am Tag, jede nur einmal, nach 6 Std. still", () => {
    const now = Date.parse(T) + 60_000;
    let s = addNews(emptyNews(), newsFromDocs(docs, () => false, members, FELIX));
    const first = newsForCard(s, now, "2026-10-21");
    expect(first?.title).toBe("Neu: Elternabend");
    s = markNewsShown(s, first!.id, "2026-10-21");
    // heute bleibt dieselbe stehen (kein Wechsel), keine zweite
    expect(newsForCard(s, now, "2026-10-21")?.id).toBe(first!.id);
    // morgen die nächste noch nicht gezeigte – wenn frisch
    expect(newsForCard(s, now, "2026-10-22")?.title).toBe("Milch steht auf der Liste");
    expect(newsForCard(s, Date.parse(T) + NEWS_FRESH_MS + 1, "2026-10-22")).toBeNull();
    // die gezeigte kommt nie wieder
    s = markNewsShown(s, "ek:2026-10-19:i1", "2026-10-22");
    expect(newsForCard(s, now, "2026-10-23")).toBeNull();
  });

  it("Speicher: kaputt → leer, alte Einträge ohne Ziel bekommen eins", () => {
    expect(migrateNews(null)).toBeNull();
    expect(migrateNews({ version: 1, items: [{ id: "x", title: "a", detail: "b", at: T }, { id: 3 }], shown: ["x", 4], lastDay: null })).toEqual({ version: 1, items: [{ id: "x", title: "a", detail: "b", at: T, href: "/" }], shown: ["x"], lastDay: null });
  });

  it("Jetzt-Karte: sanftes Thema „familie“, nachts nicht", () => {
    const base = { minutes: 600, today: "2026-10-21", calm: false, upcoming: [], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [] }, urgent: [], dueToday: [], pin: null, planWeather: null, dish: null, birthdays: [], sport: null, shop: null, timer: null, cookingStep: null, reminder: null, pause: null, dinnerFree: false, leisure: null, tip: null, region: null, kids: false, weekCheck: null, demo: false, tiles: [], weights: {}, hidden: [] } as unknown as JetztInput;
    const family = { id: "ek:1", title: "Milch steht auf der Liste", detail: "Hat Lisa gerade gesetzt.", href: "/einkaufsliste" };
    const day = jetztTopics({ ...base, family });
    expect(day.some((t) => t.kind === "familie" && t.title === family.title && t.button === "Öffnen")).toBe(true);
    expect(jetztTopics({ ...base, calm: true, family }).some((t) => t.kind === "familie")).toBe(true);
    expect(jetztTopics({ ...base, minutes: 23 * 60, family }).some((t) => t.kind === "familie")).toBe(false);
  });
});

describe("Einkauf merkt sich „von“, ohne es hochzuladen", () => {
  const einkauf = ADAPTERS.find((a) => a.name === "einkauf")!;
  const value = { version: 4, weeks: { w1: { manual: [{ id: "i1", name: "Milch", amount: "", section: "kuehl", done: false, von: LISA }], checked: [], have: [] } }, products: {}, shops: [], itemShops: {}, staples: [] };

  it("„von“ steckt im Besitzer, nicht in den Daten", () => {
    const d = einkauf.toDocs(value).find((x) => x.typ === "einkauf")!;
    expect(d.besitzer).toBe(LISA);
    expect((d.data as { item: Record<string, unknown> }).item.von).toBeUndefined();
  });

  it("zurück kommt „von“ wieder an die Zeile", () => {
    const back = einkauf.fromDocs(einkauf.toDocs(value), value) as typeof value;
    expect(back.weeks.w1.manual[0].von).toBe(LISA);
  });
});

describe("Spendentopf je Haushalt", () => {
  const pot = ADAPTERS.find((a) => a.name === "spendentopf")!;
  const mine = { version: 2, region: "ostholstein", support: null, interest: [], votes: { "2026": "spielplatz" }, pledge: null, ask: { since: null, asked: 2, next: null, done: false }, voteCardHidden: [2026], liveAsked: true };

  it("Stimme, Region und Beitrag geteilt – Fragen und Karten bleiben auf dem Gerät", () => {
    const [d] = pot.toDocs(mine);
    expect(d.id).toBe("pot:haushalt");
    expect(Object.keys(d.data as object).sort()).toEqual(["interest", "pledge", "region", "support", "votes"]);
    const fromLisa = { ...(d.data as object), votes: { "2026": "bücherei" } };
    const merged = pot.fromDocs([{ ...d, data: fromLisa }], mine) as typeof mine;
    expect(merged.votes).toEqual({ "2026": "bücherei" });
    expect(merged.ask.asked).toBe(2);
    expect(merged.voteCardHidden).toEqual([2026]);
  });
});
