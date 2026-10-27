// Auf der Bühne nur EINE Mia (Video 27.10. 21:14): bei den Ideen standen zwei
// Mias mit pulsierendem Ring – in der Karte „Ganz was anderes?“ und groß
// unten. Jetzt: genau eine antippbare Mia (groß unten), im Chat nur das
// kleine Gesicht ohne Ring, ohne Pulsieren, nicht antippbar; Ring nur beim
// Zuhören bzw. „Gleich schick ich’s ab“, nie im Warten, nie zwei zugleich.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { stageRing, type StageState } from "@/lib/begleitung/stage";

const read = (f: string) => readFileSync(f, "utf8");
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith(".tsx") ? [join(dir, f)] : []));
const COMPONENTS = files("src/components");

/** Alles, was auf einer Bühne stehen kann (Ideen, Supermarkt, Kochmodus-Fragen, Wochencheck, Vorschläge) */
const STAGE = [
  "src/components/begleitung/MiaStage.tsx",
  "src/components/begleitung/HelperPanel.tsx",
  "src/components/begleitung/ChatHistory.tsx",
  "src/components/begleitung/ChatTurnItem.tsx",
  "src/components/begleitung/ChatBits.tsx",
  "src/components/begleitung/SpontanBoard.tsx",
  "src/components/begleitung/MarketBoard.tsx",
  "src/components/begleitung/BakingBoard.tsx",
  "src/components/begleitung/ProposalCard.tsx",
  "src/components/begleitung/MiaDoneCard.tsx",
  "src/components/begleitung/TipBubble.tsx",
  "src/components/begleitung/VoiceOffer.tsx",
  "src/components/begleitung/MailCard.tsx",
  "src/components/essen/kochtipp/KochideeViews.tsx",
  "src/components/kalender/WochencheckSheet.tsx",
];

/** Inhalt aller <button …>…</button> (ohne Verschachtelung – Knöpfe stecken nie in Knöpfen) */
const buttons = (src: string) => [...src.matchAll(/<button\b[\s\S]*?<\/button>/g)].map((m) => m[0]);

describe("Ring um die große Mia", () => {
  it("Wellen nur beim Zuhören, in der Stille vor dem Abschicken nur der ablaufende Ring", () => {
    expect(stageRing("zuhoeren")).toBe("wellen");
    expect(stageRing("zuhoeren", true)).toBe("pause");
    expect(stageRing("warten", true)).toBe("pause");
  });

  it("im Warten, Überlegen und Sprechen kein Ring", () => {
    for (const s of ["warten", "ueberlegen", "sprechen"] as StageState[]) expect(stageRing(s)).toBeNull();
  });

  it("nie zwei Ringe gleichzeitig: Wellen und Ablauf-Ring hängen an demselben einen Wert", () => {
    const stage = read("src/components/begleitung/MiaStage.tsx");
    expect(stage).toContain('ring === "wellen"');
    expect(stage).toContain('ring === "pause"');
    expect(stage).not.toMatch(/state === "warten" \? "ruhig"/);
    expect(read("src/app/globals.css")).not.toMatch(/\.mia-wellen\.ruhig|\.mia-einladen/);
  });
});

describe("Genau eine antippbare Mia auf der Bühne", () => {
  it("Wellen und Ablauf-Ring gibt es nur an der großen Mia (MiaStage)", () => {
    for (const f of COMPONENTS.filter((f) => !f.endsWith("MiaStage.tsx"))) {
      expect(read(f), f).not.toMatch(/mia-wellen|data-pause-ring|mia-einladen/);
    }
  });

  it("in Bühnen-Teilen steckt kein Mia-Gesicht in einem Knopf – außer der großen Mia", () => {
    for (const f of STAGE) {
      const inButtons = buttons(read(f)).filter((b) => b.includes("BegleitungAvatar"));
      if (f.endsWith("MiaStage.tsx")) {
        expect(inButtons).toHaveLength(1);
        expect(inButtons[0]).toContain("data-buehne-mia");
      } else expect(inButtons, f).toEqual([]);
    }
  });

  it("kleines Gesicht neben Mias Sätzen: ohne Ring, ohne Pulsieren, nicht antippbar", () => {
    for (const f of ["src/components/begleitung/MiaStage.tsx", "src/components/begleitung/ChatTurnItem.tsx"]) {
      const line = read(f).split("\n").find((l) => l.includes("<BegleitungAvatar size={36} />"));
      expect(line, f).toBeDefined();
      expect(line).not.toMatch(/onClick|button|mia-wellen|pulse|zwinkern|atmet/);
    }
  });

  it("die Karte „Ganz was anderes?“ ist weg, stattdessen Vorschlags-Knöpfe", () => {
    const views = read("src/components/essen/kochtipp/KochideeViews.tsx");
    expect(views).not.toMatch(/MiaInvite|Ganz was anderes|BegleitungAvatar/);
    expect(views).toContain("Oder worauf hast du Lust?");
    expect(views).toContain('chipClass(false, "vorschlag")');
  });
});
