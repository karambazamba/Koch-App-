// EIN Fenster „Neue Aufgabe“ und EIN Fenster „Neuer Termin“ (Tafel 114):
// jeder Einstieg (＋ auf der Startseiten-Kachel, ＋ oben auf der Aufgaben-
// bzw. Termin-Seite, ＋ im Kalender, Dein Tag/Bearbeiten, Beispiel-Tag)
// öffnet genau diese Komponente über `neuEintragen`/`eintragAendern`. Kein
// anderes Formular, kein Termin/Aufgabe-Umschalter, kein „Mehr Details“.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const src = (f: string) => readFileSync(f, "utf8");
const alle = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? alle(join(dir, f)) : /\.tsx?$/.test(f) ? [join(dir, f)] : []));

/** Alle Einstiege, die eine Aufgabe oder einen Termin anlegen bzw. ändern */
const EINSTIEGE: [string, RegExp][] = [
  ["src/components/heute/MiniCards.tsx", /neuEintragen\("termin", today\)[\s\S]*neuEintragen\("aufgabe", addOn\)/],
  ["src/components/kalender/TasksView.tsx", /PagePlus label="Neue Aufgabe" onClick=\{\(\) => neuEintragen\("aufgabe"\)\}/],
  ["src/components/kalender/CalendarPage.tsx", /PagePlus label="Neuer Termin" onClick=\{\(\) => neuEintragen\("termin", day\)\}/],
  ["src/components/kalender/DayView.tsx", /neuEintragen\("termin", date\)/],
  ["src/components/heute/DemoBits.tsx", /neuEintragen\(termin \? "termin" : "aufgabe"/],
  ["src/components/kalender/Items.tsx", /eintragAendern\(item\.entry\)/],
];

describe("Ein Fenster je Art", () => {
  it("jeder Einstieg öffnet das eine Fenster über `neuEintragen` bzw. `eintragAendern`", () => {
    for (const [f, re] of EINSTIEGE) expect(src(f), f).toMatch(re);
  });

  it("niemand öffnet Aufgabe/Termin an `oeffnen.ts` vorbei, kein altes Formular mehr", () => {
    expect(existsSync("src/components/kalender/EntryForm.tsx")).toBe(false);
    for (const f of alle("src")) {
      const s = src(f);
      expect(s, f).not.toMatch(/EntryForm|TerminQuickAdd|TaskQuickAdd/);
      if (!f.endsWith("kalender/eintragen/oeffnen.ts")) expect(s, f).not.toMatch(/openQuick\(\{\s*kind:\s*"(aufgabe|termin)"/);
    }
  });

  it("die Schnelleingabe zeigt für Aufgaben `AufgabeFenster`, für Termine `TerminFenster` – auch zum Ändern", () => {
    const host = src("src/components/ui/QuickEntryHost.tsx");
    expect(host).toMatch(/request\.kind === "aufgabe"\) return <AufgabeFenster [^\n]*entry=\{request\.entry/);
    expect(host).toMatch(/request\.kind === "termin"\) return <TerminFenster [^\n]*entry=\{request\.entry/);
    expect(src("src/components/ui/QuickEntry.tsx")).not.toMatch(/kind === "termin"|kind === "aufgabe"|quickChips|WHEN_CHOICES/);
  });

  it("`neuEintragen`/`eintragAendern` gehen über dieselbe Schnelleingabe", async () => {
    vi.resetModules();
    const quick = await import("@/lib/core/schnelleingabe");
    const { neuEintragen, eintragAendern } = await import("@/lib/kalender/eintragen/oeffnen");
    const got: unknown[] = [];
    const g = globalThis as unknown as { window?: unknown };
    const listeners: ((e: Event) => void)[] = [];
    g.window = { addEventListener: (_: string, l: (e: Event) => void) => listeners.push(l), removeEventListener: () => {}, dispatchEvent: (e: Event) => (listeners.forEach((l) => l(e)), true) };
    const off = quick.onOpenQuick((r) => got.push(r));
    neuEintragen("aufgabe", "2026-10-30");
    neuEintragen("termin");
    const entry = { id: "x", typ: "termin" } as never;
    eintragAendern(entry);
    off();
    delete g.window;
    expect(got).toEqual([{ kind: "aufgabe", date: "2026-10-30" }, { kind: "termin" }, { kind: "termin", entry }]);
  });
});

describe("Fenster „Neue Aufgabe“ (Bild 1–3)", () => {
  const f = src("src/components/kalender/eintragen/AufgabeFenster.tsx");
  const teile = src("src/components/kalender/eintragen/EintragTeile.tsx");

  it("EIN Feld „Was steht an?“, Tastatur sofort, ↑; Return speichert und lässt das Feld offen", () => {
    expect(f).toMatch(/title=\{entry \? "Aufgabe" : "Neue Aufgabe"\}/);
    expect(f).toMatch(/placeholder="Was steht an\?"/);
    expect(teile).toMatch(/autoFocus/);
    expect(teile).toMatch(/enterKeyHint="send"/);
    expect(teile).toMatch(/<ArrowUp /);
    expect(f).toMatch(/onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\);\s*save\(false\);/);
    expect(f).toMatch(/else reset\(\);/);
    expect(f).toMatch(/field\.current\?\.focus\(\)/);
    expect(src("src/components/kalender/eintragen/speichern.ts")).toMatch(/text: "Steht drin"/);
  });

  it("EINE Zeile: Schalter (genau einer, aktiv weiß mit Raumfarbe), Glocke 42 px, leise „Mehr ›“; Hinweis", () => {
    expect(teile).toMatch(/role="radiogroup" aria-label="Wer sieht es\?"/);
    expect(teile).toMatch(/familie: "text-accent-strong", ich: "text-ich", arbeit: "text-work"/);
    expect(teile).toMatch(/bg-surface shadow-card \$\{AKTIV\[r\]\}/);
    expect(teile).toMatch(/h-\[42px\] w-\[42px\]/);
    expect(teile).toMatch(/border-accent text-accent-strong/);
    expect(teile).toMatch(/Mehr <ChevronRight/);
    expect(f).toMatch(/raumMerken\(raum\)/);
    expect(f).toMatch(/startRaum\(\{ letzte: letzterRaum\(\), feierabend: feierabend \|\| ruht, haushalt \}\)/);
  });

  it("„Mehr“: genau drei Zeilen – Ab wann, Wiederholen, An jemanden geben – und „Speichern“", () => {
    const zeilen = [...f.matchAll(/<MehrZeile label="([^"]+)"/g)].map((m) => m[1]);
    expect(zeilen).toEqual(["Ab wann", "Wiederholen", "An jemanden geben"]);
    expect(f).toMatch(/Speichern/);
  });

  it("entfernt: Termin/Aufgabe-Umschalter, Uhrzeit, Bis spätestens, Irgendwann/Diese Woche, Etikett-Chips, „Mehr Details“", () => {
    for (const datei of ["AufgabeFenster.tsx", "TerminFenster.tsx", "EintragTeile.tsx"]) {
      const s = src(`src/components/kalender/eintragen/${datei}`);
      expect(s, datei).not.toMatch(/label="Art"|Bis spätestens|Irgendwann|Diese Woche|Etikett|Mehr Details|LABEL_SUGGESTIONS|useSpeechInput/);
    }
    expect(f).not.toMatch(/type="time"/);
  });
});

describe("Fenster „Neuer Termin“ (Bild 4)", () => {
  const f = src("src/components/kalender/eintragen/TerminFenster.tsx");

  it("EIN Feld „Zahnarzt Freitag 13 Uhr“, blaue Chips Tag · Uhrzeit · Dauer, „Uhrzeit?“ hervorgehoben", () => {
    expect(f).toMatch(/title=\{entry \? "Termin" : "Neuer Termin"\}/);
    expect(f).toMatch(/placeholder="Zahnarzt Freitag 13 Uhr"/);
    expect(f).toMatch(/bg-work-soft text-work/);
    expect(f).toMatch(/chip\("uhr", time \? uhr\(time\) : "Uhrzeit\?", !time\)/);
    expect(f).toMatch(/chip\("dauer"/);
    expect(f).toMatch(/Tag und Uhrzeit hab ich rausgelesen\. Antippen = ändern\./);
    expect(f).toMatch(/if \(!bereit\) return void \(setAuf\("uhr"\)/);
  });

  it("gleiche Zeile Raum | Glocke (Erinnern vorher) | Mehr (Ort, Wiederholen, ganztägig, Personen)", () => {
    expect(f).toMatch(/<EintragZeile/);
    expect(f).toMatch(/label="Erinnern vorher"/);
    expect(f).toMatch(/<MehrZeile label="Ort"[\s\S]*<MehrZeile label="Wiederholen"[\s\S]*Ganztägig[\s\S]*<MehrZeile label="Personen"/);
  });
});
