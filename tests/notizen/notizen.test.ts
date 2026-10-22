// Notizen: Modell (model.ts), Speicher (store.ts), Gespräch ohne KI (chat.ts)
// und Schnellnotiz (schnellnotiz.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { noteAnswer, noteFor, parseNoteCommand } from "@/lib/notizen/chat";
import { addListItems, createNote, findNote, leisureIdea, noteEmoji, notePreview, removeNote, sanitizeNote, setPinned, sortNotes, upsertNote, type Note } from "@/lib/notizen/model";
import { appendLine, isSchnellnotizTidyRequest, schnellnotizCommand, tidySchnellnotiz, withoutLines } from "@/lib/notizen/schnellnotiz";
import { at, fakeWindow } from "../helpers";

beforeEach(() => at("2026-10-20T08:00"));

describe("Modell", () => {
  it("Emoji passend zum Titel", () => {
    expect(noteEmoji("Geschenkideen")).toBe("🎁");
    expect(noteEmoji("WLAN-Passwort")).toBe("🔑");
    expect(noteEmoji("Filme & Serien")).toBe("🎬");
    expect(noteEmoji("Kram", "liste")).toBe("📋");
    expect(noteEmoji("Kram")).toBe("📝");
  });

  it("anlegen als Text oder Liste, anheften, löschen, ersetzen", () => {
    const text = createNote({ title: "  WLAN  ", text: "abc123", raum: "arbeit" });
    expect(text.data).toMatchObject({ title: "WLAN", kind: "text", text: "abc123", pinned: false, emoji: "🔑" });
    expect(text.raum).toBe("arbeit");
    const liste = createNote({ title: "Packliste", items: ["Zahnbürste", " ", "Pass"], pinned: true, emoji: "✈️" });
    expect(liste.data.items?.map((i) => i.text)).toEqual(["Zahnbürste", "Pass"]);
    expect(liste.data.emoji).toBe("✈️");
    let notes = upsertNote([], text);
    notes = upsertNote(notes, liste);
    notes = setPinned(notes, text.id, true);
    expect(notes[0].data.pinned).toBe(true);
    expect(setPinned(notes, "nix", true)).toBe(notes);
    notes = upsertNote(notes, { ...text, data: { ...text.data, text: "neu" } });
    expect(notes).toHaveLength(2);
    expect(notes[0].data.text).toBe("neu");
    expect(removeNote(notes, text.id).map((n) => n.id)).toEqual([liste.id]);
  });

  it("Einträge anhängen: ohne Doppelte, Text wird erster Eintrag", () => {
    const liste = createNote({ title: "Packliste", items: ["Pass"] });
    const text = createNote({ title: "Idee", text: "Zoo" });
    const leer = createNote({ title: "Leer", text: " " });
    let notes = addListItems([liste, text, leer], liste.id, ["pass", "Sonnencreme", " "]);
    expect(notes[0].data.items?.map((i) => i.text)).toEqual(["Pass", "Sonnencreme"]);
    notes = addListItems(notes, text.id, ["Museum"]);
    expect(notes[1].data).toMatchObject({ kind: "liste", text: undefined });
    expect(notes[1].data.items?.map((i) => i.text)).toEqual(["Zoo", "Museum"]);
    notes = addListItems(notes, leer.id, ["A"]);
    expect(notes[2].data.items?.map((i) => i.text)).toEqual(["A"]);
    expect(addListItems(notes, "nix", ["x"])).toBe(notes);
  });

  it("finden, sortieren, Vorschau", () => {
    at("2026-10-20T08:00");
    const pack = createNote({ title: "Packliste Urlaub", items: ["Pass", "Hut"] });
    at("2026-10-20T09:00");
    const pack2 = createNote({ title: "Packliste Sport", items: [] });
    const wlan = createNote({ title: "WLAN", text: "Zeile 1\n\n Zeile 2 \nZeile 3", pinned: true });
    const notes = [pack, pack2, wlan];
    expect(findNote(notes, "die Packliste")?.id).toBe(pack2.id);
    expect(findNote(notes, "Packliste Urlaub")?.id).toBe(pack.id);
    expect(findNote(notes, "die")).toBeNull();
    expect(findNote(notes, "Rezepte")).toBeNull();
    expect(sortNotes(notes).map((n) => n.data.title)).toEqual(["WLAN", "Packliste Sport", "Packliste Urlaub"]);
    expect(notePreview(wlan, 2)).toEqual(["Zeile 1", "Zeile 2"]);
    const done = addListItems([pack], pack.id, []);
    done[0].data.items![0].done = true;
    expect(notePreview(done[0])).toEqual(["✓ Pass", "• Hut"]);
  });

  it("Freizeit-Idee: stabil über den Tag, nur Offenes aus Freizeit-Listen", () => {
    const filme = createNote({ title: "Filme", items: ["Paddington", "Totoro"] });
    filme.data.freizeit = true;
    filme.data.items![0].done = true;
    expect(leisureIdea([filme], "2026-10-20")?.item.text).toBe("Totoro");
    expect(leisureIdea([createNote({ title: "Filme", items: ["A"] })], "2026-10-20")).toBeNull();
    const zwei = createNote({ title: "Serien", items: ["A", "B"] });
    zwei.data.freizeit = true;
    expect(leisureIdea([zwei], "2026-10-20")).toEqual(leisureIdea([zwei], "2026-10-20"));
  });

  it("prüfen und reparieren", () => {
    expect(sanitizeNote(null)).toBeNull();
    expect(sanitizeNote({ id: "a", typ: "termin", data: { title: "x" } })).toBeNull();
    expect(sanitizeNote({ id: "a", typ: "notiz", data: { title: " " } })).toBeNull();
    const liste = sanitizeNote({ id: "l", typ: "notiz", raum: "arbeit", data: { title: "Liste", kind: "liste", items: [{ text: " A ", done: true }, { id: "x", text: "B" }, { text: "" }, null], freizeit: true, schnell: true } }) as Note;
    expect(liste.raum).toBe("arbeit");
    expect(liste.besitzer).toBe("lokal");
    expect(liste.data.items).toEqual([{ id: expect.any(String), text: "A", done: true }, { id: "x", text: "B" }]);
    expect(liste.data.freizeit).toBe(true);
    expect(liste.data.schnell).toBeUndefined();
    expect(liste.data.emoji).toBe("📋");
    const lang = "x".repeat(5000);
    const schnell = sanitizeNote({ id: "s", typ: "notiz", besitzer: "konto", erstellt: "e", geaendert: "g", data: { title: "Schnellnotiz", text: lang, schnell: true, pinned: true, emoji: " 📝 " } }) as Note;
    expect(schnell.data).toMatchObject({ kind: "text", schnell: true, pinned: true, emoji: "📝" });
    expect(schnell.data.text).toHaveLength(5000);
    const normal = sanitizeNote({ id: "n", typ: "notiz", data: { title: "Text", text: lang, items: "quatsch" } }) as Note;
    expect(normal.data.text).toHaveLength(4000);
    expect(sanitizeNote({ id: "n", typ: "notiz", data: { title: "Ohne", kind: "liste" } })?.data.items).toEqual([]);
    expect(sanitizeNote({ id: "n", typ: "notiz", data: { title: "Ohne Text" } })?.data.text).toBe("");
  });
});

describe("Gespräch ohne KI", () => {
  it.each([
    ["Was muss ich heute noch erledigen?", { kind: "tasks", open: false }],
    ["Zeig mir meine Aufgaben", { kind: "tasks", open: true }],
    ["Zeig mir meine Notizen", { kind: "show_all" }],
    ["Häng das WLAN oben an", { kind: "pin", query: "das WLAN", on: true }],
    ["Lös die Packliste oben ab", { kind: "pin", query: "die Packliste", on: false }],
    ["Was steht auf der Packliste?", { kind: "show", query: "Packliste" }],
    ["Wie ist nochmal das WLAN-Passwort?", { kind: "show", query: "WLAN-Passwort" }],
    ["Zeig mir die Geschenkideen", { kind: "show", query: "Geschenkideen" }],
    ["Idee fürs Café: Mango-Sorbet und Matcha", { kind: "add", list: "Ideen Café", items: ["Mango-Sorbet", "Matcha"] }],
    ["Idee: Zoo", { kind: "add", list: "Ideen", items: ["Zoo"] }],
    ["Merk dir, Mathis wünscht sich ein Fahrrad", { kind: "add", list: "Geschenkideen", items: ["Ein Fahrrad (für Mathis)"] }],
    ["Merk dir: Geschenk für Lisa: Buch", { kind: "add", list: "Geschenkideen", items: ["Buch (für Lisa)"] }],
    ["Notier Sonnencreme und Hut auf die Packliste", { kind: "add", list: "Packliste", items: ["Sonnencreme", "Hut"] }],
    ["Merk dir Einkaufsliste: Milch", { kind: "add", list: "Einkaufsliste", items: ["Milch"] }],
    ["Merk dir das WLAN-Passwort: abc123!", { kind: "create", title: "WLAN-Passwort", text: "abc123!" }],
    ["Halt fest der Code vom Fahrradschloss ist 4711", { kind: "create", title: "Code vom Fahrradschloss", text: "4711" }],
    ["Merk dir dass Oma am Sonntag zu Besuch kommt und Kuchen mag", { kind: "create", title: "Oma am Sonntag zu Besuch …", text: "Oma am Sonntag zu Besuch kommt und Kuchen mag" }],
  ])("%s", (text, expected) => {
    expect(parseNoteCommand(text)).toEqual(expected);
  });

  it("kein Notiz-Satz", () => {
    expect(parseNoteCommand("Mathis wünscht sich Pfannkuchen")).toBeNull();
    expect(parseNoteCommand("Wie ist das Wetter?")).toBeNull();
    expect(parseNoteCommand("Merk dir, Mathis wünscht sich Pizza")).toMatchObject({ kind: "create" });
  });

  it("Antworten zu Listen und Texten – ruhig", () => {
    const liste = createNote({ title: "Packliste", items: ["Pass", "Hut"] });
    liste.data.items![1].done = true;
    expect(noteAnswer(liste)).toBe("Packliste: Pass. (1 schon abgehakt)");
    const alle = createNote({ title: "Fertig", items: ["A"] });
    alle.data.items![0].done = true;
    expect(noteAnswer(alle)).toBe("Fertig: alles abgehakt ✓");
    expect(noteAnswer(createNote({ title: "Leer", items: [] }))).toBe("Leer ist noch leer.");
    const viele = createNote({ title: "Viel", items: Array.from({ length: 14 }, (_, i) => `P${i}`) });
    expect(noteAnswer(viele)).toMatch(/und noch ein paar mehr\.$/);
    expect(noteAnswer(createNote({ title: "WLAN", text: " abc " }))).toBe("WLAN: abc");
    expect(noteAnswer(createNote({ title: "Leer", text: "" }))).toBe("Leer: (leer)");
    expect(noteFor([createNote({ title: "WLAN Passwort", text: "x" })], "WLAN-Passwort")?.data.title).toBe("WLAN Passwort");
  });
});

describe("Schnellnotiz", () => {
  it("Sätze erkennen", () => {
    expect(schnellnotizCommand("Schreib in die Kladde: Handwerker anrufen")).toBe("Handwerker anrufen");
    expect(schnellnotizCommand("Notier mir mal schnell: Müller 0172")).toBe("Müller 0172");
    expect(schnellnotizCommand("Schnellnotiz: Idee")).toBe("Idee");
    expect(schnellnotizCommand("Hallo")).toBeNull();
    expect(isSchnellnotizTidyRequest("Räum meine Schnellnotiz auf")).toBe(true);
    expect(isSchnellnotizTidyRequest("Kladde sortieren")).toBe(true);
    expect(isSchnellnotizTidyRequest("Räum auf")).toBe(false);
    expect(appendLine("", " Milch ")).toBe("Milch");
    expect(appendLine("Brot  \n", "Milch")).toBe("Brot\nMilch");
  });

  it("aufräumen ohne KI: Termin, Aufgabe, Notiz – der Rest bleibt", () => {
    const text = "Morgen um 9 Zahnarzt\n- geschenkpapier kaufen\nMerk dir das WLAN: abc\n\nHandwerker Müller 0172 1234567\nIrgendwas";
    const lines = tidySchnellnotiz(text, "2026-10-20");
    expect(lines.map((l) => l.kind)).toEqual(["termin", "aufgabe", "notiz", null, null]);
    expect(lines[1].draft?.data.title).toBe("Geschenkpapier kaufen");
    expect(withoutLines(text, [lines[0].line, lines[1].line, lines[2].line])).toBe("Handwerker Müller 0172 1234567\nIrgendwas");
  });

  describe("Speicher", () => {
    beforeEach(() => vi.resetModules());

    it("ohne Notiz: leer bzw. alter Zettel; schreiben legt die angeheftete Notiz an", async () => {
      const w = fakeWindow();
      const { loadSchnellnotiz, saveSchnellnotiz } = await import("@/lib/notizen/schnellnotiz");
      const { loadNotes } = await import("@/lib/notizen/store");
      expect(loadSchnellnotiz()).toEqual({ text: "", geaendert: null });
      w.localStorage.setItem("wasgibts.kladde", JSON.stringify({ text: 5 }));
      expect(loadSchnellnotiz()).toEqual({ version: 1, text: "", geaendert: null });
      saveSchnellnotiz("Milch");
      saveSchnellnotiz("Milch\nBrot");
      const notes = loadNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0].data).toMatchObject({ title: "Schnellnotiz", pinned: true, schnell: true, text: "Milch\nBrot" });
    });

    it("alter Zettel wird an bestehende Schnellnotiz angehängt, leerer Zettel ändert nichts", async () => {
      const w = fakeWindow();
      const { adoptSchnellnotiz, saveSchnellnotiz, loadSchnellnotiz } = await import("@/lib/notizen/schnellnotiz");
      adoptSchnellnotiz();
      saveSchnellnotiz("Schon da  ");
      w.localStorage.setItem("wasgibts.kladde", JSON.stringify({ version: 1, text: "Alt", geaendert: "2026-01-01" }));
      adoptSchnellnotiz();
      expect(loadSchnellnotiz().text).toBe("Schon da\nAlt");
      expect(JSON.parse(w.localStorage.getItem("wasgibts.kladde")!)).toEqual({ version: 1, text: "", geaendert: "2026-01-01" });
    });

    it("Notizen-Speicher: falsche Version wird nicht gelesen, Kaputtes fällt weg", async () => {
      fakeWindow({ "wasgibts.notizen": JSON.stringify({ version: 1, notes: [{ id: "a", typ: "notiz", data: { title: "Gut" } }, { id: "b" }] }) });
      const { loadNotes } = await import("@/lib/notizen/store");
      expect(loadNotes().map((n) => n.data.title)).toEqual(["Gut"]);
      vi.resetModules();
      fakeWindow({ "wasgibts.notizen": JSON.stringify({ version: 2, notes: [] }) });
      const again = await import("@/lib/notizen/store");
      expect(again.loadNotes()).toEqual([]);
      vi.resetModules();
      fakeWindow({ "wasgibts.notizen": JSON.stringify({ version: 1, notes: "kaputt" }) });
      expect((await import("@/lib/notizen/store")).loadNotes()).toEqual([]);
    });
  });
});
