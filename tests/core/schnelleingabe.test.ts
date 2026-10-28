// Schnelleingabe (Tafel 76): „＋ = schreiben, Mia = sprechen“. Satz → Chips ohne
// KI (Termin: Tag · Uhrzeit + Familie/Arbeit; Aufgabe: „bis …“/„heute“/kein
// Tag + „Familie“); ➤ speichert sofort mit „Eingetragen: … · Rückgängig“,
// das Feld bleibt offen; leer = nichts; jedes „＋“ ohne Mia und ohne Mikro.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, fakeWindow, noBrowser } from "../helpers";
import { dayChoices, quickChips, readQuick, shortDay, whenChip } from "@/lib/core/schnelleingabe";
import { readSentence } from "@/lib/kalender/sentence";

const TODAY = "2026-10-21"; // Mittwoch

afterEach(() => noBrowser());

describe("Satz → Chips (ohne KI)", () => {
  it("Termin: „Zahnarzt Jonne Fr 16 Uhr“ → „Fr, 23. Okt · 16:00“ + „Familie“", () => {
    const r = readQuick("termin", "Zahnarzt Jonne Fr 16 Uhr", TODAY);
    expect(r).toMatchObject({ kind: "termin", title: "Zahnarzt Jonne", date: "2026-10-23", time: "16:00", room: "familie" });
    expect(quickChips(r, TODAY).map((c) => c.label)).toEqual(["Fr, 23. Okt · 16:00", "Familie"]);
  });

  it("Termin ohne Tag nimmt den vorgewählten Tag (Kalender) bzw. heute; ohne Uhrzeit ganztägig", () => {
    expect(readQuick("termin", "Oma Geburtstag", TODAY, { date: "2026-10-30" })).toMatchObject({ date: "2026-10-30", time: null });
    expect(quickChips(readQuick("termin", "Oma Geburtstag", TODAY, { date: "2026-10-30" }), TODAY)[0].label).toBe("Fr, 30. Okt · ganztägig");
    expect(quickChips(readQuick("termin", "Kita 8 Uhr", TODAY), TODAY)[0].label).toBe("Heute · 8:00");
    expect(quickChips(readQuick("termin", "morgen 9 Uhr Physio", TODAY), TODAY)[0].label).toBe("Morgen · Do · 9:00");
  });

  it("Termin: Arbeit erkannt; Chip antippen ändert (Tag, ganztägig, Raum) – Hand geht vor Text", () => {
    expect(readQuick("termin", "Meeting mit dem Team Freitag 10 Uhr", TODAY)).toMatchObject({ room: "arbeit" });
    const picked = readQuick("termin", "Zahnarzt Fr 16 Uhr", TODAY, { pick: { date: "2026-10-26", allDay: true, room: "arbeit" } });
    expect(picked).toMatchObject({ date: "2026-10-26", time: null, room: "arbeit" });
  });

  it("Aufgabe: „bis Mi, 28. Okt“ / „heute“ / ohne Tag = heute + „Familie“", () => {
    const due = readQuick("aufgabe", "Steuer abgeben bis Dienstag", TODAY);
    expect(quickChips(due, TODAY).map((c) => c.label)).toEqual(["bis Di, 27. Okt", "Familie"]);
    expect(quickChips(readQuick("aufgabe", "Blumen gießen heute", TODAY), TODAY)[0].label).toBe("heute");
    // Alles ist heute (Tafel 103): ohne Tag steht „heute“ da
    expect(quickChips(readQuick("aufgabe", "Malersachen kaufen", TODAY), TODAY).map((c) => c.label)).toEqual(["heute", "Familie"]);
    // Startseiten-Kachel gibt „heute“ vor
    expect(quickChips(readQuick("aufgabe", "Malersachen kaufen", TODAY, { date: TODAY }), TODAY)[0].label).toBe("heute");
    expect(whenChip("morgen", TODAY)).toBe("Morgen · Do");
    expect(whenChip(null, TODAY)).toBe("heute");
  });

  it("Einkauf, Notiz, Pinnwand: Text 1:1, keine Chips", () => {
    for (const kind of ["einkauf", "notiz", "pinnwand"] as const) {
      const r = readQuick(kind, "  Bin um 20 Uhr da ", TODAY);
      expect(r).toEqual({ kind, title: "Bin um 20 Uhr da" });
      expect(quickChips(r, TODAY)).toEqual([]);
    }
  });

  it("Kurze Wochentage: „Fr 16 Uhr“, „am Sa“ – „so gut“ bleibt ein Wort", () => {
    expect(readSentence("Zahnarzt Fr 16 Uhr", TODAY)).toMatchObject({ date: "2026-10-23", time: "16:00", title: "Zahnarzt" });
    expect(readSentence("Kino am Sa", TODAY).date).toBe("2026-10-24");
    expect(readSentence("Das ist so gut", TODAY).date).toBeUndefined();
    expect(readSentence("Mit Oma telefonieren", TODAY).date).toBeUndefined();
    expect(shortDay("2026-10-30")).toBe("Fr, 30. Okt");
    expect(dayChoices(TODAY, 3).map((d) => d.label)).toEqual(["Heute", "Morgen · Do", "Fr, 23. Okt"]);
  });
});

describe("Speichern: sofort, mit Rückgängig, Feld bleibt offen", () => {
  async function setup() {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-21T10:30");
    const save = await import("@/components/ui/quickSave");
    const quick = await import("@/lib/core/schnelleingabe");
    const toast = await import("@/lib/core/toast");
    const { loadEntries } = await import("@/lib/kalender/store");
    const undo = await import("@/lib/core/undo");
    let shown: { text: string; undo?: () => void } | null = null;
    vi.spyOn(toast, "showToast").mockImplementation((t) => void (shown = t));
    return { ...save, ...quick, loadEntries, undo, toast: () => shown };
  }

  it("Aufgabe: ➤ legt an → „Eingetragen: …“ → Rückgängig nimmt sie weg", async () => {
    const s = await setup();
    const read = s.readQuick("aufgabe", "Malersachen kaufen", TODAY, { date: TODAY });
    expect(s.saveQuick(read, "Malersachen kaufen", { kind: "aufgabe" })).toBe(true);
    const task = s.loadEntries().find((e) => e.data.title === "Malersachen kaufen");
    expect(task).toMatchObject({ typ: "aufgabe", raum: "familie", data: { date: TODAY } });
    expect(s.toast()?.text).toBe("Eingetragen: Malersachen kaufen");
    s.toast()!.undo!();
    expect(s.loadEntries().some((e) => e.data.title === "Malersachen kaufen")).toBe(false);
  });

  it("Termin mit Uhrzeit: Erinnerung 30 Min vorher; auch „Mach das rückgängig“ (Mia) geht", async () => {
    const s = await setup();
    const read = s.readQuick("termin", "Zahnarzt Jonne Fr 16 Uhr", TODAY);
    s.saveQuick(read, "Zahnarzt Jonne Fr 16 Uhr", { kind: "termin" });
    expect(s.loadEntries().find((e) => e.typ === "termin")).toMatchObject({ data: { title: "Zahnarzt Jonne", date: "2026-10-23", start: "16:00", reminder: "30" } });
    expect(s.undo.undoLast()).toBeTruthy();
    expect(s.loadEntries().some((e) => e.typ === "termin")).toBe(false);
  });

  it("leer = nichts (➤ blass)", async () => {
    const s = await setup();
    expect(s.saveQuick(s.readQuick("aufgabe", "   ", TODAY), "   ", { kind: "aufgabe" })).toBe(false);
    expect(s.loadEntries()).toEqual([]);
    expect(s.toast()).toBeNull();
  });

  it("Pinnwand: „Hängt: …“ mit Zitat; Notiz: „Notiert: …“", async () => {
    const s = await setup();
    s.saveQuick(s.readQuick("pinnwand", "Bin um 6 zurück", TODAY), "", { kind: "pinnwand", me: "Felix", quote: { id: "x", author: "Lisa", text: "Wann kommst du?" } });
    expect(s.toast()?.text).toBe("Hängt: Bin um 6 zurück");
    const { loadPins } = await import("@/lib/pinnwand");
    expect(loadPins()[0].data).toMatchObject({ author: "Felix", text: "Bin um 6 zurück", replyTo: { author: "Lisa" } });
    s.saveQuick(s.readQuick("notiz", "WLAN: Sonnenblume42", TODAY), "", { kind: "notiz" });
    expect(s.toast()?.text).toBe("Notiert: WLAN: Sonnenblume42");
  });

  it("Einkauf: alles kommt auf die Liste (Unsicheres so wie getippt), Rückgängig nimmt alles weg", async () => {
    const s = await setup();
    const ok = s.saveQuick(s.readQuick("einkauf", "Milch, Brot und Quarkbällchen", TODAY), "Milch, Brot und Quarkbällchen", { kind: "einkauf", shopping: { weekStart: "2026-10-19" } });
    expect(ok).toBe(true);
    expect(s.toast()?.text).toMatch(/^Auf der Liste: Milch, Brot, Quarkbällchen/);
    const { store } = await import("@/lib/einkauf/listStore");
    expect(store.load()!.weeks["2026-10-19"].manual).toHaveLength(3);
    s.toast()!.undo!();
    expect(store.load()!.weeks["2026-10-19"].manual).toHaveLength(0);
  });

  it("Öffnen: wartet, bis jemand zuhört; danach direkt", async () => {
    const s = await setup();
    const got: string[] = [];
    s.openQuick({ kind: "termin" });
    const off = s.onOpenQuick((r) => got.push(r.kind));
    s.openQuick({ kind: "aufgabe" });
    off();
    expect(got).toEqual(["termin", "aufgabe"]);
  });
});

describe("Regel „＋ = schreiben, Mia = sprechen“", () => {
  const PLUS = [
    "src/components/heute/MiniCards.tsx",
    "src/components/kalender/CalendarPage.tsx",
    "src/components/kalender/DayView.tsx",
    "src/components/kalender/TasksView.tsx",
    "src/components/einkauf/QuickAdd.tsx",
  ];

  it("Pinnwand: das ＋ öffnet „Neuer Zettel“ (Tafel 106) – ein Feld auf dem Zettel, Tastatur sofort, nie Mia", () => {
    for (const f of ["src/components/pinnwand/PinboardTile.tsx", "src/components/pinnwand/PinboardView.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/<NeuerZettel /);
      expect(src, f).not.toMatch(/openHelper|askMiaFirst/);
    }
    expect(readFileSync("src/components/pinnwand/NeuerZettel.tsx", "utf8")).toMatch(/autoFocus=\{art === "zettel"\}/);
  });

  it("Notizen: das Seiten-Plus öffnet eine neue leere Notiz zum Bearbeiten (Tafel 93)", () => {
    expect(readFileSync("src/components/notizen/NotesView.tsx", "utf8")).toMatch(/PagePlus[^\n]*\/notizen\/bearbeiten\?neu=text/);
  });

  it("jedes „＋“ öffnet die Schnelleingabe – nie Mia", () => {
    for (const f of PLUS) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/openQuick\(/);
      expect(src, f).not.toMatch(/askMiaFirst|openHelper\("eintragen"/);
    }
  });

  it("kein eigenes Mikro in der Schnelleingabe und den Formularen dahinter", () => {
    for (const f of ["src/components/ui/QuickEntry.tsx", "src/components/kalender/EntryForm.tsx", "src/components/einkauf/QuickAdd.tsx", "src/components/pinnwand/PinSheets.tsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/useSpeechInput|MicStrip|<Mic /);
    }
  });

  it("Feld 16 px, Tastatur sofort, ➤ blass solange leer, „Mehr Details“, schließt über das eine Fenster", () => {
    const src = readFileSync("src/components/ui/QuickEntry.tsx", "utf8");
    expect(src).toMatch(/INPUT_BASE/);
    expect(src).toMatch(/autoFocus/);
    expect(src).toMatch(/ready \? "" : "opacity-35"/);
    expect(src).toContain("Mehr Details");
    expect(src).toMatch(/<Sheet/);
    expect(readFileSync("CLAUDE.md", "utf8")).toContain("＋ = schreiben, Mia = sprechen");
  });
});

at("2026-10-21T10:30");

describe("Launch 1.0: ein Weg zum Eintragen", () => {
  it("„Mehr Details“ öffnet überall das eine Formular (Titel + ✕, oranges „Speichern“)", () => {
    for (const f of ["src/components/heute/MiniCards.tsx", "src/components/kalender/CalendarPage.tsx", "src/components/kalender/TasksView.tsx", "src/components/kalender/DayView.tsx", "src/components/heute/DemoBits.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/TerminQuickAdd|TaskQuickAdd/);
      expect(src, f).toMatch(/<EntryForm /);
    }
    const form = readFileSync("src/components/kalender/EntryForm.tsx", "utf8");
    expect(form).not.toMatch(/Abbrechen|Sichern/);
    expect(form).toMatch(/buttonClass\("primary"\)[^\n]*\n\s*Speichern/);
  });

  it("Kalender: kein langes Drücken auf einen Tag, keine Zeile „Termin am …“, Termine ohne „Erledigt“", () => {
    expect(readFileSync("src/components/kalender/CalendarPage.tsx", "utf8")).not.toMatch(/useDayHold|onContextMenu|HOLD_MS/);
    expect(readFileSync("src/components/kalender/DayPanel.tsx", "utf8")).not.toMatch(/Termin am \{/);
    const items = readFileSync("src/components/kalender/Items.tsx", "utf8");
    const erledigt = items.indexOf('"Doch nicht erledigt" : "Erledigt"');
    expect(items.slice(Math.max(0, erledigt - 700), erledigt)).toContain('item.entry.typ === "aufgabe" && (');
  });
});
