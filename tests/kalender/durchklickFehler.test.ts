// Fehler aus dem Durchklick (A-034/A-037), je einer ein Test:
// 1. Raum-Wahl im offenen Fenster: was man eben korrigiert hat, gilt sofort
//    beim nächsten Eintrag, der Satz „… gewählt“ kommt nie wieder.
// 2. „erledigt von Lisa“, auch wenn Lisa eben erst beigetreten ist
//    (Mitgliederliste neu holen).
// 3. Aufleuchten bei der Rückkehr zur Startseite: nicht verbrauchen, bevor
//    die Kacheln da sind.
// 4. „Freitag …“ im Fenster aus der Kachel: Tag im Satz geht vor.
// 5. Liste einfügen: erst das Fenster laden, dann „Neue Aufgabe“ schließen;
//    ein neues Fenster wartet auf das laufende Aufräum-Zurück
//    (`core/fensterVerlauf.ts`, Test `tests/core/fensterVerlauf.test.ts`).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aufgabe } from "../helpers";
import { raumRaten } from "@/lib/kalender/raum/raten";
import { mitWort } from "@/lib/kalender/raum/gedaechtnis";
import { fromLabel, unbekannteMitglieder } from "@/lib/kalender/abgeben/model";
import { leuchtenWarten } from "@/lib/heute/aufleuchten";
import type { CalendarEntry } from "@/lib/kalender/model";

const src = (f: string) => readFileSync(f, "utf8");

describe("Raum-Wahl im offenen Fenster", () => {
  it("gelerntes Stichwort gilt gleich beim nächsten Satz", () => {
    const leer = { version: 1 as const, worte: [], hinweisGesehen: false };
    const gelernt = mitWort(leer, "tim", "arbeit", "t").worte;
    expect(raumRaten("Tim zurückrufen", "aufgabe", {}).raum).toBe("ich");
    expect(raumRaten("Tim zurückrufen", "aufgabe", { gelernt }).raum).toBe("arbeit");
  });

  it("das Fenster liest Gedächtnis und Hinweis live (nicht einmal beim Öffnen)", () => {
    const hook = src("src/components/kalender/eintragen/useRaumWahl.ts");
    expect(hook).toMatch(/useRaumGedaechtnis\(\)/);
    expect(hook).toMatch(/hinweisAn = vorher === null && !gedaechtnis\.hinweisGesehen/);
    expect(hook).not.toMatch(/gelernteRaeume\(\)|raumHinweisOffen\(\)/);
  });
});

describe("„erledigt von Lisa“ mit eben beigetretener Lisa", () => {
  const felix = { userId: "felix", displayName: "Felix", role: "erwachsen" };
  const lisa = { userId: "lisa", displayName: "Lisa", role: "erwachsen" };
  const erledigt = { ...aufgabe({ title: "Müll rausbringen", doneOn: "2026-10-21", doneBy: "lisa" }, "familie"), besitzer: "felix" } as CalendarEntry;

  it("Lisa fehlt in der gespeicherten Liste → neu nachfragen; danach steht ihr Name da", () => {
    expect(fromLabel(erledigt, "felix", [felix] as never)).toBeNull();
    expect(unbekannteMitglieder(erledigt, "felix", [felix] as never)).toEqual(["lisa"]);
    expect(unbekannteMitglieder(erledigt, "felix", [felix, lisa] as never)).toEqual([]);
    expect(fromLabel(erledigt, "felix", [felix, lisa] as never)).toBe("erledigt von Lisa");
  });

  it("fremde Familien-Aufgabe: Besitzer unbekannt → nachfragen; eigene, lokale und ohne Konto nie", () => {
    const vonLisa = { ...aufgabe({ title: "Blumen gießen" }, "familie"), besitzer: "lisa" } as CalendarEntry;
    expect(unbekannteMitglieder(vonLisa, "felix", [felix] as never)).toEqual(["lisa"]);
    expect(unbekannteMitglieder({ ...vonLisa, besitzer: "felix" }, "felix", [felix] as never)).toEqual([]);
    expect(unbekannteMitglieder({ ...vonLisa, besitzer: "lokal" }, "felix", [felix] as never)).toEqual([]);
    expect(unbekannteMitglieder(vonLisa, null, [] as never)).toEqual([]);
    expect(src("src/components/kalender/abgeben/TaskFrom.tsx")).toMatch(/refreshAccount\(\)/);
  });
});

describe("Aufleuchten bei der Rückkehr zur Startseite", () => {
  it("wartet, bis jede Kachel da ist – höchstens ein paar Sekunden", () => {
    expect(leuchtenWarten(0, 1, 0)).toBe(true);
    expect(leuchtenWarten(1, 2, 5)).toBe(true);
    expect(leuchtenWarten(2, 2, 0)).toBe(false);
    // Kachel nicht auf der Startseite: irgendwann verbraucht, leuchtet nie später
    expect(leuchtenWarten(0, 1, 12)).toBe(false);
    expect(src("src/components/heute/useAufleuchten.ts")).toMatch(/leuchtenWarten\(/);
  });
});

describe("„Freitag …“ im Fenster aus der Kachel", () => {
  it("der Tag des Einstiegs (Kachel-＋ = heute) ist nur Rückfall, der Tag im Satz geht vor", () => {
    const f = src("src/components/kalender/eintragen/AufgabeFenster.tsx");
    expect(f).toMatch(/const tag = ab \?\? gelesen\?\.ab \?\? date \?\? null;/);
    expect(f).toMatch(/useState<string \| null>\(entry \? \(entry\.data\.date \?\? today\) : null\)/);
    expect(f).not.toMatch(/setAb\(date/);
  });
});

describe("Liste einfügen aus „Neue Aufgabe“", () => {
  it("lädt erst das Fenster „Liste einfügen“, dann schließt es „Neue Aufgabe“", () => {
    const f = src("src/components/kalender/eintragen/AufgabeFenster.tsx");
    expect(f).toMatch(/import\("@\/components\/kalender\/liste\/ListeEinfuegen"\)\.then\(\(\) => \{\s*onClose\(\);\s*openListe\(v\);/);
    expect(f).not.toMatch(/\(onClose\(\), openListe\(v\), true\)/);
  });

  it("ein neues Fenster wartet auf das laufende Aufräum-Zurück (Regel in core/fensterVerlauf, eigener Test)", () => {
    const f = src("src/lib/core/useBackCloses.ts");
    expect(f).toMatch(/fensterVerlauf\(/);
    expect(f).toMatch(/verlauf\?\.oeffne\(/);
  });
});
