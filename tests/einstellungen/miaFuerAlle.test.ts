// Mia für alle (allein, zu zweit, Familie): Wörter je Haushaltsart,
// Startfrage, Voreinstellungen, Beispiel-Tag je Art und Wochentag,
// bestehende Profile unverändert.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { einladenKnopf, haushaltOf, raumName, teilenSatz, zuZweitVorschlag } from "@/lib/core/haushalt";
import { demoDay, demoEntries } from "@/lib/core/demo";
import { ERSTER_START, steckbrief } from "@/lib/mia/persona";
import { at, fakeWindow } from "../helpers";

beforeEach(() => {
  at("2026-10-21T08:00");
  vi.resetModules();
});

describe("Wörter je Haushaltsart", () => {
  it("Bereich, Einladen, Teilen-Satz", () => {
    expect([raumName("allein"), raumName("paar"), raumName("familie")]).toEqual(["Privat", "Wir", "Familie"]);
    expect([einladenKnopf("allein"), einladenKnopf("paar"), einladenKnopf("familie")]).toEqual(["Jemanden dazuholen", "Partner einladen", "Familie einladen"]);
    expect(teilenSatz("allein")).toBeNull();
    expect(teilenSatz("paar")).toBe("Ihr beide seht dasselbe.");
  });

  it("Profil-Werte: single = allein, paar und WG = Wir, sonst Familie (auch ohne Profil)", () => {
    expect(haushaltOf("single")).toBe("allein");
    expect(haushaltOf("paar")).toBe("paar");
    expect(haushaltOf("wg")).toBe("paar");
    expect(haushaltOf("familie")).toBe("familie");
    expect(haushaltOf(undefined)).toBe("familie");
  });

  it("aus „allein“ werden zwei: einmal fragen", () => {
    expect(zuZweitVorschlag("allein", 2, false)).toBe("Seid ihr zu zweit? Dann heißt der Bereich ‚Wir‘.");
    expect(zuZweitVorschlag("allein", 2, true)).toBeNull();
    expect(zuZweitVorschlag("allein", 1, false)).toBeNull();
    expect(zuZweitVorschlag("paar", 2, false)).toBeNull();
  });

  it("Rolle: persönliche Assistentin, Leitsatz, Startbildschirm", () => {
    expect(steckbrief("Mia")).toContain("persönliche Assistentin");
    expect(steckbrief("Mia")).toContain("Ich sortier deinen Alltag.");
    expect(steckbrief("Mia")).not.toContain("Familienmanagerin");
    expect(ERSTER_START.titel).toBe("Kein Stress. Ich sortier deinen Alltag, Stück für Stück.");
    expect(readFileSync("src/lib/begleitung/prompt.ts", "utf8")).not.toContain("Familienmanagerin");
  });

  it("Oberfläche nimmt den Namen aus `useRaumName` bzw. `useHaushalt` statt fest „Familie“", () => {
    for (const f of ["src/components/kalender/TasksView.tsx", "src/components/kalender/CalendarPage.tsx", "src/components/notizen/NotesView.tsx", "src/components/kalender/eintragen/AufgabeFenster.tsx", "src/components/kalender/eintragen/TerminFenster.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/useRaumName\(\)|useHaushalt\(\)|useRaumWahl\(/);
      expect(src, f).not.toMatch(/label: "Familie"/);
    }
  });
});

describe("Beispiel-Tag je Haushaltsart", () => {
  it("allein: Laufen, Meeting, Yoga; Wochenende Brunch, Freunde, Kino", () => {
    expect(demoDay("2026-10-21", "allein").map((t) => t.title)).toEqual(["Laufen", "Meeting", "Mittag mit Jana", "Yoga", "Serie"]);
    expect(demoDay("2026-10-24", "allein").map((t) => t.title)).toEqual(["Brunch", "Freunde treffen", "Kino"]);
  });

  it("zu zweit: Wocheneinkauf, Kochen zusammen, Kino; Wochenende Frühstück, Ausflug, Essen gehen", () => {
    expect(demoDay("2026-10-21", "paar").map((t) => t.title)).toContain("Zusammen kochen");
    expect(demoDay("2026-10-24", "paar").map((t) => t.title)).toEqual(["Frühstück", "Ausflug an die Ostsee", "Essen gehen"]);
  });

  it("Familie wie bisher, ohne Angabe ebenso; allein ohne Pinnwand-Aufgabe", () => {
    expect(demoDay("2026-10-21")).toEqual(demoDay("2026-10-21", "familie"));
    expect(demoDay("2026-10-21").map((t) => t.title)).toContain("Kita bringen");
    const titles = demoEntries("2026-10-21", 6 * 60, "Mia", "allein").entries.map((e) => (e.data as { title: string }).title);
    expect(titles).not.toContain("Pinnwand ausprobieren");
    expect(titles).toContain("Laufen");
  });
});

describe("Startfrage und Voreinstellungen", () => {
  it("„Nur für mich“: Profil single, Pinnwand-Kachel aus; „Für uns zwei“: Pinnwand an", async () => {
    fakeWindow();
    const { startFresh } = await import("@/lib/einstellungen/welcomeStore");
    const { loadProfile } = await import("@/lib/einstellungen/profileStore");
    const { loadHomeTiles } = await import("@/lib/core/homeLayout");
    startFresh("farbig", "allein");
    expect(loadProfile()?.householdType).toBe("single");
    expect(loadHomeTiles()?.find((t) => t.id === "pinnwand")?.visible).toBe(false);
    startFresh("farbig", "paar");
    expect(loadProfile()?.householdType).toBe("paar");
    expect(loadHomeTiles()?.find((t) => t.id === "pinnwand")?.visible).toBe(true);
  });

  it("bestehende Profile bleiben, wie sie sind (kein neues Feld, keine Migration)", () => {
    const model = readFileSync("src/lib/einstellungen/profileModel.ts", "utf8");
    expect(model).toMatch(/version: 22;/);
  });
});
