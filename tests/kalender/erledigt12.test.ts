// A-043: Erledigte Aufgaben nur 12 Stunden. Abgehakt vor 11 h sichtbar, vor
// 13 h weg; „Erledigt ⌄“ zugeklappt, ohne Zahl, neueste oben; Häkchen
// antippen = wieder offen (dann bleibt sie); Serien: nur die Runde; Abgleich
// zwischen zwei Geräten über die Lösch-Markierung; Migration und alte
// Sicherung (Erledigtes ohne Zeitpunkt = alt, einmal still weg).
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, aufgabe, fakeWindow, memoryStorage } from "../helpers";
import { now, berlinInstant } from "@/lib/core/now";
import { sanitizeEntry, setDone, taskOverview, type Aufgabe, type CalendarEntry } from "@/lib/kalender/model";
import { abgehaktUm, istAbgelaufen, nochErledigt, ohneAbgelaufene, serienZeiten } from "@/lib/kalender/erledigt";
import { calendarContext } from "@/lib/begleitung/calendarTools";
import { contextText } from "@/lib/begleitung/prompt";
import { pruefHaushalt, PRUEF_HEUTE, PRUEF_UHR } from "@/lib/begleitung/pruefstand/haushalt";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { parseBackup, restoreBackup } from "@/lib/core/backup";
import { applyRemote, detectChanges, emptyState, markSent, type Io, type SyncState } from "@/lib/konten/sync/engine";
import type { CloudDoc } from "@/lib/konten/sync/docs";

const HEUTE = "2026-10-28";
const src = (p: string) => readFileSync(p, "utf8");
const titles = (items: { title: string }[]) => items.map((i) => i.title);
const ms = () => now().getTime();
const NOPRESSURE = /überfällig|verpasst|fehlt|offen|noch zu erledigen|von gestern/i;

/** Abhaken wie in der App: Zeitpunkt = jetzt */
const abhaken = (list: CalendarEntry[], e: CalendarEntry, date = HEUTE) => setDone(list, { entry: e, date }, true, now().toISOString());

beforeEach(() => at("2026-10-28T08:00"));

describe("Regel: höchstens 12 Stunden unter „Erledigt“", () => {
  it("abgehakt vor 11 h sichtbar, vor 13 h weg", () => {
    const a = aufgabe({ title: "Müll rausbringen", date: HEUTE });
    const list = abhaken([a], a);
    expect((list[0] as Aufgabe).data.doneAt).toBe("2026-10-28T06:00:00.000Z");
    at("2026-10-28T19:00"); // 11 h später
    expect(titles(taskOverview(list, HEUTE).erledigt)).toEqual(["Müll rausbringen"]);
    expect(ohneAbgelaufene(list, ms())).toBe(list);
    at("2026-10-28T21:00"); // 13 h später
    expect(taskOverview(list, HEUTE).erledigt).toEqual([]);
    expect(ohneAbgelaufene(list, ms())).toEqual([]);
  });

  it("über Mitternacht: gestern 22 Uhr abgehakt steht heute früh noch da", () => {
    at("2026-10-27T22:00");
    const a = aufgabe({ title: "Spülmaschine", date: "2026-10-27" });
    const list = abhaken([a], a, "2026-10-27");
    at("2026-10-28T07:00");
    expect(titles(taskOverview(list, HEUTE).erledigt)).toEqual(["Spülmaschine"]);
    at("2026-10-28T10:30");
    expect(taskOverview(list, HEUTE).erledigt).toEqual([]);
  });

  it("neueste oben, ohne Zahl", () => {
    let list = [aufgabe({ title: "Erst", date: HEUTE }), aufgabe({ title: "Dann", date: HEUTE }), aufgabe({ title: "Zuletzt", date: HEUTE })];
    for (const [i, e] of [...list].entries()) {
      at(`2026-10-28T${String(8 + i).padStart(2, "0")}:00`);
      list = abhaken(list, e);
    }
    expect(titles(taskOverview(list, HEUTE).erledigt)).toEqual(["Zuletzt", "Dann", "Erst"]);
  });

  it("Wieder offen: Häkchen antippen löscht den Zeitpunkt – dann wird nichts mehr gelöscht", () => {
    const a = aufgabe({ title: "Steuer", date: HEUTE });
    let list = abhaken([a], a);
    const done = taskOverview(list, HEUTE).erledigt[0];
    list = setDone(list, done, false, now().toISOString());
    expect((list[0] as Aufgabe).data.doneOn).toBeNull();
    expect((list[0] as Aufgabe).data.doneAt).toBeUndefined();
    at("2026-10-29T09:00");
    expect(ohneAbgelaufene(list, ms())).toBe(list);
    expect(titles(taskOverview(list, "2026-10-29").heute)).toEqual(["Steuer"]);
  });

  it("gilt für jede Aufgabe gleich – Familie, Arbeit, abgegeben", () => {
    let list = [aufgabe({ title: "Familie", date: HEUTE }), aufgabe({ title: "Arbeit", date: HEUTE }, "arbeit"), aufgabe({ title: "Von Lisa", date: HEUTE, fuer: "u-felix" })];
    for (const e of [...list]) list = abhaken(list, e);
    at("2026-10-28T21:00");
    expect(list.every((e) => istAbgelaufen(e, ms()))).toBe(true);
    expect(ohneAbgelaufene(list, ms())).toEqual([]);
  });

  it("ohne Zeitpunkt (vor dem Update abgehakt) = alt; offene und Termine bleiben", () => {
    const alt = aufgabe({ title: "Alt", doneOn: HEUTE });
    const offen = aufgabe({ title: "Offen" });
    expect(abgehaktUm((alt as Aufgabe).data)).toBeNull();
    expect(nochErledigt(null, ms())).toBe(false);
    expect(ohneAbgelaufene([alt, offen], ms())).toEqual([offen]);
    expect(taskOverview([alt, offen], HEUTE).erledigt).toEqual([]);
  });
});

describe("Serien: nur die erledigte Runde verschwindet", () => {
  it("Runde nach 12 h aus „Erledigt“, die Reihe bleibt (nächste Runde morgen)", () => {
    const s = aufgabe({ title: "Blumen gießen", date: "2026-10-20", repeat: { kind: "taeglich" } });
    const list = abhaken([s], s);
    const d = (list[0] as Aufgabe).data;
    expect(d.doneDates).toEqual([HEUTE]);
    expect(d.doneTimes).toEqual({ [HEUTE]: "2026-10-28T06:00:00.000Z" });
    expect(titles(taskOverview(list, HEUTE).erledigt)).toEqual(["Blumen gießen"]);
    at("2026-10-28T21:00");
    const g = taskOverview(list, HEUTE);
    expect(g.erledigt).toEqual([]);
    expect(g.geplant.map((i) => i.date)).toEqual(["2026-10-29"]);
    expect(ohneAbgelaufene(list, ms())).toBe(list);
  });

  it("Abhak-Zeiten bleiben klein; wieder öffnen nimmt die Runde raus", () => {
    expect(serienZeiten({ "2026-10-20": "2026-10-20T06:00:00.000Z" }, HEUTE, true, "2026-10-28T06:00:00.000Z")).toEqual({ [HEUTE]: "2026-10-28T06:00:00.000Z" });
    expect(serienZeiten({ [HEUTE]: "2026-10-28T06:00:00.000Z" }, HEUTE, false, "2026-10-28T07:00:00.000Z")).toBeUndefined();
  });
});

describe("Laden und Speichern", () => {
  it("sanitizeEntry behält den Zeitpunkt, wirft Kaputtes weg", () => {
    const a = sanitizeEntry({ ...aufgabe({ title: "A", doneOn: HEUTE }), data: { title: "A", reminder: "aus", doneOn: HEUTE, doneAt: "2026-10-28T06:00:00.000Z" } }) as Aufgabe;
    expect(a.data.doneAt).toBe("2026-10-28T06:00:00.000Z");
    const kaputt = sanitizeEntry({ ...aufgabe({ title: "B" }), data: { title: "B", reminder: "aus", doneOn: HEUTE, doneAt: "gestern" } }) as Aufgabe;
    expect(kaputt.data).not.toHaveProperty("doneAt");
    const offen = sanitizeEntry({ ...aufgabe({ title: "C" }), data: { title: "C", reminder: "aus", doneOn: null, doneAt: "2026-10-28T06:00:00.000Z" } }) as Aufgabe;
    expect(offen.data).not.toHaveProperty("doneAt");
    const serie = sanitizeEntry({ ...aufgabe({ title: "D" }), data: { title: "D", reminder: "aus", repeat: { kind: "taeglich" }, doneDates: [HEUTE], doneTimes: { [HEUTE]: "2026-10-28T06:00:00.000Z", kaputt: "x" } } }) as Aufgabe;
    expect(serie.data.doneTimes).toEqual({ [HEUTE]: "2026-10-28T06:00:00.000Z" });
  });

  it("Migration: Erledigtes ohne Zeitpunkt beim ersten Start einmal still weg, danach nichts mehr (idempotent)", async () => {
    vi.resetModules();
    const win = fakeWindow({
      "wasgibts.eintraege": JSON.stringify({ version: 3, migratedTermine: true, seenReminders: [], entries: [aufgabe({ title: "Alt erledigt", doneOn: "2026-10-20" }), aufgabe({ title: "Offen" })] }),
    });
    await atFresh("2026-10-28T08:00");
    const store = await import("@/lib/kalender/store");
    expect(store.erledigteAufraeumen()).toBe(1);
    expect(titles(store.loadEntries().map((e) => e.data))).toEqual(["Offen"]);
    const before = win.localStorage.getItem("wasgibts.eintraege");
    expect(store.erledigteAufraeumen()).toBe(0);
    expect(win.localStorage.getItem("wasgibts.eintraege")).toBe(before);
  });

  it("alte Sicherung (v0.144, ohne Zeitpunkte) lädt; Erledigtes geht beim Aufräumen still, Offenes, Serie und Termin bleiben", async () => {
    vi.resetModules();
    const storage = memoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
    restoreBackup(parseBackup(src("tests/fixtures/sicherung-v0.144-erledigt.json"))!, storage);
    await atFresh("2026-10-28T08:00");
    const store = await import("@/lib/kalender/store");
    expect(store.loadEntries()).toHaveLength(5);
    expect(store.erledigteAufraeumen()).toBe(2);
    expect(store.loadEntries().map((e) => e.id).sort()).toEqual(["a-offen", "a-serie", "t1"]);
    // Serie: die alte Runde (ohne Zeitpunkt) steht nicht unter „Erledigt“
    expect(taskOverview(store.loadEntries(), "2026-10-27", "2026-10-27", ms()).erledigt).toEqual([]);
  });
});

// --- Abgleich zwischen zwei Geräten -------------------------------------------------

const T0 = "2026-10-28T06:00:00.000Z";
const KEY = "wasgibts.eintraege";

function device(entries: CalendarEntry[]) {
  const data = new Map<string, Record<string, unknown>>([[KEY, { version: 3, entries: structuredClone(entries), migratedTermine: true, seenReminders: [] }]]);
  let clock = Date.parse(T0);
  const io: Io & { tick(min: number): void; entries(): CalendarEntry[]; change(fn: (e: CalendarEntry[], stamp: string) => CalendarEntry[]): void; jetzt(): number } = {
    read: (key) => (data.has(key) ? structuredClone(data.get(key)!) : null),
    write: (key, value) => void data.set(key, structuredClone(value)),
    now: () => new Date(clock).toISOString(),
    tick: (min) => void (clock += min * 60_000),
    entries: () => (data.get(KEY)!.entries as CalendarEntry[]) ?? [],
    change: (fn) => void data.set(KEY, { ...data.get(KEY)!, entries: fn(io.entries(), io.now()) }),
    jetzt: () => clock,
  };
  return io;
}

function server() {
  const rows = new Map<string, CloudDoc>();
  let rev = 0;
  return {
    push(docs: CloudDoc[]) {
      for (const d of docs) {
        const old = rows.get(d.id);
        if (old && Date.parse(old.geaendert) >= Date.parse(d.geaendert)) continue;
        rows.set(d.id, { ...d, besitzer: old?.besitzer ?? "u1", erstellt: old?.erstellt ?? d.erstellt, rev: ++rev });
      }
    },
    pull: (since: number) => [...rows.values()].filter((d) => (d.rev ?? 0) > since).sort((a, b) => a.rev! - b.rev!),
    rows,
  };
}

function cycle(state: SyncState, io: Io, srv: ReturnType<typeof server>): SyncState {
  let s = detectChanges(state, io);
  srv.push(s.queue);
  s = markSent(s, s.queue);
  return applyRemote(s, io, srv.pull(s.cursor)).state;
}

/** Wie `erledigteAufraeumen` auf dem Gerät */
const aufraeumen = (io: ReturnType<typeof device>) => io.change((list) => ohneAbgelaufene(list, io.jetzt()));

describe("Abgleich: alle Geräte gleich", () => {
  const start = () => {
    const a = aufgabe({ title: "Müll", date: HEUTE }, { id: "a-muell" });
    const A = device([a]);
    const B = device([]);
    const srv = server();
    let sa = cycle({ ...emptyState("h1"), takeover: "fertig" }, A, srv);
    let sb = cycle({ ...emptyState("h1"), takeover: "fertig" }, B, srv);
    // A hakt ab → B sieht es erledigt
    A.change((list, stamp) => setDone(list, { entry: list[0], date: HEUTE }, true, stamp));
    sa = cycle(sa, A, srv);
    sb = cycle(sb, B, srv);
    return { A, B, srv, sa, sb };
  };

  it("nach 12 h räumt A auf → Lösch-Markierung → bei B ebenfalls weg", () => {
    const st = start();
    const { A, B, srv } = st;
    let { sa, sb } = st;
    expect((B.entries()[0] as Aufgabe).data.doneAt).toBe(T0);
    A.tick(13 * 60);
    aufraeumen(A);
    expect(A.entries()).toEqual([]);
    sa = cycle(sa, A, srv);
    expect(srv.rows.get("a-muell")?.geloescht).toBe(true);
    sb = cycle(sb, B, srv);
    expect(B.entries()).toEqual([]);
    // B räumt danach auch auf: nichts mehr zu tun, keine neue Änderung
    B.tick(13 * 60);
    aufraeumen(B);
    expect(detectChanges(sb, B).queue).toEqual([]);
    void sa;
  });

  it("beide räumen gleichzeitig auf: idempotent, beide leer, gelöscht bleibt gelöscht", () => {
    const st = start();
    const { A, B, srv } = st;
    let { sa, sb } = st;
    A.tick(13 * 60);
    B.tick(13 * 60 + 1);
    aufraeumen(A);
    aufraeumen(B);
    sa = cycle(sa, A, srv);
    sb = cycle(sb, B, srv);
    sa = cycle(sa, A, srv);
    expect(A.entries()).toEqual([]);
    expect(B.entries()).toEqual([]);
    expect(srv.rows.get("a-muell")?.geloescht).toBe(true);
    expect(detectChanges(sa, A).queue).toEqual([]);
    expect(detectChanges(sb, B).queue).toEqual([]);
  });

  it("B öffnet sie vor Ablauf wieder → A löscht nichts", () => {
    const st = start();
    const { A, B, srv } = st;
    let { sa, sb } = st;
    B.tick(60);
    B.change((list, stamp) => setDone(list, { entry: list[0], date: HEUTE }, false, stamp));
    sb = cycle(sb, B, srv);
    sa = cycle(sa, A, srv);
    A.tick(13 * 60);
    aufraeumen(A);
    expect(titles(A.entries().map((e) => e.data))).toEqual(["Müll"]);
    expect((A.entries()[0] as Aufgabe).data.doneOn).toBeNull();
    void sa;
    void sb;
  });
});

// --- Seite und Kachel ---------------------------------------------------------------

describe("Aufgaben-Seite: „Erledigt ⌄“", () => {
  const seite = src("src/components/kalender/TasksView.tsx");

  it("zugeklappt als Standard, ohne Anzahl, Pfeil nach unten", () => {
    expect(seite).toMatch(/const \[open, setOpen\] = useState<string\[\]>\(\[\]\)/);
    expect(seite).toMatch(/<Klapp label="Erledigt" runter open=\{open\.includes\("erledigt"\)\}/);
    expect(seite).toMatch(/runter \? \(open \? ChevronUp : ChevronDown\)/);
    expect(seite).not.toMatch(/Erledigt · \$\{|done\.length\}/);
  });

  it("Häkchen in „Erledigt“ antippen = wieder offen (ohne Meldung); Abhaken bleibt weich", () => {
    expect(seite).toMatch(/if \(it\.done\) \{\s*buzz\(\);\s*return act\(\(list, stamp\) => setDone\(list, it, false, stamp\)\);/);
    expect(seite).toMatch(/useLeaving\(/);
  });

  it("aufgeräumt wird still im Layout (ohne „Gelöscht · Rückgängig“)", () => {
    const hook = src("src/components/kalender/useErledigtAufraeumen.ts");
    expect(hook).toMatch(/erledigteAufraeumen\(\)/);
    expect(hook).not.toMatch(/showToast|Gelöscht/);
    expect(src("src/components/begleitung/KitchenHelper.tsx")).toMatch(/useErledigtAufraeumen\(\)/);
  });
});

// --- Mia ----------------------------------------------------------------------------

describe("Mia: „Was hab ich heute geschafft?“ nur die letzten 12 Stunden", () => {
  it("jetzt auf dem Server aus Datum + Uhrzeit (Berlin)", () => {
    expect(new Date(berlinInstant("2026-10-21", "10:30")).toISOString()).toBe("2026-10-21T08:30:00.000Z");
    expect(new Date(berlinInstant("2026-11-02", "10:30")).toISOString()).toBe("2026-11-02T09:30:00.000Z");
  });

  it("Kontext nennt Müll (vor 2 h), nicht Fenster (vor 16 h)", () => {
    const data = pruefHaushalt(["geschafft"]);
    const jetzt = berlinInstant(PRUEF_HEUTE, PRUEF_UHR);
    const ctx = calendarContext(data.entries ?? [], PRUEF_HEUTE, false, false, jetzt);
    const line = ctx.split("\n").find((l) => l.startsWith("Geschafft in den letzten 12 Stunden"))!;
    expect(line).toMatch(/Müll rausbringen/);
    expect(ctx).not.toMatch(/Fenster/);
    expect(line).not.toMatch(NOPRESSURE);
    const voll = contextText(data, PRUEF_HEUTE, { aktuell: "2026-10-19", naechste: "2026-10-26" }, 0, { clock: PRUEF_UHR });
    expect(voll).toMatch(/Geschafft in den letzten 12 Stunden[^\n]*Müll rausbringen/);
    expect(voll).not.toMatch(/Fenster/);
  });

  it("Prüfstand-Satz mit Ausgangslage; Bewertung prüft genannt / nie genannt", () => {
    const satz = PRUEFSAETZE.find((s) => s.text === "Was hab ich heute geschafft?")!;
    expect(satz).toMatchObject({ ops: [], lage: ["geschafft"], nennt: "Müll", nenntNie: "Fenster" });
    expect(bewerte(satz, { reply: "Müll ist raus. Reicht für heute.", ops: [] }, 900).ok).toBe(true);
    expect(bewerte(satz, { reply: "Müll und Fenster.", ops: [] }, 900).gruende).toContain("nennt Fenster (zu alt)");
    expect(bewerte(satz, { reply: "Einiges.", ops: [] }, 900).gruende).toContain("nennt Müll nicht");
  });

  it("App schickt Mia nur Erledigtes der letzten 12 Stunden", () => {
    const client = src("src/lib/begleitung/client.ts");
    expect(client).toMatch(/return !istAbgelaufen\(e, now\(\)\.getTime\(\)\)/);
  });
});
