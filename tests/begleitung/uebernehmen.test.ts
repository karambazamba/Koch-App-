import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import type { ChangeOp } from "@/lib/begleitung/ops";
import { aufgabe, daten, haushalt, HEUTE, termin, WOCHEN } from "./werkzeugKontext";

// Übernehmen und Rückgängig (commitOps): mit frisch geladenen Speichern,
// geprüft über die Lade-Funktionen der Bereiche.

let local: Storage;
const mods = async () => ({
  client: await import("@/lib/begleitung/client"),
  meal: await import("@/lib/essen/mealPlan"),
  home: await import("@/lib/core/homeLayout"),
  features: await import("@/lib/core/features"),
  pantry: await import("@/lib/vorrat/pantry"),
  wishes: await import("@/lib/essen/wishes"),
  pins: await import("@/lib/pinnwand/store"),
  sport: await import("@/lib/sport/store"),
  jetzt: await import("@/lib/heute/jetztStore"),
  speech: await import("@/lib/begleitung/speech"),
  shopping: await import("@/lib/einkauf/shoppingList"),
  entries: await import("@/lib/kalender/store"),
  notes: await import("@/lib/notizen/store"),
  profile: await import("@/lib/einstellungen/profileStore"),
  undo: await import("@/lib/core/undo"),
});
let m: Awaited<ReturnType<typeof mods>>;

beforeEach(async () => {
  // Familie, die Wochenplan, Sport und Notizen schon nutzt (Launch 1.0: behält sie); Im Haus ist aus
  local = memoryStorage({ "wasgibts.funktionen": JSON.stringify({ version: 3, on: ["wochenplan", "sport", "notizen"], launch: true }) });
  (globalThis as { window?: unknown }).window = {
    localStorage: local,
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    location: { search: "", pathname: "/", href: "http://localhost/" },
  };
  vi.resetModules();
  (await import("@/lib/core/now")).setNowForTests(new Date("2026-10-21T09:00:00+02:00"));
  m = await mods();
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

const alle = (ops: ChangeOp[]) => new Set(ops.map((o) => o.id));
const slot = (weekday: string) => ({ weekStart: WOCHEN.aktuell, weekday });
const tile = (id: string) => m.home.loadHomeTiles().find((t) => t.id === id);

describe("commitOps", () => {
  it("Gericht + Einkauf: speichert, schaltet den Wochenplan frei, sagt wo es steht – Rückgängig stellt alles wieder her", () => {
    const current = daten({ home: m.home.DEFAULT_HOME.map((t) => (t.id === "essen" ? { ...t, visible: false } : t)) });
    const ops: ChangeOp[] = [
      { id: "1", type: "set_meal", slot: slot("Mittwoch"), dish: { kind: "text", title: "Ofengemüse", category: "vegetarisch" } },
      { id: "2", type: "add_shopping", weekStart: WOCHEN.aktuell, name: "Feta", amount: "200 g", section: "kuehlregal", day: "Mittwoch", shop: "REWE" },
      { id: "3", type: "add_shopping", weekStart: WOCHEN.aktuell, name: "Brot", amount: "", section: "brot" },
    ];
    const r = m.client.commitOps(current, ops, alle(ops), "Heute Ofengemüse");
    expect(r.notes).toEqual(["Dein Wochenplan steht rechts unter Essen.", "Einkaufsliste: 2 Sachen für die Woche, davon 1 für heute."]);
    expect(m.meal.loadMealPlans()[WOCHEN.aktuell]).toBeTruthy();
    expect(m.features.featureOn("wochenplan")).toBe(true);
    expect(tile("essen")?.visible).toBe(true);
    expect(m.shopping.loadShoppingSettings().itemShops.feta).toBe("REWE");
    r.undo();
    expect(m.meal.loadMealPlans()[WOCHEN.aktuell] ?? {}).toEqual({});
    expect(m.shopping.loadShoppingSettings().itemShops.feta).toBeUndefined();
  });

  it("Mehreres auf einmal: Übersicht gruppiert, „Alles rückgängig“ nimmt alles dieser Antwort zurück", async () => {
    const { doneGroups } = await import("@/lib/begleitung/uebersicht");
    const ops: ChangeOp[] = [
      { id: "1", type: "add_shopping", weekStart: WOCHEN.aktuell, name: "Milch", amount: "", section: "kuehlregal" },
      { id: "2", type: "upsert_entry", isNew: true, entry: aufgabe({ title: "Kita-Formular" }) },
      { id: "3", type: "upsert_entry", isNew: true, entry: termin({ title: "Zahnarzt", date: "2026-10-26", start: "10:00" }) },
      { id: "4", type: "add_shopping", weekStart: WOCHEN.aktuell, name: "Brot", amount: "", section: "brot" },
    ];
    expect(doneGroups(ops).map((g) => [g.label, g.items.join(" · ")])).toEqual([
      ["Termine", "Mo 10:00 Zahnarzt"],
      ["Aufgaben", "Kita-Formular"],
      ["Einkaufsliste", "Milch · Brot"],
    ]);
    const r = m.client.commitOps(daten({ entries: [] }), ops, alle(ops), "Pack Milch und Brot …");
    expect(m.entries.loadEntries().map((e) => e.data.title).sort()).toEqual(["Kita-Formular", "Zahnarzt"]);
    expect(local.getItem("wasgibts.einkaufsliste")).toMatch(/Milch[\s\S]*Brot/);
    r.undo();
    expect(m.entries.loadEntries()).toHaveLength(0);
    // Stammartikel (Standard) bleiben, die Woche ist wieder leer
    expect(JSON.stringify(JSON.parse(local.getItem("wasgibts.einkaufsliste") ?? "{}").weeks ?? {})).not.toMatch(/Milch|Brot/);
  });

  it("nur Ausgewähltes wird übernommen", () => {
    const ops: ChangeOp[] = [
      { id: "1", type: "set_meal", slot: slot("Montag"), dish: { kind: "text", title: "A", category: null } },
      { id: "2", type: "set_meal", slot: slot("Dienstag"), dish: { kind: "text", title: "B", category: null } },
    ];
    m.client.commitOps(daten(), ops, new Set(["2"]), "");
    const week = m.meal.loadMealPlans()[WOCHEN.aktuell];
    expect(Object.values(week).map((e) => (e as { title: string }).title)).toEqual(["B"]);
  });

  it("Spontan-Kochstil: neue Gerichte gelten als aus den Ideen gewählt", () => {
    const current = daten({ profile: { ...haushalt(), planStyle: "spontan" } });
    const ops: ChangeOp[] = [{ id: "1", type: "set_meal", slot: slot("Mittwoch"), dish: { kind: "text", title: "Pfannkuchen", category: "vegetarisch" } }];
    m.client.commitOps(current, ops, alle(ops), "");
    const entry = Object.values(m.meal.loadMealPlans()[WOCHEN.aktuell])[0] as { spontan?: boolean };
    expect(entry.spontan).toBe(true);
  });

  it("Wunsch, Rezept und Pinnwand landen in ihren Speichern und schalten frei – Im Haus (für 1.0 aus) nicht: „Kann ich noch nicht.“", () => {
    const ops: ChangeOp[] = [
      { id: "1", type: "add_pantry", name: "Chili", place: "tiefkuehler" },
      { id: "2", type: "add_wish", personId: "p-mathis", who: "Mathis", dish: "Pfannkuchen" },
      { id: "3", type: "add_recipe", recipe: { ref: "rezept-1", title: "Brot", category: "vegetarisch", servings: 2, prepMinutes: 60, ingredients: [], steps: ["Backen"], note: "" } },
      { id: "4", type: "add_pin", text: "Bin um 20 Uhr da" },
    ];
    const current = daten({ home: m.home.DEFAULT_HOME.map((t) => (t.id === "pinnwand" ? { ...t, visible: false } : t)) });
    const r = m.client.commitOps(current, ops, alle(ops), "");
    expect(r.notes).toEqual(["Eure Rezepte stehen jetzt rechts unter Essen.", "Die Pinnwand steht jetzt oben auf der Startseite.", "Kann ich noch nicht."]);
    expect(m.pantry.loadPantry()).toEqual([]);
    expect(m.features.featureOn("vorrat")).toBe(false);
    expect(m.wishes.loadWishes().map((w) => w.dish)).toEqual(["Pfannkuchen"]);
    expect(m.pins.loadPins().map((p) => p.data.text)).toEqual(["Bin um 20 Uhr da"]);
    expect(m.pins.loadPins()[0].data.author).toBe("Felix");
    expect(tile("pinnwand")?.visible).toBe(true);
    r.undo();
    expect(m.pantry.loadPantry()).toEqual([]);
    expect(m.wishes.loadWishes()).toEqual([]);
    expect(m.pins.loadPins()).toEqual([]);
  });

  it("Bausteine schalten, Notizen, Einträge, Schnellnotiz", () => {
    const ops: ChangeOp[] = [
      { id: "1", type: "set_feature", feature: "tipps", on: true },
      { id: "2", type: "set_feature", feature: "backen", on: false },
      { id: "3", type: "set_feature", feature: "gibtsnicht", on: true },
      { id: "4", type: "upsert_note", note: { id: "n1", typ: "notiz", raum: "familie", besitzer: "lokal", erstellt: "2026-10-21T07:00:00.000Z", geaendert: "2026-10-21T07:00:00.000Z", data: { title: "Idee", kind: "text", text: "x", pinned: false } } as never, isNew: true },
      { id: "5", type: "set_schnellnotiz", text: "Oma anrufen", change: "+ Oma anrufen" },
    ];
    const r = m.client.commitOps(daten(), ops, alle(ops), "");
    expect(r.notes).toEqual(["Tipps kommen ab jetzt ab und zu oben auf Heute.", "Notizen findest du in der Woche ganz unten unter „Notizen“."]);
    expect(m.features.featureOn("tipps")).toBe(true);
    expect(m.notes.loadNotes().map((n) => n.data.title)).toContain("Idee");
    r.undo();
    expect(m.features.featureOn("tipps")).toBe(false);
  });

  it("Sport und Jetzt-Karte – Rückgängig nimmt alles zurück (Fehler: Training blieb nach Rückgängig)", () => {
    m.speech.saveSpeechSettings({ voice: "Anna" });
    const ops: ChangeOp[] = [
      { id: "1", type: "add_training", training: { sport: "laufen", minutes: 30, date: HEUTE } },
      { id: "2", type: "set_sport_goal", goal: 4 },
      { id: "3", type: "set_jetzt", on: false },
    ];
    const r = m.client.commitOps(daten(), ops, alle(ops), "");
    expect(r.notes[0]).toBe("Die Sport-Kachel steht jetzt auf der Startseite.");
    expect(m.sport.loadSport()).toMatchObject({ goal: 4, trainings: [{ data: { sport: "laufen" } }] });
    expect(m.jetzt.loadJetzt().on).toBe(false);
    // Mia heißt fest Mia: die gewählte Stimme bleibt
    expect(m.speech.loadSpeechSettings().voice).toBe("Anna");
    r.undo();
    expect(m.sport.loadSport().trainings).toEqual([]);
    expect(m.jetzt.loadJetzt().on).toBe(true);
    expect(m.speech.loadSpeechSettings().voice).toBe("Anna");
  });

  it("„Mach das rückgängig“ nimmt die letzte Änderung zurück", () => {
    const first: ChangeOp[] = [{ id: "1", type: "add_wish", personId: "p-mathis", who: "Mathis", dish: "Pfannkuchen" }];
    m.client.commitOps(daten(), first, alle(first), "Mathis will Pfannkuchen");
    expect(m.wishes.loadWishes()).toHaveLength(1);
    const undo: ChangeOp[] = [{ id: "2", type: "undo_last" }];
    expect(m.client.commitOps(daten(), undo, alle(undo), "").notes).toEqual(["Zurückgenommen: „Mathis will Pfannkuchen“"]);
    expect(m.wishes.loadWishes()).toEqual([]);
    expect(m.client.commitOps(daten(), undo, alle(undo), "").notes).toEqual(["Da gibt’s gerade nichts zurückzunehmen."]);
  });

  it("Termine werden gespeichert, Sport-Termine bringen die Sport-Kachel", () => {
    const entry = { id: "e1", typ: "termin", raum: "familie", besitzer: "lokal", erstellt: "x", geaendert: "x", data: { title: "Laufen", date: "2026-10-22", start: "07:00", reminder: "30", label: "Sport" } } as never;
    const ops: ChangeOp[] = [{ id: "1", type: "upsert_entry", entry, isNew: true }];
    const r = m.client.commitOps(daten({ entries: [] }), ops, alle(ops), "");
    expect(r.notes).toContain("Die Sport-Kachel steht jetzt auf der Startseite.");
    expect(m.entries.loadEntries().map((e) => e.id)).toEqual(["e1"]);
    expect(m.undo.undoLast()).toBe("die letzte Änderung");
    expect(m.entries.loadEntries()).toEqual([]);
  });
});
