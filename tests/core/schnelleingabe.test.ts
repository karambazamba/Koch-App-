// Schnelleingabe (Tafel 76): „＋ = schreiben, Mia = sprechen“. ➤ speichert
// sofort mit „Notiert: … · Rückgängig“, das Feld bleibt offen; leer = nichts;
// jedes „＋“ ohne Mia und ohne Mikro. Termine und Aufgaben: eigenes Fenster
// (tests/kalender/neueAufgabeTermin.test.ts, Tafel 114).
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, fakeWindow, noBrowser } from "../helpers";
import { dayWord, readQuick, shortDay } from "@/lib/core/schnelleingabe";
import { readSentence } from "@/lib/kalender/sentence";

const TODAY = "2026-10-21"; // Mittwoch

afterEach(() => noBrowser());

describe("Satz lesen (ohne KI)", () => {
  it("Einkauf, Notiz, Pinnwand: Text 1:1", () => {
    for (const kind of ["einkauf", "notiz", "pinnwand"] as const) expect(readQuick(kind, "  Bin um 20 Uhr da ")).toEqual({ kind, title: "Bin um 20 Uhr da" });
  });

  it("Kurze Wochentage: „Fr 16 Uhr“, „am Sa“ – „so gut“ bleibt ein Wort", () => {
    expect(readSentence("Zahnarzt Fr 16 Uhr", TODAY)).toMatchObject({ date: "2026-10-23", time: "16:00", title: "Zahnarzt" });
    expect(readSentence("Kino am Sa", TODAY).date).toBe("2026-10-24");
    expect(readSentence("Das ist so gut", TODAY).date).toBeUndefined();
    expect(readSentence("Mit Oma telefonieren", TODAY).date).toBeUndefined();
    expect(shortDay("2026-10-30")).toBe("Fr, 30. Okt");
    expect(dayWord(TODAY, TODAY)).toBe("Heute");
    expect(dayWord("2026-10-22", TODAY)).toBe("Morgen · Do");
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

  it("leer = nichts (➤ blass)", async () => {
    const s = await setup();
    expect(s.saveQuick(s.readQuick("notiz", "   "), "   ", { kind: "notiz" })).toBe(false);
    expect(s.loadEntries()).toEqual([]);
    expect(s.toast()).toBeNull();
  });

  it("Pinnwand: „Hängt: …“ mit Zitat; Notiz: „Notiert: …“", async () => {
    const s = await setup();
    s.saveQuick(s.readQuick("pinnwand", "Bin um 6 zurück"), "", { kind: "pinnwand", me: "Felix", quote: { id: "x", author: "Lisa", text: "Wann kommst du?" } });
    expect(s.toast()?.text).toBe("Hängt: Bin um 6 zurück");
    const { loadPins } = await import("@/lib/pinnwand");
    expect(loadPins()[0].data).toMatchObject({ author: "Felix", text: "Bin um 6 zurück", replyTo: { author: "Lisa" } });
    s.saveQuick(s.readQuick("notiz", "WLAN: Sonnenblume42"), "", { kind: "notiz" });
    expect(s.toast()?.text).toBe("Notiert: WLAN: Sonnenblume42");
  });

  it("Einkauf: alles kommt auf die Liste (Unsicheres so wie getippt), Rückgängig nimmt alles weg", async () => {
    const s = await setup();
    const ok = s.saveQuick(s.readQuick("einkauf", "Milch, Brot und Quarkbällchen"), "Milch, Brot und Quarkbällchen", { kind: "einkauf", shopping: { weekStart: "2026-10-19" } });
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

  it("jedes „＋“ öffnet die Schnelleingabe bzw. das eine Fenster Aufgabe/Termin – nie Mia", () => {
    for (const f of PLUS) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/openQuick\(|neuEintragen\(/);
      expect(src, f).not.toMatch(/askMiaFirst|openHelper\("eintragen"/);
    }
  });

  it("kein eigenes Mikro in der Schnelleingabe und den Formularen dahinter", () => {
    for (const f of ["src/components/ui/QuickEntry.tsx", "src/components/kalender/eintragen/AufgabeFenster.tsx", "src/components/kalender/eintragen/TerminFenster.tsx", "src/components/kalender/eintragen/EintragTeile.tsx", "src/components/einkauf/QuickAdd.tsx", "src/components/pinnwand/PinSheets.tsx"]) {
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
  it("Kalender: kein langes Drücken auf einen Tag, keine Zeile „Termin am …“, Termine ohne „Erledigt“", () => {
    expect(readFileSync("src/components/kalender/CalendarPage.tsx", "utf8")).not.toMatch(/useDayHold|onContextMenu|HOLD_MS/);
    expect(readFileSync("src/components/kalender/DayPanel.tsx", "utf8")).not.toMatch(/Termin am \{/);
    const items = readFileSync("src/components/kalender/Items.tsx", "utf8");
    const erledigt = items.indexOf('"Doch nicht erledigt" : "Erledigt"');
    expect(items.slice(Math.max(0, erledigt - 700), erledigt)).toContain('item.entry.typ === "aufgabe" && (');
  });
});
