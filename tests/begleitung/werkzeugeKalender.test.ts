import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { calendarContext } from "@/lib/begleitung/calendarTools";
import { aufgabe, HEUTE, kontext, letzte, rufe, termin } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

describe("termin_anlegen", () => {
  it("legt einen Termin mit Uhrzeit, Ort, Erinnerung und Person als Vorschlag an", () => {
    const ctx = kontext();
    const r = rufe(ctx, "termin_anlegen", { titel: "Steuerberater", datum: "morgen", start: "9", ende: "10:30", ort: "Kiel", etikett: "Steuern", erinnerung: "30", raum: "arbeit", personen: ["Felix", "Niemand"] });
    expect(r.isError).toBeUndefined();
    expect(r.content).toBe("Vorgemerkt (termin, neu): Steuerberater, 22.10. 09:00.");
    const op = letzte(ctx);
    expect(op.type).toBe("upsert_entry");
    if (op.type !== "upsert_entry" || op.entry.typ !== "termin") throw new Error("kein Termin");
    expect(op.isNew).toBe(true);
    expect(op.entry.raum).toBe("arbeit");
    expect(op.entry.data).toMatchObject({ date: "2026-10-22", start: "09:00", end: "10:30", place: "Kiel", label: "Steuern", reminder: "30", who: ["p-felix"] });
    // Die Arbeitskopie kennt den Termin schon (für spätere Lese-Werkzeuge)
    expect(ctx.data.entries?.map((e) => e.data.title)).toEqual(["Steuerberater"]);
  });

  it("meldet fehlende Angaben freundlich als Fehler", () => {
    const ctx = kontext();
    expect(rufe(ctx, "termin_anlegen", { datum: "2026-10-22", start: "9:00" })).toMatchObject({ isError: true, content: "titel angeben." });
    expect(rufe(ctx, "termin_anlegen", { titel: "X", datum: "irgendwann mal", start: "9:00" }).content).toMatch(/datum nicht erkannt/);
    expect(rufe(ctx, "termin_anlegen", { titel: "X", datum: "2026-10-22", start: "25:00" }).content).toMatch(/start als HH:MM/);
    expect(rufe(ctx, "termin_anlegen", { titel: "X", datum: "2026-10-22" }).content).toMatch(/start als HH:MM/);
    expect(ctx.ops).toHaveLength(0);
  });

  it("Wiederholung an Wochentagen ohne Tage = Wochentag des Datums", () => {
    const ctx = kontext();
    rufe(ctx, "termin_anlegen", { titel: "Schwimmen", datum: "2026-10-23", start: "17:00", wiederholung: { art: "wochentage" } });
    const op = letzte(ctx);
    if (op.type !== "upsert_entry") throw new Error();
    expect(op.entry.data.repeat).toEqual({ kind: "wochentage", days: [4] });
  });
});

describe("termin_aendern / termin_loeschen", () => {
  it("ändert nur die angegebenen Felder und behält den Rest", () => {
    const t = termin({ title: "Zahnarzt", date: "2026-10-22", start: "15:00", place: "Praxis" });
    const ctx = kontext({ entries: [t] });
    const r = rufe(ctx, "termin_aendern", { id: t.id, datum: "2026-10-23", raum: "arbeit" });
    expect(r.content).toBe("Vorgemerkt (termin, geändert): Zahnarzt, 23.10. 15:00.");
    const op = letzte(ctx);
    if (op.type !== "upsert_entry" || op.entry.typ !== "termin") throw new Error();
    expect(op.isNew).toBe(false);
    expect(op.entry.raum).toBe("arbeit");
    expect(op.entry.data).toMatchObject({ date: "2026-10-23", start: "15:00", place: "Praxis" });
  });

  it("bei Serien mit nur_am wird nur dieses Vorkommen verschoben", () => {
    const t = termin({ title: "Training", date: "2026-10-19", start: "18:00", repeat: { kind: "woechentlich" } });
    const ctx = kontext({ entries: [t] });
    const r = rufe(ctx, "termin_aendern", { id: t.id, nur_am: "2026-10-26", datum: "2026-10-27", start: "19:00" });
    expect(r.content).toBe("Vorgemerkt: Training am 26.10. → 27.10..");
    expect(letzte(ctx)).toMatchObject({ type: "move_entry", date: "2026-10-26", to: "2026-10-27", time: "19:00" });
  });

  it("unbekannte id oder falscher Typ → Fehler", () => {
    const a = aufgabe({ title: "Müll" });
    const ctx = kontext({ entries: [a] });
    expect(rufe(ctx, "termin_aendern", { id: a.id }).isError).toBe(true);
    expect(rufe(ctx, "termin_aendern", { id: "gibtsnicht" }).isError).toBe(true);
    expect(rufe(ctx, "termin_loeschen", { id: a.id }).content).toBe("Termin mit dieser id nicht gefunden.");
  });

  it("löscht ganze Termine oder ein Vorkommen einer Serie", () => {
    const einmal = termin({ title: "Kino", date: "2026-10-24", start: "20:00" });
    const serie = termin({ title: "Chor", date: "2026-10-20", start: "19:00", repeat: { kind: "woechentlich" } });
    const ctx = kontext({ entries: [einmal, serie] });
    expect(rufe(ctx, "termin_loeschen", { id: einmal.id, nur_am: "2026-10-24" }).content).toBe("Vorgemerkt: Kino löschen.");
    expect(rufe(ctx, "termin_loeschen", { id: serie.id, nur_am: "2026-10-27" }).content).toBe("Vorgemerkt: Chor am 27.10. löschen.");
    expect(ctx.ops.map((o) => (o.type === "remove_entry" ? o.onlyDate : "x"))).toEqual([undefined, "2026-10-27"]);
    expect(ctx.data.entries?.some((e) => e.id === einmal.id)).toBe(false);
  });
});

describe("Aufgaben", () => {
  it("alles ist heute: ohne Tag für heute, mit Tag ab dem Tag, Frist ändert nichts (Tafel 103)", () => {
    const ctx = kontext();
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "Kita-Formular", frist: "2026-10-28", dringend: true }).content).toBe("Vorgemerkt (aufgabe, neu): Kita-Formular, bis 28.10..");
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "Reifen", zeitraum: "diese_woche" }).content).toBe("Vorgemerkt (aufgabe, neu): Reifen, heute.");
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "Keller", zeitraum: "naechste_woche" }).content).toContain("ab 26.10.");
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "Fotos sortieren" }).content).toBe("Vorgemerkt (aufgabe, neu): Fotos sortieren, heute.");
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "Blumen", tag: "2026-10-23", uhrzeit: "8" }).content).toContain("ab 23.10.");
    const daten = ctx.ops.map((op) => (op.type === "upsert_entry" && op.entry.typ === "aufgabe" ? op.entry.data : null));
    expect(daten.map((d) => d?.date)).toEqual([HEUTE, HEUTE, "2026-10-26", HEUTE, "2026-10-23"]);
    expect(daten.every((d) => d && !d.week)).toBe(true);
    expect(rufe(ctx, "aufgabe_anlegen", { titel: "" })).toMatchObject({ isError: true });
    const first = ctx.ops[0];
    if (first.type !== "upsert_entry" || first.entry.typ !== "aufgabe") throw new Error();
    expect(first.entry.data.dringend).toBe(true);
  });

  it("wiederkehrend ohne Tag beginnt am nächsten passenden Wochentag", () => {
    const ctx = kontext();
    rufe(ctx, "aufgabe_anlegen", { titel: "Müll rausbringen", wiederholung: { art: "wochentage", tage: [0] } });
    const op = letzte(ctx);
    if (op.type !== "upsert_entry" || op.entry.typ !== "aufgabe") throw new Error();
    expect(op.entry.data.date).toBe("2026-10-26"); // nächster Montag
    rufe(ctx, "aufgabe_anlegen", { titel: "Blumen gießen", wiederholung: { art: "taeglich" } });
    const daily = letzte(ctx);
    if (daily.type !== "upsert_entry" || daily.entry.typ !== "aufgabe") throw new Error();
    expect(daily.entry.data.date).toBe(HEUTE);
  });

  it("aufgabe_aendern ändert, löscht und lehnt Termine ab", () => {
    const a = aufgabe({ title: "Steuer", due: "2026-10-30", dringend: true });
    const t = termin({ title: "Arzt", date: "2026-10-22", start: "10:00" });
    const ctx = kontext({ entries: [a, t] });
    expect(rufe(ctx, "aufgabe_aendern", { id: t.id }).content).toBe("Aufgabe mit dieser id nicht gefunden.");
    expect(rufe(ctx, "aufgabe_aendern", { id: a.id, titel: "Steuererklärung", dringend: false, raum: "arbeit" }).content).toBe("Vorgemerkt (aufgabe, geändert): Steuererklärung, bis 30.10..");
    const op = letzte(ctx);
    if (op.type !== "upsert_entry" || op.entry.typ !== "aufgabe") throw new Error();
    expect(op.entry.data.dringend).toBeUndefined();
    expect(op.entry.raum).toBe("arbeit");
    expect(rufe(ctx, "aufgabe_aendern", { id: a.id, loeschen: true }).content).toBe("Vorgemerkt: Steuererklärung löschen.");
  });

  it("erledigen und verschieben", () => {
    const a = aufgabe({ title: "Einkaufen", date: "2026-10-21" });
    const ctx = kontext({ entries: [a] });
    expect(rufe(ctx, "aufgabe_erledigen", { id: a.id }).content).toBe("Vorgemerkt: Einkaufen erledigt.");
    expect(letzte(ctx)).toMatchObject({ type: "done_entry", date: HEUTE });
    expect(rufe(ctx, "aufgabe_erledigen", { id: "x" }).isError).toBe(true);
    expect(rufe(ctx, "aufgabe_verschieben", { id: a.id, auf: "morgen", uhrzeit: "07:30" }).content).toBe("Vorgemerkt: Einkaufen → 22.10..");
    expect(letzte(ctx)).toMatchObject({ type: "move_entry", date: "2026-10-21", to: "2026-10-22", time: "07:30" });
    expect(rufe(ctx, "aufgabe_verschieben", { id: a.id, auf: "bald" }).content).toBe("auf: Datum nicht erkannt.");
    expect(rufe(ctx, "aufgabe_verschieben", { id: "x", auf: "morgen" }).isError).toBe(true);
  });
});

describe("Lesen", () => {
  it("tag_anzeigen und woche_anzeigen antworten aus den Einträgen", () => {
    const t = termin({ title: "Elternabend", date: "2026-10-22", start: "19:30" });
    const ctx = kontext({ entries: [t] });
    const tag = rufe(ctx, "tag_anzeigen", { datum: "morgen" });
    expect(tag.content).toContain("Elternabend");
    expect(tag.content).toContain("Kurz:");
    expect(rufe(ctx, "tag_anzeigen", { datum: "" }).isError).toBe(true);
    expect(rufe(ctx, "woche_anzeigen", { tage: 2 }).content).toContain("Elternabend");
    expect(rufe(ctx, "woche_anzeigen", { ab: "2026-11-01", tage: 99 }).content).not.toContain("Elternabend");
  });

  it("calendarContext: Aufgaben ohne Tag stehen heute, Geplantes später extra, Feierabend-Hinweis", () => {
    const leer = calendarContext([], HEUTE);
    expect(leer).toContain("noch nichts eingetragen");
    const text = calendarContext([termin({ title: "Kita-Fest", date: HEUTE, start: "15:00" }), aufgabe({ title: "Fenster putzen", label: "Haus" }), aufgabe({ title: "KFZ-Steuer", date: "2026-11-06" })], HEUTE);
    expect(text).toContain("Kita-Fest");
    expect(text).toMatch(/Mi 2026-10-21: .*Fenster putzen \[id=.*aufgabe, familie, Etikett Haus\]/);
    expect(text).toMatch(/Später geplant: KFZ-Steuer \[id=.*ab Fr 6\.11\.\]/);
    expect(text).not.toMatch(/irgendwann|Feierabend/);
    expect(calendarContext([aufgabe({ title: "Bericht" })], HEUTE, false, true)).toMatch(/Feierabend: Arbeitsaufgaben ruhen/);
  });
});

describe("Umwandeln (Notiz-Werkzeuge für Einträge)", () => {
  it("Termin → Aufgabe und Aufgabe → Termin behalten die id", () => {
    const t = termin({ title: "Reifen wechseln", date: "2026-10-23", start: "10:00" });
    const a = aufgabe({ title: "Friseur", due: "2026-10-29" });
    const ctx = kontext({ entries: [t, a] });
    expect(rufe(ctx, "termin_in_aufgabe_umwandeln", { id: t.id, frist: "2026-10-30" }).content).toBe("Vorgemerkt: „Reifen wechseln“ wird eine Aufgabe.");
    const op = letzte(ctx);
    if (op.type !== "upsert_entry") throw new Error();
    expect(op.entry).toMatchObject({ id: t.id, typ: "aufgabe", data: { due: "2026-10-30" } });
    expect(rufe(ctx, "termin_in_aufgabe_umwandeln", { id: a.id }).isError).toBe(true);
    expect(rufe(ctx, "aufgabe_in_termin_umwandeln", { id: a.id, start: "15" }).content).toBe("Vorgemerkt: „Friseur“ wird ein Termin um 15:00.");
    expect(letzte(ctx)).toMatchObject({ entry: { id: a.id, typ: "termin", data: { date: "2026-10-29", start: "15:00" } } });
    expect(rufe(ctx, "aufgabe_in_termin_umwandeln", { id: a.id, start: "nachmittags" }).isError).toBe(true);
  });
});
