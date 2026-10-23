import { describe, expect, it } from "vitest";
import { ADAPTERS, countDocs, docHash, stableJson, takeoverSummary, type CloudDoc } from "@/lib/konten/sync/docs";
import { STORAGE } from "@/lib/core/storage";
import { applyRemote, detectChanges, emptyState, markSent, migrateSyncState, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";

const T0 = "2026-10-21T08:00:00.000Z";

/** Speicher eines Geräts im Arbeitsspeicher, mit einstellbarer Uhr */
function device(values: Record<string, Record<string, unknown>> = {}) {
  const data = new Map(Object.entries(structuredClone(values)));
  let clock = Date.parse(T0);
  const io: Io & { tick(min?: number): void; get(key: string): Record<string, unknown> } = {
    read: (key) => (data.has(key) ? structuredClone(data.get(key)!) : null),
    write: (key, value) => void data.set(key, structuredClone(value)),
    now: () => new Date(clock).toISOString(),
    tick: (min = 1) => void (clock += min * 60_000),
    get: (key) => data.get(key)!,
  };
  return io;
}

const termin = (id: string, title: string, raum = "familie") => ({ id, typ: "termin", raum, besitzer: "lokal", erstellt: T0, geaendert: T0, data: { title, date: "2026-10-22", start: "08:00" } });
const kalender = (...entries: ReturnType<typeof termin>[]) => ({ version: 2, entries, migratedTermine: true, seenReminders: ["x@2026-10-20"] });

const FULL = {
  "wasgibts.eintraege": kalender(termin("t1", "Kita"), { ...termin("a1", "Müll"), typ: "aufgabe" }),
  "wasgibts.notizen": { version: 1, notes: [{ id: "n1", typ: "notiz", raum: "arbeit", besitzer: "lokal", erstellt: T0, geaendert: T0, data: { title: "WLAN", text: "abc" } }] },
  "wasgibts.pinnwand": { version: 3, messages: [{ id: "p1", typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: T0, geaendert: T0, data: { text: "Hallo" } }], memos: [{ id: "m1", typ: "memo" }] },
  "wasgibts.einkaufsliste": {
    version: 4,
    weeks: { "2026-10-19": { manual: [{ id: "i1", name: "Milch", amount: "", section: "kuehl", done: false }], checked: ["k1"], have: [] } },
    products: { milch: "Hafermilch" },
    shops: ["REWE"],
    itemShops: {},
    staples: [{ id: "s1", name: "Brot" }],
  },
  "wasgibts.wochenplan": { version: 3, weeks: { "2026-10-19": { mo: { kind: "text", title: "Nudeln", category: null }, "mo:notiz": { kind: "note", text: "Oma kommt" } } } },
  "wasgibts.vorrat": { version: 2, items: [{ id: "v1", name: "Reis", amount: 1, unit: "kg", addedAt: T0, place: "schrank" }] },
};

/** Server im Kleinen: neueste Änderung gewinnt, rev zählt hoch */
function server() {
  const rows = new Map<string, CloudDoc>();
  let rev = 0;
  return {
    push(docs: CloudDoc[], me: string) {
      for (const d of docs) {
        const old = rows.get(d.id);
        if (old && Date.parse(old.geaendert) >= Date.parse(d.geaendert)) continue;
        rows.set(d.id, { ...d, besitzer: old?.besitzer ?? me, erstellt: old?.erstellt ?? d.erstellt, rev: ++rev });
      }
    },
    pull: (since: number) => [...rows.values()].filter((d) => (d.rev ?? 0) > since).sort((a, b) => a.rev! - b.rev!),
    rows,
  };
}

/** Ein Abgleich-Durchgang: erkennen, hochladen, holen */
function cycle(state: SyncState, io: Io, srv: ReturnType<typeof server>, me: string): SyncState {
  let s = detectChanges(state, io);
  const sent = s.queue;
  srv.push(sent, me);
  s = markSent(s, sent);
  return applyRemote(s, io, srv.pull(s.cursor)).state;
}

describe("Übersetzer: verlustfrei hin und zurück", () => {
  for (const a of ADAPTERS) {
    it(a.name, () => {
      const value = FULL[a.key as keyof typeof FULL];
      const docs = a.toDocs(value);
      expect(docs.length).toBeGreaterThan(0);
      expect(stableJson(a.fromDocs(docs, value))).toBe(stableJson(value));
    });
  }

  it("Sprachnachrichten und gesehene Erinnerungen bleiben auf dem Gerät", () => {
    const pin = ADAPTERS.find((a) => a.name === "pinnwand")!;
    expect(pin.toDocs(FULL["wasgibts.pinnwand"]).map((d) => d.typ)).toEqual(["pinnwand"]);
    const kal = ADAPTERS.find((a) => a.name === "kalender")!;
    expect(kal.fromDocs([], FULL["wasgibts.eintraege"]).seenReminders).toEqual(["x@2026-10-20"]);
  });

  it("geteilt werden nur Familien-Daten aus der Sicherung – nie Beispiel-Tag, Einstellungen oder Startseite", () => {
    const keys = ADAPTERS.map((a) => a.key);
    expect(keys).toEqual(["wasgibts.eintraege", "wasgibts.notizen", "wasgibts.pinnwand", "wasgibts.einkaufsliste", "wasgibts.wochenplan", "wasgibts.vorrat"]);
    for (const k of keys) expect(STORAGE.find((s) => s.key === k)?.backup).toBe(true);
    for (const a of ADAPTERS) expect((STORAGE.find((s) => s.key === a.key) as { version?: number } | undefined)?.version).toBe(a.version);
  });

  it("Fingerabdruck unabhängig von der Reihenfolge der Schlüssel", () => {
    expect(docHash({ typ: "x", raum: "familie", data: { a: 1, b: { c: 2, d: 3 } } })).toBe(docHash({ typ: "x", raum: "familie", data: { b: { d: 3, c: 2 }, a: 1 } }));
    expect(docHash({ typ: "x", raum: "familie", data: { a: 1 } })).not.toBe(docHash({ typ: "x", raum: "arbeit", data: { a: 1 } }));
  });

  it("Vorschau der Übernahme", () => {
    const counts = countDocs(ADAPTERS.flatMap((a) => a.toDocs(FULL[a.key as keyof typeof FULL])));
    expect(counts).toEqual({ termin: 1, aufgabe: 1, notiz: 1, pinnwand: 1, einkauf: 1, wochenplan: 2, vorrat: 1 });
    expect(takeoverSummary({ termin: 3, aufgabe: 5, notiz: 1 })).toBe("3 Termine, 5 Aufgaben und 1 Notiz werden mitgenommen.");
    expect(takeoverSummary({ termin: 1 })).toBe("1 Termin wird mitgenommen.");
    expect(takeoverSummary({ einkauf: 2 })).toBe("2 Sachen auf der Einkaufsliste werden mitgenommen.");
    expect(takeoverSummary({})).toBe("");
  });
});

describe("Abgleich zwischen zwei Handys", () => {
  const FELIX = "u-felix";
  const LISA = "u-lisa";

  const setup = () => {
    const srv = server();
    const a = device(FULL);
    const b = device({ "wasgibts.eintraege": kalender(termin("t9", "Lisas Zahnarzt")) });
    let sa = takeOver(emptyState("hh"), a, srv.pull(0));
    sa = cycle(sa, a, srv, FELIX);
    let sb = takeOver(emptyState("hh"), b, srv.pull(0));
    sb = cycle(sb, b, srv, LISA);
    sa = cycle(sa, a, srv, FELIX);
    return { srv, a, b, sa, sb };
  };

  it("Übernahme: beide sehen alles, Arbeit wird mitgenommen (der Server zeigt sie nur dem Besitzer)", () => {
    const { a, b, srv } = setup();
    const titles = (io: ReturnType<typeof device>) => (io.get("wasgibts.eintraege").entries as { data: { title: string } }[]).map((e) => e.data.title).sort();
    expect(titles(a)).toEqual(["Kita", "Lisas Zahnarzt", "Müll"]);
    expect(titles(b)).toEqual(["Kita", "Lisas Zahnarzt", "Müll"]);
    expect(srv.rows.get("n1")?.raum).toBe("arbeit");
    expect((b.get("wasgibts.eintraege").entries as { besitzer: string }[]).find((e) => e.besitzer === FELIX)).toBeTruthy();
    expect(b.get("wasgibts.eintraege").seenReminders).toEqual(["x@2026-10-20"]);
  });

  it("keine doppelte Übernahme", () => {
    const { a, sa, srv } = setup();
    const again = takeOver(sa, a, srv.pull(0));
    expect(again).toBe(sa);
    expect(detectChanges(sa, a).queue).toEqual([]);
    expect(srv.rows.size).toBe(ADAPTERS.flatMap((x) => x.toDocs(FULL[x.key as keyof typeof FULL])).length + 1);
  });

  it("Änderung bei A kommt bei B an; unverändertes wird nicht nochmal geschickt", () => {
    const ctx = setup();
    const { a, b, srv } = ctx;
    let { sa, sb } = ctx;
    a.tick();
    const v = a.get("wasgibts.eintraege");
    a.write("wasgibts.eintraege", { ...v, entries: (v.entries as ReturnType<typeof termin>[]).map((e) => (e.id === "t1" ? { ...e, data: { ...e.data, title: "Kita 9 Uhr" } } : e)) });
    sa = detectChanges(sa, a);
    expect(sa.queue.map((q) => q.id)).toEqual(["t1"]);
    srv.push(sa.queue, FELIX);
    sa = markSent(sa, sa.queue);
    sb = cycle(sb, b, srv, LISA);
    expect((b.get("wasgibts.eintraege").entries as ReturnType<typeof termin>[]).find((e) => e.id === "t1")?.data.title).toBe("Kita 9 Uhr");
    expect(detectChanges(sb, b).queue).toEqual([]);
  });

  it("Konflikt: die neuere Änderung gewinnt – auf beiden Handys", () => {
    const ctx = setup();
    const { a, b, srv } = ctx;
    const { sa } = ctx;
    let { sb } = ctx;
    const rename = (io: ReturnType<typeof device>, title: string) => {
      const v = io.get("wasgibts.eintraege");
      io.write("wasgibts.eintraege", { ...v, entries: (v.entries as ReturnType<typeof termin>[]).map((e) => (e.id === "t1" ? { ...e, data: { ...e.data, title } } : e)) });
    };
    a.tick(1);
    rename(a, "von Felix");
    b.tick(2);
    rename(b, "von Lisa (später)");
    sb = cycle(sb, b, srv, LISA);
    cycle(sa, a, srv, FELIX); // Felix ist älter → bleibt nicht
    cycle(sb, b, srv, LISA);
    const title = (io: ReturnType<typeof device>) => (io.get("wasgibts.eintraege").entries as ReturnType<typeof termin>[]).find((e) => e.id === "t1")?.data.title;
    expect(title(a)).toBe("von Lisa (später)");
    expect(title(b)).toBe("von Lisa (später)");
    expect(srv.rows.get("t1")?.besitzer).toBe(FELIX);
  });

  it("Löschen nur als Markierung, kommt beim anderen an", () => {
    const ctx = setup();
    const { a, b, srv } = ctx;
    const { sa } = ctx;
    let { sb } = ctx;
    a.tick();
    const v = a.get("wasgibts.vorrat");
    a.write("wasgibts.vorrat", { ...v, items: [] });
    cycle(sa, a, srv, FELIX);
    expect(srv.rows.get("vr:v1")?.geloescht).toBe(true);
    sb = cycle(sb, b, srv, LISA);
    expect(b.get("wasgibts.vorrat").items).toEqual([]);
    expect(detectChanges(sb, b).queue).toEqual([]);
  });

  it("Löschen eines Arbeit-Eintrags bleibt Arbeit", () => {
    const ctx = setup();
    const { a, srv } = ctx;
    let { sa } = ctx;
    a.tick();
    a.write("wasgibts.notizen", { version: 1, notes: [] });
    sa = detectChanges(sa, a);
    expect(sa.queue).toMatchObject([{ id: "n1", raum: "arbeit", geloescht: true, typ: "notiz" }]);
    void srv;
  });

  it("offline → online: Warteschlange bleibt, bis gesendet; danach angeglichen", () => {
    const ctx = setup();
    const { a, b, srv } = ctx;
    let { sa } = ctx;
    const { sb } = ctx;
    a.tick();
    const v = a.get("wasgibts.pinnwand");
    a.write("wasgibts.pinnwand", { ...v, messages: [...(v.messages as unknown[]), { id: "p2", typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: T0, geaendert: T0, data: { text: "Bin im Zug" } }] });
    sa = detectChanges(sa, a); // offline: nichts gesendet
    const saved = migrateSyncState(JSON.parse(JSON.stringify(sa)))!;
    expect(saved.queue.map((q) => q.id)).toEqual(["p2"]);
    a.tick();
    sa = cycle(saved, a, srv, FELIX); // wieder online
    expect(sa.queue).toEqual([]);
    cycle(sb, b, srv, LISA);
    expect((b.get("wasgibts.pinnwand").messages as { id: string }[]).map((m) => m.id)).toContain("p2");
  });

  it("Änderung während des Sendens geht nicht verloren", () => {
    const ctx = setup();
    const { a } = ctx;
    let { sa } = ctx;
    a.tick();
    a.write("wasgibts.vorrat", { version: 2, items: [{ id: "v1", name: "Reis", amount: 2, unit: "kg", addedAt: T0, place: "schrank" }] });
    sa = detectChanges(sa, a);
    const sending = sa.queue;
    a.tick();
    a.write("wasgibts.vorrat", { version: 2, items: [{ id: "v1", name: "Reis", amount: 3, unit: "kg", addedAt: T0, place: "schrank" }] });
    sa = detectChanges(sa, a);
    sa = markSent(sa, sending);
    expect(sa.queue).toHaveLength(1);
    expect((sa.queue[0].data as { amount: number }).amount).toBe(3);
  });

  it("Übernahme führt Listen-Einstellungen zusammen statt zu überschreiben", () => {
    const { srv } = setup();
    const c = device({ "wasgibts.einkaufsliste": { version: 4, weeks: {}, products: { brot: "Dinkelbrot" }, shops: ["Lidl"], itemShops: {}, staples: [{ id: "s2", name: "Eier" }] } });
    takeOver(emptyState("hh"), c, srv.pull(0));
    const list = c.get("wasgibts.einkaufsliste");
    expect(list.shops).toEqual(["REWE", "Lidl"]);
    expect(list.products).toEqual({ milch: "Hafermilch", brot: "Dinkelbrot" });
    expect((list.staples as { id: string }[]).map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("vor der Übernahme passiert nichts; unbekannte Arten werden übersprungen", () => {
    const io = device(FULL);
    expect(detectChanges(emptyState("hh"), io).queue).toEqual([]);
    const r = applyRemote({ ...emptyState("hh"), takeover: "fertig" }, io, [{ id: "z", typ: "zukunft", raum: "familie", besitzer: "x", erstellt: T0, geaendert: T0, geloescht: false, data: {}, rev: 7 }]);
    expect(r.changed).toBe(0);
    expect(r.state.cursor).toBe(7);
    expect(migrateSyncState({ version: 9 })).toBeNull();
  });

  it("Speicher in alter Version wird ausgelassen, bis er migriert ist", () => {
    const io = device({ "wasgibts.vorrat": { version: 1, items: [{ id: "v1", name: "Reis" }] } });
    const s = detectChanges({ ...emptyState("hh"), takeover: "fertig" }, io);
    expect(s.queue).toEqual([]);
  });
});
