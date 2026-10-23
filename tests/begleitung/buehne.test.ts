// Eine Bühne für jedes Gespräch mit Mia: Mia unten (groß, ~64 % der Höhe),
// das Gespräch oben, die Seite dahinter verschwommen. Zustände setzt die App,
// Antippen = zuhören ↔ fertig, „Lieber tippen“ macht Mia klein über dem Feld,
// Mikro aus → direkt das Tippfeld (kein Hilfefenster davor).
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { firstOfRun, STAGE_CENTER, STAGE_SIZE, stageHint, stageLabel, stageLayout, stageState, stageTap, stageTopic } from "@/lib/begleitung/stage";

const on = { blocked: false, supported: true };

describe("Zustände", () => {
  it("zuhören vor überlegen vor sprechen, sonst warten", () => {
    expect(stageState({ listening: true, thinking: true, speaking: true })).toBe("zuhoeren");
    expect(stageState({ listening: false, thinking: true, speaking: true })).toBe("ueberlegen");
    expect(stageState({ listening: false, thinking: false, speaking: true })).toBe("sprechen");
    expect(stageState({ listening: false, thinking: false, speaking: false })).toBe("warten");
  });

  it("Satz unter Mia: beim Zuhören „Fertig? Einfach Mia antippen“, beim Warten eine Einladung", () => {
    expect(stageHint("zuhoeren", "Mia")).toBe("Fertig? Einfach Mia antippen");
    expect(stageHint("warten", "Mia")).toBe("Tipp mich an, wenn du noch was hast");
    expect(stageHint("warten", "Mia", true)).toBe("Tipp mich an und erzähl einfach");
    expect(stageHint("ueberlegen", "Mia")).toBe("");
    expect(stageHint("sprechen", "Mia")).toBe("");
  });
});

describe("Antippen", () => {
  it("einmal = los, nochmal = fertig", () => {
    expect(stageTap("warten", on)).toBe("start");
    expect(stageTap("sprechen", on)).toBe("start");
    expect(stageTap("zuhoeren", on)).toBe("fertig");
    expect(stageLabel("warten", on)).toBe("Frage einsprechen");
    expect(stageLabel("zuhoeren", on)).toBe("Zuhören beenden");
  });

  it("Mikro aus oder nicht vorhanden → Tippfeld statt Hilfefenster", () => {
    expect(stageTap("warten", { blocked: true, supported: true })).toBe("tippen");
    expect(stageTap("warten", { blocked: false, supported: false })).toBe("tippen");
    expect(stageLabel("warten", { blocked: true, supported: true })).toBe("Tippen statt sprechen");
  });
});

describe("Tippen-Modus", () => {
  it("Mia groß (120 px) im unteren Drittel, beim Tippen klein (64 px) über dem Feld", () => {
    expect(STAGE_CENTER).toBeCloseTo(0.64);
    expect(stageLayout({ typing: false, ...on })).toEqual({ field: false, size: STAGE_SIZE.big });
    expect(stageLayout({ typing: true, ...on })).toEqual({ field: true, size: STAGE_SIZE.small });
    expect(STAGE_SIZE).toEqual({ big: 120, small: 64 });
  });

  it("Mikro aus → direkt das Tippfeld", () => {
    expect(stageLayout({ typing: false, blocked: true, supported: true }).field).toBe(true);
    expect(stageLayout({ typing: false, blocked: false, supported: false }).field).toBe(true);
  });
});

describe("Gespräch oben", () => {
  it("Bereichs-Kopf nur mit Anlass", () => {
    expect(stageTopic("kochtipp")).toBe("KOCHIDEE");
    expect(stageTopic("wochencheck")).toBe("WOCHENCHECK");
    expect(stageTopic("voice")).toBeUndefined();
    expect(stageTopic("voice")).toBeUndefined();
    expect(stageTopic(undefined)).toBeUndefined();
  });

  it("kleine Mia nur bei der ersten Blase einer Folge", () => {
    const roles = ["assistant", "assistant", "user", "assistant", "user"] as const;
    expect(roles.map((_, i) => firstOfRun(roles, i))).toEqual([true, false, false, true, false]);
  });
});

describe("Eine Bühne für alles", () => {
  const read = (f: string) => readFileSync(f, "utf8");

  it("Schleier ~75 % über 14 px Unschärfe, kein Mikrofon-Knopf, keine alten Varianten", () => {
    // Unschärfe als Tailwind-Klasse: roh in globals.css blieb nach dem Bauen nur
    // `-webkit-backdrop-filter` übrig – Android/Chrome zeigte die Seite dann scharf
    expect(read("src/components/ui/Sheet.tsx")).toContain("mia-buehne-hintergrund absolute inset-0 bg-background/75 backdrop-blur-[14px]");
    expect(read("src/app/globals.css")).not.toMatch(/backdrop-filter/);
    expect(existsSync("src/components/begleitung/MiaControls.tsx")).toBe(false);
    for (const f of ["src/components/begleitung/MiaStage.tsx", "src/components/begleitung/ChatInputBar.tsx"]) expect(read(f)).not.toMatch(/\bMic\b|MicOff/);
  });

  it("Startseiten-Mia, „＋“ und Wochencheck nutzen dieselbe Bühne", () => {
    for (const f of ["src/components/begleitung/HelperPanel.tsx", "src/components/kalender/WochencheckSheet.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("<MiaLayer");
      expect(src, f).toContain("<StageMia");
      expect(src, f).toContain("Lieber tippen");
    }
  });

  it("Schließen: Bühne sofort weg, eine Kopie von Mia fliegt zurück (fängt keine Tipps ab)", () => {
    // Fehler (Durchklick): verzögertes Schließen hielt die Bühne 0,8 s im Verlauf –
    // ein gleich danach geöffnetes Fenster (Pinnwand-Aufnahme) bekam „Zurück“ ab
    const css = read("src/app/globals.css");
    const stage = read("src/components/begleitung/MiaStage.tsx");
    expect(stage).toMatch(/if \(!reduced\(\)\) flyBack\(\);\s*onClose\(\);/);
    expect(stage).toContain("mia-geist-schleier pointer-events-none");
    expect(stage).toContain('ghost.className = "mia-flug pointer-events-none');
    expect(css).toMatch(/\.mia-geist-schleier \{ animation: mia-aus/);
  });

  it("nach Mias Antwort wartet sie – kurz mithören nur bei einer Rückfrage mit Knöpfen", () => {
    expect(read("src/components/begleitung/HelperPanel.tsx")).toMatch(/endsWith\("\?"\) && withButtons && viaVoice/);
  });
});
