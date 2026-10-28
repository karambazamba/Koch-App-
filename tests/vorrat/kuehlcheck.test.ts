// Kurz-Check „Im Haus“ (Tafel 102, Punkt 3): Sonntag ab 17 Uhr einmal in der
// Jetzt-Karte, zählt als der eine Hinweis des Tages (Regeln von „Mia denkt
// mit“: Nacht, Pause, Ruhe, Beispiel-Tag, „Ruhig“ = kein Check), nur mit
// Baustein und Sachen im Haus, einmal pro Woche. Seite: antippen = weg,
// „Fertig · 3 weg“ räumt genau die markierten weg (aufgebraucht), Rückgängig,
// „Heute nicht“ ändert nichts.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { placeFor } from "@/lib/vorrat/haltbar";
import type { PantryItem } from "@/lib/vorrat/pantry";
import { checkSachen, fertigText, kuehlCheckFaellig, kuehlCheckWoche, kuehlThema, migrateKuehlCheck, sonntagVon, wegUmschalten, KUEHLCHECK_TITEL, KUEHLCHECK_DETAIL } from "@/lib/vorrat/kuehlcheck";
import { heutigeKarte, type DenktKarte, type Umfeld } from "@/lib/mia/denktmit/auswahl";
import { EMPTY_DENKT, type DenktState } from "@/lib/mia/denktmit/store";
import { jetztTopics, TITLE_MAX } from "@/lib/heute/jetztTopics";
import { topicIcon } from "@/lib/heute/deinTag";
import { bereichVon } from "@/lib/core/leiste";
import { pageLabel } from "@/lib/core/pageLabel";
import { STORAGE } from "@/lib/core/storage";
import { at, atFresh, fakeWindow, jetztInput } from "../helpers";

const SO = "2026-11-01";
const SA = "2026-10-31";
const H17 = 17 * 60;
const item = (name: string, extra: Partial<PantryItem> = {}): PantryItem => ({ id: name, name, addedAt: "2026-10-30", place: placeFor(name), usedAt: null, ...extra });

const faellig = (o: Partial<Parameters<typeof kuehlCheckFaellig>[0]> = {}) => kuehlCheckFaellig({ today: SO, minutes: H17, vorratOn: true, sachen: 3, erledigt: null, ...o });
const kuehl = (woche = SO): DenktKarte => ({ art: "kuehlcheck", key: `kuehlcheck:${woche}`, satz: KUEHLCHECK_TITEL, woche });
const umfeld = (o: Partial<Umfeld> = {}): Umfeld => ({ today: SO, hour: 17, pause: false, ruhe: false, demo: false, ...o });
const state = (o: Partial<DenktState> = {}): DenktState => ({ ...EMPTY_DENKT, ...o });

beforeEach(async () => {
  at(`${SO}T17:00`);
  vi.resetModules();
  await atFresh(`${SO}T17:00`);
  fakeWindow();
});

describe("Wann der Check kommt", () => {
  it("Sonntag ab 17 Uhr, sonst nicht", () => {
    expect(kuehlCheckWoche(SO, H17 - 1)).toBeNull();
    expect(kuehlCheckWoche(SO, H17)).toBe(SO);
    expect(kuehlCheckWoche(SO, 21 * 60 + 59)).toBe(SO);
    expect(kuehlCheckWoche(SA, 18 * 60)).toBeNull();
    expect(kuehlCheckWoche("2026-11-02", 18 * 60)).toBeNull();
    expect(faellig({ minutes: H17 - 1 })).toBeNull();
    expect(faellig()).toBe(SO);
    expect(faellig({ today: SA })).toBeNull();
  });

  it("nur mit Baustein, nur mit Sachen im Haus, einmal pro Woche", () => {
    expect(faellig({ vorratOn: false })).toBeNull();
    expect(faellig({ sachen: 0 })).toBeNull();
    expect(faellig({ erledigt: SO })).toBeNull();
    // Letzte Woche erledigt: diese Woche wieder
    expect(faellig({ erledigt: "2026-10-25" })).toBe(SO);
  });

  it("Ruhe-Regeln: nie 22–7 Uhr, nicht in Pause oder Ruhe, nicht im Beispiel-Tag", () => {
    expect(heutigeKarte([kuehl()], state(), umfeld())?.key).toBe(`kuehlcheck:${SO}`);
    expect(heutigeKarte([kuehl()], state(), umfeld({ hour: 22 }))).toBeNull();
    expect(heutigeKarte([kuehl()], state(), umfeld({ hour: 6 }))).toBeNull();
    expect(heutigeKarte([kuehl()], state(), umfeld({ pause: true }))).toBeNull();
    expect(heutigeKarte([kuehl()], state(), umfeld({ ruhe: true }))).toBeNull();
    expect(heutigeKarte([kuehl()], state(), umfeld({ demo: true }))).toBeNull();
  });

  it("Regler „Ruhig“ = kein Check; „Normal“ und „Gesprächig“ schon", () => {
    expect(heutigeKarte([kuehl()], state({ level: "ruhig" }), umfeld())).toBeNull();
    expect(heutigeKarte([kuehl()], state({ level: "normal" }), umfeld())).not.toBeNull();
    expect(heutigeKarte([kuehl()], state({ level: "gespraechig" }), umfeld())).not.toBeNull();
  });

  it("zählt als der eine Hinweis des Tages: stand schon eine Karte, kein Check – steht der Check, keine weitere Karte", () => {
    const andere = { art: "mitdenken", key: "waesche:x", satz: "x" } as DenktKarte;
    // Heute stand schon eine Mitdenken-Karte → kein Check
    expect(heutigeKarte([kuehl(), andere], state({ tage: { [SO]: ["waesche:x"] } }), umfeld())?.key).toBe("waesche:x");
    expect(heutigeKarte([kuehl()], state({ tage: { [SO]: ["waesche:x"] } }), umfeld())).toBeNull();
    // Der Check stand (gezählt): er bleibt, eine andere Karte kommt nicht dazu
    const gezaehlt = state({ tage: { [SO]: [`kuehlcheck:${SO}`] } });
    expect(heutigeKarte([kuehl(), andere], gezaehlt, umfeld())?.key).toBe(`kuehlcheck:${SO}`);
    expect(heutigeKarte([andere], gezaehlt, umfeld())).toBeNull();
    // Gesprächig: bis zwei
    expect(heutigeKarte([andere], state({ level: "gespraechig", tage: { [SO]: [`kuehlcheck:${SO}`] } }), umfeld())?.key).toBe("waesche:x");
  });

  it("zählt erst, wenn er in der Jetzt-Karte steht (hinweisGezaehlt)", async () => {
    const { hinweisGezaehlt, loadDenkt } = await import("@/lib/mia/denktmit/store");
    hinweisGezaehlt(`kuehlcheck:${SO}`, SO);
    expect(heutigeKarte([{ art: "mitdenken", key: "b", satz: "b" } as DenktKarte], loadDenkt(), umfeld())).toBeNull();
  });
});

describe("In der Jetzt-Karte", () => {
  const input = (minutes: number, extra = {}) => jetztInput(minutes, { today: SO, tomorrow: { label: "Morgen · Mo", date: "2026-11-02", items: [] }, calm: true, ...extra });

  it("„Kurzer Kühlschrank-Check?“ · „20 Sekunden.“ öffnet die Seite, mit Kühlschrank-Symbol", () => {
    const t = jetztTopics(input(H17 + 30, { kuehlCheck: SO, upcoming: [{ key: "x", title: "Kino", time: "20:00", date: SO }] })).find((x) => x.kind === "kuehlcheck");
    expect(t).toMatchObject({ title: "Kurzer Kühlschrank-Check?", detail: "20 Sekunden.", target: { href: "/vorrat/check" }, button: "Öffnen" });
    expect(t!.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(topicIcon("kuehlcheck")).toBe("Refrigerator");
  });

  it("abends (nichts kommt mehr): steht vor „Morgen ist ruhig.“", () => {
    const topics = jetztTopics(input(19 * 60 + 30, { kuehlCheck: SO, evening: true }));
    expect(topics.map((t) => t.kind)).toEqual(["kuehlcheck"]);
    expect(jetztTopics(input(19 * 60 + 30, { evening: true }))[0].kind).toBe("abend");
  });

  it("nachts nie, ohne Woche nie", () => {
    expect(jetztTopics(input(22 * 60 + 5, { kuehlCheck: SO })).some((t) => t.kind === "kuehlcheck")).toBe(false);
    expect(jetztTopics(input(H17 + 30, { upcoming: [{ key: "x", title: "Kino", time: "20:00", date: SO }] })).some((t) => t.kind === "kuehlcheck")).toBe(false);
  });

  it("Text ohne Druck, ohne Emoji", () => {
    expect(`${KUEHLCHECK_TITEL} ${KUEHLCHECK_DETAIL}`).not.toMatch(/fehlt|offen|überfällig|musst|solltest|vergiss/i);
    expect(kuehlThema(SO).id).toBe(`kuehlcheck:${SO}`);
  });
});

describe("Seite /vorrat/check", () => {
  it("gehört zu „Im Haus“ (Bereich Heute wie /vorrat), Zurück-Text „Kurz-Check“", () => {
    expect(bereichVon("/vorrat/check")).toBe(bereichVon("/vorrat"));
    expect(pageLabel("/vorrat/check")).toBe("Kurz-Check");
  });

  it("alle Sachen, die da sind (ohne Aufgebrauchtes und Grundsachen), Bald aufbrauchen zuerst", () => {
    const items = [item("Milch"), item("Nudeln"), item("Salz"), item("Käse", { usedAt: SO }), item("Hack", { addedAt: "2026-10-30" })];
    const names = checkSachen(items, SO).map((p) => p.name);
    expect(names).toContain("Milch");
    expect(names).toContain("Nudeln");
    expect(names).not.toContain("Salz");
    expect(names).not.toContain("Käse");
    expect(names[0]).toBe("Hack");
  });

  it("Antippen schaltet weg ↔ da, Knopf „Fertig“ bzw. „Fertig · 3 weg“", () => {
    let weg: string[] = [];
    expect(fertigText(weg.length)).toBe("Fertig");
    for (const id of ["a", "b", "c"]) weg = wegUmschalten(weg, id);
    expect(fertigText(weg.length)).toBe("Fertig · 3 weg");
    weg = wegUmschalten(weg, "b");
    expect(weg).toEqual(["a", "c"]);
    expect(fertigText(weg.length)).toBe("Fertig · 2 weg");
  });

  it("Fertig: genau die markierten sind aufgebraucht, der Rest bleibt; Rückgängig holt sie zurück", async () => {
    const p = await import("@/lib/vorrat/pantry");
    const k = await import("@/lib/vorrat/kuehlcheck");
    p.replacePantry([item("Milch"), item("Joghurt"), item("Nudeln"), item("Eier")]);
    const { names, undo } = k.wegRaeumen(["Milch", "Eier", "gibtsnicht"], SO);
    expect(names).toEqual(["Milch", "Eier"]);
    expect(p.loadPantry().map((i) => i.name).sort()).toEqual(["Joghurt", "Nudeln"]);
    expect(p.loadPantryAll().filter((i) => i.usedAt === SO).map((i) => i.name)).toEqual(["Milch", "Eier"]);
    undo();
    expect(p.loadPantry().map((i) => i.name).sort()).toEqual(["Eier", "Joghurt", "Milch", "Nudeln"]);
  });

  it("nichts markiert: nichts ändert sich", async () => {
    const p = await import("@/lib/vorrat/pantry");
    const k = await import("@/lib/vorrat/kuehlcheck");
    p.replacePantry([item("Milch")]);
    const before = localStorage.getItem("wasgibts.vorrat");
    expect(k.wegRaeumen([], SO).names).toEqual([]);
    expect(localStorage.getItem("wasgibts.vorrat")).toBe(before);
  });

  it("Fertig bzw. „Heute nicht“ legt die Woche weg (Sonntag; an anderen Tagen der letzte Sonntag)", async () => {
    const k = await import("@/lib/vorrat/kuehlcheck");
    expect(k.loadKuehlCheck()).toBeNull();
    k.kuehlCheckErledigt(sonntagVon(SO));
    expect(k.loadKuehlCheck()).toBe(SO);
    expect(faellig({ erledigt: k.loadKuehlCheck() })).toBeNull();
    expect(sonntagVon(SA)).toBe("2026-10-25");
    expect(sonntagVon("2026-11-02")).toBe(SO);
  });
});

describe("Speicher", () => {
  it("im Verzeichnis (v1, nicht in der Sicherung), Migration robust", () => {
    const def = STORAGE.find((s) => s.key === "wasgibts.kuehlcheck");
    expect(def).toMatchObject({ version: 1, backup: false, area: "local" });
    expect(migrateKuehlCheck({ version: 1, woche: SO })).toEqual({ version: 1, woche: SO });
    expect(migrateKuehlCheck({ version: 1, woche: "Sonntag" })).toEqual({ version: 1, woche: null });
    expect(migrateKuehlCheck({ version: 2 })).toBeNull();
    expect(migrateKuehlCheck(null)).toBeNull();
  });
});
