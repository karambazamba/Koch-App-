// Notizen neu + Absätze überall (Tafel 93, v0.112): eigene Notiz je
// Schnellnotiz, Sammel-Schnellnotiz wird geteilt, Bearbeiten im Vollbild
// (Liste, Autosave, Leeres fällt weg), Mehrzeilen-Feld für Notiz und Pinnwand.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createNote, isEmptyNote, itemEnter, migrateNotes, noteFromText, noteShareText, persistNote, plainTitle, splitSchnellnotiz, toggleList, type Note } from "@/lib/notizen/model";
import { createAutosave } from "@/lib/notizen/autosave";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { cleanPinText, createPin, sanitizePin } from "@/lib/pinnwand/model";
import { parseNoteCommand } from "@/lib/notizen/chat";
import { at } from "../helpers";

const sammel = (text: string, id = "s1"): Note => {
  const n = createNote({ title: "Schnellnotiz", text, pinned: true });
  return { ...n, id, geaendert: "2026-10-20T08:00:00.000Z", data: { ...n.data, schnell: true } };
};

describe("Eigene Notiz aus getipptem Text", () => {
  it("erste Zeile = Titel, der Rest mit Absätzen = Text; Emojis nicht im Titel", () => {
    at("2026-10-27T10:00");
    const n = noteFromText("🎁 Geschenkideen\nLaufrad\n\nHelm für Mathis\n")!;
    expect(n.data.title).toBe("Geschenkideen");
    expect(n.data.text).toBe("Laufrad\n\nHelm für Mathis");
    expect(noteFromText("  \n ")).toBeNull();
    expect(plainTitle("📝 Einkauf ✨")).toBe("Einkauf");
    const lang = noteFromText("x".repeat(30) + " " + "y".repeat(60))!;
    expect(lang.data.title.length).toBeLessThanOrEqual(80);
    expect(lang.data.text).toContain("y".repeat(60));
  });
});

describe("Migration: Sammel-Schnellnotiz → einzelne Notizen", () => {
  it("jede Zeile eine Notiz, nichts geht verloren, Reihenfolge bleibt", () => {
    const other = createNote({ title: "WLAN", text: "abc" });
    const out = splitSchnellnotiz([other, sammel("Milch holen\n\nHandwerker Müller 0172\nMilch holen")]);
    expect(out.some((n) => n.data.schnell)).toBe(false);
    expect(out.map((n) => n.data.title)).toEqual(["WLAN", "Milch holen", "Handwerker Müller 0172", "Milch holen"]);
    expect(new Set(out.map((n) => n.id)).size).toBe(4);
    expect(out.slice(1).every((n) => !n.data.pinned && n.data.kind === "text")).toBe(true);
    expect(out[3].geaendert > out[1].geaendert).toBe(true);
  });

  it("gleiche Ids auf jedem Gerät (Abgleich ohne Doppelte), leere Sammel-Notiz fällt weg", () => {
    const a = splitSchnellnotiz([sammel("Eins\nZwei")]).map((n) => n.id);
    const b = splitSchnellnotiz([sammel("Eins\nZwei")]).map((n) => n.id);
    expect(a).toEqual(b);
    expect(splitSchnellnotiz([sammel("  ")])).toEqual([]);
  });

  it("Speicher v1 → v2, auch alte Sicherungen und Daten älterer Geräte im Abgleich", () => {
    const v1 = { version: 1, notes: [sammel("Oma anrufen\nZahnarzt 0452")] };
    const v2 = migrateNotes(JSON.parse(JSON.stringify(v1)))!;
    expect(v2.version).toBe(2);
    expect(v2.notes.map((n) => n.data.title)).toEqual(["Oma anrufen", "Zahnarzt 0452"]);
    expect(migrateNotes({ version: 2, notes: [sammel("Kommt von altem Gerät")] })!.notes[0].data.title).toBe("Kommt von altem Gerät");
    const adapter = ADAPTERS.find((x) => x.name === "notizen")!;
    expect(adapter.version).toBe(2);
    expect(adapter.upgrade?.(JSON.parse(JSON.stringify(v1)))?.version).toBe(2);
    const fixture = JSON.parse(readFileSync("tests/fixtures/sicherung-v0.47.json", "utf8"));
    expect(migrateNotes(JSON.parse(fixture.data["wasgibts.notizen"]))!.notes[0].data).toMatchObject({ title: "WLAN", text: "Passwort: Sonnenblume42" });
  });
});

describe("Bearbeiten im Vollbild", () => {
  it("Autosave: gebündelt nach dem Tippen, sofort beim Schließen", () => {
    vi.useFakeTimers();
    const saved: string[] = [];
    const auto = createAutosave<string>((v) => saved.push(v), 400);
    auto.push("A");
    auto.push("AB");
    expect(saved).toEqual([]);
    vi.advanceTimersByTime(400);
    expect(saved).toEqual(["AB"]);
    auto.push("ABC");
    auto.flush();
    auto.flush();
    expect(saved).toEqual(["AB", "ABC"]);
    vi.useRealTimers();
  });

  it("leere Notiz fällt beim Sichern weg, ohne Titel nimmt sie die erste Zeile", () => {
    at("2026-10-27T10:00");
    const leer = createNote({ title: "", text: "" });
    expect(isEmptyNote(leer)).toBe(true);
    const mit = { ...leer, data: { ...leer.data, text: "Erste Zeile\nZweite" } };
    const notes = persistNote([], mit);
    expect(notes[0].data.title).toBe("Erste Zeile");
    expect(persistNote(notes, leer)).toEqual([]);
  });

  it("Liste: Return = neuer Eintrag, leerer Eintrag + Return beendet die Liste; Text ↔ Liste", () => {
    at("2026-10-27T10:00");
    const liste = toggleList(createNote({ title: "Packliste", text: "- Zelt\n• Lampe" }));
    expect(liste.data.kind).toBe("liste");
    expect(liste.data.items!.map((i) => i.text)).toEqual(["Zelt", "Lampe"]);
    const first = liste.data.items![0].id;
    const r = itemEnter(liste.data.items!, first);
    expect(r.items.map((i) => i.text)).toEqual(["Zelt", "", "Lampe"]);
    expect(r.focus).toBe(r.items[1].id);
    const end = itemEnter(r.items, r.items[1].id);
    expect(end).toEqual({ items: liste.data.items, focus: null });
    const zurueck = toggleList({ ...liste, data: { ...liste.data, text: "Danach" } });
    expect(zurueck.data).toMatchObject({ kind: "text", text: "Zelt\nLampe\nDanach" });
  });

  it("Teilen behält Absätze, Listen mit Häkchen", () => {
    at("2026-10-27T10:00");
    const l = createNote({ title: "Einkauf", items: ["Milch", "Brot"] });
    l.data.items![0].done = true;
    expect(noteShareText(l)).toBe("Einkauf\n✓ Milch\n○ Brot");
    expect(noteShareText(createNote({ title: "Brief", text: "Hallo\n\nGruß" }))).toBe("Brief\nHallo\n\nGruß");
  });

  it("Werkzeugleiste, Fertig, kein Mia-Knopf darüber", () => {
    const src = readFileSync("src/components/notizen/NoteEditor.tsx", "utf8");
    for (const s of [">\n            Liste", "Anheften", "Teilen", "Löschen", "Fertig", "showDeleted", "autosave.flush"]) expect(src).toContain(s);
    expect(readFileSync("src/lib/core/leiste.ts", "utf8")).toContain('"/notizen/bearbeiten"');
  });
});

describe("Absätze überall", () => {
  it("ein Mehrzeilen-Feld: Return = neue Zeile, gesendet wird nur per Knopf", () => {
    const feld = readFileSync("src/components/ui/MehrzeilenFeld.tsx", "utf8");
    expect(feld).toMatch(/<textarea[\s\S]*enterKeyHint="enter"/);
    expect(feld).not.toMatch(/onKeyDown|requestSubmit/);
    const quick = readFileSync("src/components/ui/QuickEntry.tsx", "utf8");
    expect(quick).toMatch(/request\.kind === "notiz" \|\| request\.kind === "pinnwand"/);
    expect(quick).toContain("<MehrzeilenFeld");
    expect(readFileSync("src/components/notizen/Schnellnotiz.tsx", "utf8")).toMatch(/<MehrzeilenFeld[\s\S]*Return = neue Zeile[\s\S]*Sichern/);
  });

  it("Pinnwand: Zeilen bleiben, alte Nachrichten unverändert, Anzeige mit Umbrüchen", () => {
    at("2026-10-27T10:00");
    expect(cleanPinText("Einkaufen:\r\n  Milch   und Brot \n\n\n\nBin um 8 da ")).toBe("Einkaufen:\nMilch und Brot\n\nBin um 8 da");
    expect(createPin("Hallo\nWelt", "Felix")?.data.text).toBe("Hallo\nWelt");
    const old = createPin("Bin um 20 Uhr da", "Lisa")!;
    expect(sanitizePin(JSON.parse(JSON.stringify(old)))?.data.text).toBe("Bin um 20 Uhr da");
    expect(readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8")).toMatch(/whitespace-pre-line[^"]*">\{pin\.data\.text\}/);
    expect(readFileSync("src/components/notizen/NotesView.tsx", "utf8")).toMatch(/whitespace-pre-line/);
  });
});

describe("Mia", () => {
  it("„Merk dir …“/„Schreib auf …“ = eigene Notiz, „Setz … auf die Geschenkideen“ = Liste", () => {
    expect(parseNoteCommand("Schreib auf: Fahrradschloss 4711")).toMatchObject({ kind: "create", title: "Fahrradschloss 4711" });
    expect(parseNoteCommand("Merk dir Geschenke\nLaufrad\nHelm")).toEqual({ kind: "create", title: "Geschenke", text: "Laufrad\nHelm" });
    expect(parseNoteCommand("Setz Laufrad auf die Geschenkideen")).toEqual({ kind: "add", list: "Geschenkideen", items: ["Laufrad"] });
    expect(parseNoteCommand("Pack Milch auf die Einkaufsliste")).toBeNull();
    expect(parseNoteCommand("Schreib auf die Einkaufsliste Milch")).toBeNull();
  });
});
