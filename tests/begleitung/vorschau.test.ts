import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { previewRows } from "@/lib/begleitung/preview";
import { applyOps, compactOps, findSlot, INSTANT_OP_TYPES, selectedOps, weekOf, type ChangeOp, type NewRecipe } from "@/lib/begleitung/ops";
import { createNote } from "@/lib/notizen/model";
import { aufgabe, daten, haushalt, HEUTE, kontext, rezept, rufe, termin, WOCHEN } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

const ws = WOCHEN.aktuell;
const slot = (weekday: string, weekStart = ws) => ({ weekStart, weekday });
const alle = (ops: ChangeOp[]) => new Set(ops.map((o) => o.id));
const neuesRezept = (ref: string, title = "Kürbissuppe"): NewRecipe => ({ ref, title, category: "vegetarisch", servings: 4, prepMinutes: 30, ingredients: [{ amount: 1, unit: "Stück", name: "Kürbis" }], steps: ["Kochen"], note: "" });

describe("applyOps: Wochenplan", () => {
  it("setzt Gerichte, neue Rezepte, doppelt, verschieben, leeren, Personen", () => {
    const ops: ChangeOp[] = [
      { id: "1", type: "add_recipe", recipe: neuesRezept("plan-1") },
      { id: "2", type: "set_meal", slot: slot("Montag"), dish: { kind: "new_recipe", ref: "plan-1", title: "Kürbissuppe", category: "vegetarisch" } },
      { id: "3", type: "set_meal", slot: slot("Dienstag"), dish: { kind: "new_recipe", ref: "fehlt", title: "Phantasie", category: null as never } },
      { id: "4", type: "set_meal", slot: slot("Mittwoch"), dish: { kind: "text", title: "Pizza", category: null }, double: true },
      { id: "5", type: "set_double", slot: slot("Mittwoch"), double: false },
      { id: "6", type: "move_meal", from: slot("Montag"), to: slot("Donnerstag") },
      { id: "7", type: "set_persons", slot: slot("Donnerstag"), persons: 2 },
      { id: "8", type: "clear_slot", slot: slot("Dienstag") },
      { id: "9", type: "set_double", slot: slot("Freitag"), double: true },
      { id: "10", type: "move_meal", from: slot("Freitag"), to: slot("Samstag") },
      { id: "11", type: "set_persons", slot: slot("Freitag"), persons: 3 },
    ];
    const { data, refs } = applyOps(daten(), ops, { prompt: "Mach mir Suppe" });
    const week = weekOf(data, ws);
    expect(refs["plan-1"]).toBeTruthy();
    expect(data.recipes[refs["plan-1"]].ai?.prompt).toBe("Mach mir Suppe");
    expect(findSlot(week, "Donnerstag")?.entry).toMatchObject({ title: "Kürbissuppe", recipeId: refs["plan-1"] });
    expect(findSlot(week, "Donnerstag")?.entry?.stored).toMatchObject({ persons: 2 });
    expect(findSlot(week, "Montag")?.entry).toBeFalsy();
    expect(findSlot(week, "Dienstag")?.entry).toBeFalsy();
    expect(findSlot(week, "Mittwoch")?.entry).toMatchObject({ title: "Pizza" });
    expect(findSlot(week, "Mittwoch")?.entry?.double).toBeFalsy();
    // Personen zurücksetzen (null)
    const reset = applyOps(data, [{ id: "12", type: "set_persons", slot: slot("Donnerstag"), persons: null }]).data;
    expect(findSlot(weekOf(reset, ws), "Donnerstag")?.entry?.stored).not.toHaveProperty("persons");
  });

  it("Vorgaben mit Wunsch räumen den eigenen Eintrag des Tages", () => {
    const start = applyOps(daten(), [{ id: "1", type: "set_meal", slot: slot("Sonntag"), dish: { kind: "text", title: "Braten", category: "fleisch" } }]).data;
    const { data } = applyOps(start, [{ id: "2", type: "update_week", weekStart: ws, changes: { wish: { kidId: "p-mathis", text: "Milchreis", weekday: "Sonntag" }, meatDays: 1 } }]);
    expect(data.weekPlans[ws]).toMatchObject({ meatDays: 1, weekStart: ws });
    expect(findSlot(weekOf(data, ws), "Sonntag")?.entry?.title).toBe("Milchreis");
  });

  it("Einkaufsliste, Woche leeren, Startseite, Pause, Bausteine, Begleitung, Jetzt, Sport", () => {
    const r = rezept("r", "Chili", ["Bohnen", "Hackfleisch"]);
    const ops: ChangeOp[] = [
      { id: "1", type: "set_meal", slot: slot("Montag"), dish: { kind: "recipe", recipeId: "r", title: "Chili", category: "fleisch" } },
      { id: "2", type: "add_shopping", weekStart: ws, name: "Milch", amount: "1 l", section: "kuehlregal", day: "Montag", dish: "Kaffee" },
      { id: "3", type: "remove_shopping", weekStart: ws, names: ["bohnen"] },
      { id: "4", type: "home", change: { tile: "wetter", action: "ausblenden" } },
      { id: "5", type: "set_pause", pause: { from: "2026-11-01", until: null } },
      { id: "6", type: "set_feature", feature: "vorrat", on: true },
      { id: "7", type: "set_feature", feature: "tipps", on: false },
      { id: "9", type: "set_jetzt", on: false },
      { id: "10", type: "add_training", training: { sport: "laufen", minutes: 30, date: HEUTE } },
      { id: "11", type: "set_sport_goal", goal: 5 },
      { id: "13", type: "undo_last" },
      { id: "14", type: "add_pin", text: "Hallo" },
    ];
    const { data } = applyOps(daten({ recipes: { r }, features: ["tipps"] }), ops);
    expect(data.shopping[ws].manual).toEqual([{ id: "2-item", name: "Milch", amount: "1 l", section: "kuehlregal", done: false, day: "Montag", dish: "Kaffee" }]);
    expect(data.shopping[ws].have.length).toBe(1);
    expect(data.home?.find((t) => t.id === "wetter")?.visible).toBe(false);
    expect(data.profile.pause).toEqual({ from: "2026-11-01", until: null });
    expect(data.features).toEqual(["vorrat"]);
    expect(data.profile.helper).toMatchObject({ name: "Mia", art: "assistentin" });
    expect(data.tagesablauf?.jetzt).toBe(false);
    expect(data.sport).toMatchObject({ goal: 5, trainings: [{ id: "10-training" }] });
    const cleared = applyOps(data, [{ id: "15", type: "clear_week", weekStart: ws }, { id: "16", type: "clear_shopping", weekStart: ws }]).data;
    expect(findSlot(weekOf(cleared, ws), "Montag")?.entry).toBeFalsy();
    expect(cleared.shopping[ws].manual).toEqual([]);
  });

  it("Einträge und Notizen", () => {
    const a = aufgabe({ title: "Müll", date: HEUTE });
    const note = createNote({ title: "Idee", text: "x" });
    const { data } = applyOps(daten({ entries: [a] }), [
      { id: "1", type: "done_entry", entryId: a.id, title: "Müll", date: HEUTE },
      { id: "2", type: "done_entry", entryId: "nix", title: "x", date: HEUTE },
      { id: "3", type: "move_entry", entryId: "nix", title: "x", date: HEUTE, to: HEUTE },
      { id: "4", type: "upsert_note", note, isNew: true },
    ]);
    expect(data.entries?.[0].data).toMatchObject({ doneOn: HEUTE });
    expect(data.notes).toHaveLength(1);
    const ohne = applyOps(data, [{ id: "5", type: "remove_note", noteId: note.id, title: "Idee" }]).data;
    expect(ohne.notes).toEqual([]);
  });
});

describe("compactOps und selectedOps", () => {
  it("späteres Setzen ersetzt früheres, Vorgaben werden zusammengefasst, unbenutzte Plan-Rezepte fallen weg", () => {
    const ops: ChangeOp[] = [
      { id: "a", type: "add_recipe", recipe: neuesRezept("plan-1") },
      { id: "b", type: "set_meal", slot: slot("Montag"), dish: { kind: "new_recipe", ref: "plan-1", title: "Suppe", category: "vegetarisch" } },
      { id: "c", type: "update_week", weekStart: ws, changes: { meatDays: 1 } },
      { id: "d", type: "set_meal", slot: slot("Montag"), dish: { kind: "text", title: "Pizza", category: null } },
      { id: "e", type: "update_week", weekStart: ws, changes: { fishDays: 2 } },
      { id: "f", type: "add_recipe", recipe: neuesRezept("rezept-2", "Brot") },
      { id: "g", type: "set_meal", slot: slot("Dienstag"), dish: { kind: "text", title: "Reis", category: null } },
      { id: "h", type: "move_meal", from: slot("Dienstag"), to: slot("Mittwoch") },
      { id: "i", type: "set_meal", slot: slot("Dienstag"), dish: { kind: "text", title: "Nudeln", category: null } },
    ];
    const compact = compactOps(ops);
    expect(compact.map((o) => o.id)).toEqual(["c", "d", "f", "g", "h", "i"]);
    expect(compact[0]).toMatchObject({ changes: { meatDays: 1, fishDays: 2 } });
  });

  it("neue Rezepte nur mit ausgewähltem Platz oder eigenständig", () => {
    const ops: ChangeOp[] = [
      { id: "a", type: "add_recipe", recipe: neuesRezept("plan-1") },
      { id: "b", type: "set_meal", slot: slot("Montag"), dish: { kind: "new_recipe", ref: "plan-1", title: "Suppe", category: "vegetarisch" } },
      { id: "c", type: "add_recipe", recipe: neuesRezept("rezept-2", "Brot") },
    ];
    expect(selectedOps(ops, new Set(["b"])).map((o) => o.id)).toEqual(["a", "b"]);
    expect(selectedOps(ops, new Set(["a", "c"])).map((o) => o.id)).toEqual(["c"]);
    expect([...INSTANT_OP_TYPES]).toContain("add_timer");
  });
});

describe("previewRows", () => {
  it("Wochenplan: vorher → nachher je Tag, Reihenfolge nach Tagen", () => {
    const ctx = kontext({ recipes: { r: rezept("r", "Chili", ["Bohnen"], { category: "fleisch" }) } });
    const base = ctx.data;
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Mittwoch", rezept_id: "r" });
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Montag", gericht: "Pizza", doppelt_kochen: true });
    rufe(ctx, "doppelt_kochen", { woche: "aktuell", tag: "Mittwoch", an: true });
    rufe(ctx, "gericht_verschieben", { woche: "aktuell", von_tag: "Mittwoch", nach_tag: "Montag" });
    rufe(ctx, "platz_leeren", { woche: "aktuell", tag: "Montag" });
    rufe(ctx, "rezept_erstellen", { titel: "Brot", kategorie: "vegetarisch", zutaten: [{ name: "Mehl" }], schritte: ["Backen"], fuer_plan: false });
    rufe(ctx, "rezept_erstellen", { titel: "Suppe", kategorie: "vegetarisch", zutaten: [{ name: "Kürbis" }], schritte: ["Kochen"], fuer_plan: true });
    const ref = ctx.ops[ctx.ops.length - 1].type === "add_recipe" ? (ctx.ops[ctx.ops.length - 1] as Extract<ChangeOp, { type: "add_recipe" }>).recipe.ref : "";
    rufe(ctx, "gericht_setzen", { woche: "naechste", tag: "Montag", neues_rezept: ref });
    const rows = previewRows(base, ctx.ops, alle(ctx.ops));
    const text = rows.map((r) => `${r.group}|${r.label}|${r.before ?? "-"}|${r.after}`);
    expect(text).toEqual([
      "Mo 19.10.|Hauptgericht · abends|frei|Pizza (doppelt, Reste für morgen)",
      "Mo 19.10.|Hauptgericht · abends|Chili|frei",
      "Mi 21.10.|Hauptgericht · abends|frei|Chili",
      "Mi 21.10.|Hauptgericht · abends|-|Chili doppelt kochen, Reste für morgen",
      "Mi 21.10.|verschieben → Montag|Chili|getauscht mit Pizza",
      "Mo 26.10.|Hauptgericht · abends|frei|Suppe",
      "Kochbuch|neues Rezept|-|Brot",
    ]);
    expect(rows.find((r) => r.after === "Suppe")?.newRecipe?.title).toBe("Suppe");
    // Abgewählt: spätere Zeilen rechnen ohne diese Änderung
    const ohneChili = previewRows(base, ctx.ops, new Set(ctx.ops.slice(1).map((o) => o.id)));
    expect(ohneChili.some((r) => r.label.startsWith("verschieben"))).toBe(false);
  });

  it("Vorgaben, Wunsch, Personen, Pause und Startseite", () => {
    const ctx = kontext({ features: ["wochenplan"], profile: { ...haushalt(), pause: { from: "2026-11-01", until: "2026-11-05" } } });
    const base = ctx.data;
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Donnerstag", gericht: "Lasagne" });
    rufe(ctx, "vorgaben_aendern", { woche: "aktuell", wunsch: { kind: "Mathis", gericht: "Milchreis", tag: "Sonntag" } });
    rufe(ctx, "vorgaben_aendern", { woche: "naechste", fleisch_tage: 1, ausflugstage: ["Samstag"], cheat_day: false, wunsch_entfernen: true });
    rufe(ctx, "vorgaben_aendern", { woche: "naechste", cheat_day_tag: "Freitag", wunsch: { kind: "Mathis", gericht: "", tag: "Montag" } });
    rufe(ctx, "portionen_anpassen", { personen: 2, tag: "Donnerstag" });
    rufe(ctx, "pause_beenden");
    rufe(ctx, "pause_setzen", { von: "2026-12-01", bis: "2026-12-03" });
    rufe(ctx, "startseite_anpassen", { kachel: "wetter", aktion: "klein" });
    rufe(ctx, "rueckgaengig");
    rufe(ctx, "wochenplan_loeschen", { woche: "naechste" });
    const rows = previewRows(base, ctx.ops, alle(ctx.ops));
    const by = (g: string) => rows.filter((r) => r.group.startsWith(g));
    expect(rows.slice(0, 4).map((r) => r.group)).toEqual(["Pause", "Pause", "Rückgängig", "Wochenplan"]);
    expect(by("Pause").map((r) => r.after)).toEqual(["Pause beenden, alles wie gewohnt", "von Di., 1.12. bis Do., 3.12. – an diesen Tagen plane ich nichts"]);
    expect(by("So 25.10.")[0].after).toBe("Milchreis – Wunsch von Mathis 🎉");
    expect(by("Do 22.10.").map((r) => r.after)).toEqual(["Lasagne", "Lasagne für 2 Personen, Zutaten und Einkaufsliste passen sich an"]);
    const vorgaben = by("Vorgaben");
    expect(vorgaben[0].lines).toEqual(["Fleisch-Tage: 2 → 1", "Ausflugstage: keine → Samstag", "Cheat Day 🍕: aus", "Wunsch entfernt"]);
    expect(vorgaben[1].lines).toEqual(["Cheat Day 🍕: Freitag", "Wunsch 🎉: Mathis wünscht sich etwas (Montag)"]);
    expect(by("Startseite")[0]).toMatchObject({ label: "Wetter", after: expect.any(String) });
  });

  it("Einkauf, Vorrat, Wünsche, Bausteine, App, Notizen, Pinnwand, Begleitung, Sport, Einträge", () => {
    const t = termin({ title: "Zahnarzt", date: "2026-10-22", start: "15:00" });
    const a = aufgabe({ title: "Steuer", due: "2026-10-30" });
    const wlan = createNote({ title: "WLAN", text: "abc" });
    const ctx = kontext({ features: ["notizen", "vorrat"], entries: [t, a], notes: [wlan], sport: { goal: 3, trainings: [], packs: {}, celebrated: [], skipped: [] } as never });
    const base = ctx.data;
    rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch", menge: "1 l", fuer_tag: "Freitag", gericht: "Kaffee", laden: "REWE" }] });
    rufe(ctx, "einkaufsliste_entfernen", { artikel: ["Brot", "Eier"] });
    rufe(ctx, "einkaufsliste_leeren", { woche: "naechste" });
    rufe(ctx, "vorrat_hinzufuegen", { sachen: [{ name: "Chili", menge: 4, einheit: "Portionen", ort: "tiefkuehler" }] });
    rufe(ctx, "wunsch_merken", { person: "Mathis", gericht: "Pfannkuchen" });
    rufe(ctx, "baustein_an", { baustein: "backen" });
    rufe(ctx, "baustein_aus", { baustein: "zaubern" });
    ctx.ops.push({ id: "x-feature", type: "set_feature", feature: "tipps", on: false });
    rufe(ctx, "app_befehl", { text: "Mach die Ansicht dunkel" });
    rufe(ctx, "notiz_anlegen", { titel: "Packliste", liste: ["Zelt", "Lampe"] });
    rufe(ctx, "notiz_anlegen", { titel: "Idee", text: "Kürbis" });
    rufe(ctx, "notiz_anlegen", { titel: "Leer" });
    rufe(ctx, "notiz_aendern", { id: wlan.id, text: "" });
    rufe(ctx, "notiz_loeschen", { id: wlan.id });
    rufe(ctx, "pinnwand_schreiben", { text: "Bin um 20 Uhr da" });
    rufe(ctx, "jetzt_karte", { an: true });
    rufe(ctx, "sport_eintragen", { sportart: "laufen", minuten: 30, km: 5 });
    rufe(ctx, "sport_eintragen", { sportart: "yoga", minuten: 20, datum: "2026-10-20" });
    rufe(ctx, "sport_ziel_setzen", { ziel: 4 });
    rufe(ctx, "timer_stellen", { minuten: 5 });
    rufe(ctx, "termin_anlegen", { titel: "Chor", datum: "2026-10-23", start: "19:00", ende: "20:30", wiederholung: { art: "woechentlich" }, erinnerung: "30", raum: "arbeit" });
    rufe(ctx, "termin_aendern", { id: t.id, start: "16:00" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Blumen", tag: "2026-10-23", uhrzeit: "08:00" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Fotos" });
    rufe(ctx, "aufgabe_anlegen", { titel: "Formular", frist: "2026-10-28" });
    rufe(ctx, "termin_loeschen", { id: t.id });
    rufe(ctx, "aufgabe_erledigen", { id: a.id });
    rufe(ctx, "aufgabe_verschieben", { id: a.id, auf: "2026-10-24", uhrzeit: "10:00" });
    const rows = previewRows(base, ctx.ops, alle(ctx.ops));
    const line = (r: (typeof rows)[number]) => `${r.group}|${r.label}|${r.before ?? "-"}|${r.after}`;
    const lines = rows.map(line);
    expect(lines).toEqual(
      expect.arrayContaining([
        "Einkaufsliste|Kühlregal|-|1 l Milch für Freitag (Kaffee) bei REWE",
        "Einkaufsliste|von der Liste|Brot, Eier|weg",
        "Einkaufsliste|Woche 26.10. – 1.11.|alles|Liste leer",
        "Im Haus|Tiefkühl|-|Chili",
        "Wünsche|Wunsch von Mathis|-|Pfannkuchen 🎉 – ganz oben bei den Ideen",
        "Mehr Funktionen|Backen mit Timern|-|einschalten – Backen steht jetzt rechts unter Essen.",
        "Mehr Funktionen|Tipps|-|ausschalten (Daten bleiben)",
        "In der App|ausführen|-|„Mach die Ansicht dunkel“",
        "Notizen|🧳 Packliste|-|neue Liste: Zelt, Lampe",
        "Notizen|löschen|WLAN|gelöscht",
        "Pinnwand|📌 Pinnwand|-|Bin um 20 Uhr da",
        "Startseite|Jetzt-Karte|-|✨ an",
        "Sport|🏃 eintragen|-|Laufen · 30 Min · 5 km · heute",
        "Sport|🧘 eintragen|-|Yoga · 20 Min · Di 20.10.",
        "Sport|Wochenziel|3×|4× pro Woche",
        "Termine|Zahnarzt|Do 22.10. · 15:00|Do 22.10. · 16:00",
        "Aufgaben|Fr 23.10. · 8:00|-|Blumen",
        "Aufgaben|heute|-|Fotos",
        "Aufgaben|bis Mi 28.10.|-|Formular",
        "Termine & Aufgaben|löschen|Zahnarzt|gelöscht",
        "Termine & Aufgaben|abhaken|-|Steuer ✓ erledigt",
        "Termine & Aufgaben|verschieben|Steuer · Mi 21.10.|Sa 24.10. · 10:00",
      ]),
    );
    expect(lines).toContain("Termine|Fr 23.10. · 19:00–20:30|-|Chor · jeden Freitag · Erinnerung 30 Min vorher · Arbeit");
    expect(lines).toEqual(expect.arrayContaining(["Notizen|💡 Idee|-|neu: Kürbis", "Notizen|📝 Leer|-|neu", "Notizen|🔑 WLAN|-|geändert"]));
    // Timer stehen nie in der Vorschau
    expect(rows.some((r) => r.opId === ctx.ops.find((o) => o.type === "add_timer")?.id)).toBe(false);
  });

  it("leere Änderungen erzeugen keine Zeile", () => {
    const base = daten();
    const ops: ChangeOp[] = [
      { id: "1", type: "clear_slot", slot: slot("Montag") },
      { id: "2", type: "set_double", slot: slot("Montag"), double: true },
      { id: "3", type: "move_meal", from: slot("Montag"), to: slot("Dienstag") },
      { id: "4", type: "update_week", weekStart: ws, changes: { meatDays: 2 } },
      { id: "5", type: "set_persons", slot: slot("Montag"), persons: 2 },
      { id: "6", type: "add_recipe", recipe: neuesRezept("plan-7") },
      { id: "7", type: "stop_timer", name: "" },
    ];
    expect(previewRows(base, ops, alle(ops))).toEqual([]);
  });
});
