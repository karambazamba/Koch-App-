// Wundertüte und Rätsel (A-052): „gesehen“ im Haushalt geteilt – zwei Handys,
// zwei Konten, ein Haushalt (echter Abgleich gegen das Test-Backend mit den
// Regeln der Datenbank). Lisa und Felix bekommen nie dasselbe doppelt, Mias
// nachgelegte Karten kommen beim anderen an; aktuelle Karte und KI-Zähler
// bleiben auf dem Gerät. Dazu: alte Sicherung (v0.156) lässt sich einspielen.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { applyRemote, detectChanges, emptyState, markSent, takeOver, type Io, type SyncState } from "@/lib/konten/sync/engine";
import { adapterFor, type CloudDoc } from "@/lib/konten/sync/docs";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { LEER, migrateWt, naechste, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { RT_LEER, migrateRaetsel, naechstesRaetsel, type RtStand } from "@/lib/raetsel/auswahl";
import { parseBackup, restoreBackup } from "@/lib/core/backup";
import { memoryStorage } from "../helpers";

const T0 = "2026-11-02T07:00:00.000Z";
const WT = "wasgibts.wundertuete";
const RT = "wasgibts.raetsel";
const LAGE: Lage = { heute: "2026-11-02", minuten: 600, haushalt: "familie" };

function handy(values: Record<string, Record<string, unknown>> = {}) {
  const data = new Map(Object.entries(structuredClone(values)));
  let clock = Date.parse(T0);
  const io = {
    read: (key: string) => (data.has(key) ? structuredClone(data.get(key)!) : null),
    write: (key: string, value: Record<string, unknown>) => void data.set(key, structuredClone(value)),
    now: () => new Date(clock).toISOString(),
    tick: (min = 1) => void (clock += min * 60_000),
    wt: (): WtStand => migrateWt(data.get(WT)) ?? LEER,
    rt: (): RtStand => migrateRaetsel(data.get(RT)) ?? RT_LEER,
    /** „Noch eine ›“ auf der Seite */
    noch: () => {
      const r = naechste(io.wt(), LAGE);
      data.set(WT, structuredClone(r.stand) as unknown as Record<string, unknown>);
      return r.karte!.id;
    },
    /** „Noch eins ›“ im Rätsel-Fenster */
    raetsel: () => {
      const r = naechstesRaetsel(io.rt());
      data.set(RT, structuredClone(r.stand) as unknown as Record<string, unknown>);
      return r.raetsel!.id;
    },
  };
  return io as typeof io & Io;
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

describe("Im Haushalt: gesehen ist für alle gesehen", () => {
  beforeEach(() => resetTestKonten());

  const setup = (a0: Record<string, Record<string, unknown>> = {}) => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const hh = testKonten({ action: "create_household", token: felix.token, name: "Müller", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix.token }).code as string;
    testKonten({ action: "join_household", token: lisa.token, code, displayName: "Lisa" });
    const a = handy(a0);
    const b = handy();
    let sa = sync(takeOver(emptyState(hh), a, []), a, felix.token);
    let sb = sync(takeOver(emptyState(hh), b, testKonten({ action: "pull_entries", token: lisa.token, since: 0 }).docs as CloudDoc[]), b, lisa.token);
    const runde = () => {
      a.tick(1);
      b.tick(1);
      sa = sync(sa, a, felix.token);
      sb = sync(sb, b, lisa.token);
      sa = sync(sa, a, felix.token);
    };
    return { a, b, runde };
  };

  it("eigene Arten im Abgleich (Raum Familie); Übernahme nimmt Gesehenes der alten Wundertüte mit", () => {
    for (const t of ["wundertuete-gesehen", "wundertuete-karte"]) expect(adapterFor(t)?.key).toBe(WT);
    for (const t of ["raetsel-gesehen", "raetsel-karte"]) expect(adapterFor(t)?.key).toBe(RT);
    const { b } = setup({ [WT]: { version: 1, karte: "aw-003", anzeigen: 2, zuletzt: 0, gezeigt: { platt: ["pl-001"] } } });
    expect([...b.wt().gesehen].sort()).toEqual(["aw-003", "pl-001"]);
  });

  it("40× „Noch eine“ und 40× „Noch eins“, abwechselnd Felix und Lisa: nichts doppelt im Haushalt", () => {
    const { a, b, runde } = setup();
    const karten: string[] = [];
    const raetsel: string[] = [];
    for (let i = 0; i < 40; i++) {
      const h = i % 3 === 1 ? b : a;
      karten.push(h.noch());
      raetsel.push(h.raetsel());
      runde();
    }
    expect(new Set(karten).size).toBe(40);
    expect(new Set(raetsel).size).toBe(40);
    expect([...a.wt().gesehen].sort()).toEqual([...b.wt().gesehen].sort());
    expect([...a.rt().gesehen].sort()).toEqual([...b.rt().gesehen].sort());
  });

  it("Mias nachgelegte Witze und Rätsel kommen an; aktuelle Karte und KI-Zähler bleiben auf dem Gerät", () => {
    const { a, b, runde } = setup();
    a.write(WT, { ...LEER, aktuell: { id: "aw-001", tag: "2026-11-02" }, gesehen: ["aw-001"], eigene: [{ id: "ki-abc-0001", sorte: "witz", vorne: "Was sagt der Teebeutel zur Tasse?", hinten: "Ohne dich zieh ich mich nicht an." }], ki: { tag: "2026-11-02", n: 1 } });
    a.write(RT, { ...RT_LEER, aktuell: { id: "ra-001", geloest: true }, gesehen: ["ra-001"], eigene: [{ id: "ki-abc-0002", sorte: "raetsel", vorne: "Was fliegt ohne Flügel über das Wattenmeer?", hinten: "Der **Wind**." }] });
    runde();
    expect(b.wt()).toMatchObject({ aktuell: null, gesehen: ["aw-001"], eigene: [{ id: "ki-abc-0001" }] });
    expect(b.wt().ki).toBeUndefined();
    expect(b.rt()).toMatchObject({ aktuell: null, gesehen: ["ra-001"], eigene: [{ id: "ki-abc-0002" }] });
    expect(a.wt().aktuell).toEqual({ id: "aw-001", tag: "2026-11-02" });
  });
});

describe("Sicherung von v0.156 (Wundertüte v1)", () => {
  it("lässt sich einspielen; Gezeigtes zählt als gesehen, die gezeigten Rätsel übernimmt der neue Bereich", async () => {
    const storage = memoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    const backup = parseBackup(readFileSync(new URL("../fixtures/sicherung-v0.156-wundertuete.json", import.meta.url), "utf8"))!;
    expect(backup.version).toBe("0.156.0");
    restoreBackup(backup, storage);
    const { createLocalStore } = await import("@/lib/core/localStore");
    const stand = createLocalStore(WT, migrateWt).load()!;
    expect(stand).toEqual({ version: 2, aktuell: null, gesehen: ["aw-001", "aw-002", "pl-001", "ra-001", "ra-004", "ti-001"], eigene: [] });
    expect(JSON.parse(storage.getItem(WT)!).version).toBe(2);
    const { raetselStart } = await import("@/lib/raetsel/auswahl");
    expect(raetselStart(stand.gesehen).gesehen).toEqual(["ra-001", "ra-004"]);
    delete (globalThis as { window?: unknown }).window;
  });
});
