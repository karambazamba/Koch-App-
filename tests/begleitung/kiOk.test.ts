// A-027: Karte „Mia braucht kurz dein OK“ – ElevenLabs nur mit Server-Stimme,
// „Nicht jetzt“ schließt nur die Karte (Einwilligung nicht erteilt, Zugangscode unberührt).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kiOkKarteZeigen, kiOkText, stimmeVomServer } from "@/lib/begleitung/kiOk";

describe("KI-OK aufräumen", () => {
  it("ElevenLabs nur, wenn die Stimme vom Server aktiv ist – sonst nur Anthropic", () => {
    expect(kiOkText(false)).toContain("Anthropic");
    expect(kiOkText(false)).not.toContain("ElevenLabs");
    expect(kiOkText(true)).toContain("ElevenLabs");
    expect(kiOkText(true)).not.toMatch(/keine Werbung/i);
    expect(stimmeVomServer(undefined)).toBe(false);
    expect(stimmeVomServer({})).toBe(false);
    expect(stimmeVomServer({ stimme: { sprechen: false, hoeren: false, v: "x" } })).toBe(false);
    expect(stimmeVomServer({ stimme: { sprechen: true, hoeren: false, v: "x" } })).toBe(true);
    expect(stimmeVomServer({ stimme: { sprechen: false, hoeren: true, v: "x" } })).toBe(true);
  });

  it("Karte steht nur ohne Einwilligung, nicht nach „Nicht jetzt“, nicht im Kochtipp", () => {
    expect(kiOkKarteZeigen({ askConsent: true, weggeklickt: false, kochtipp: false })).toBe(true);
    expect(kiOkKarteZeigen({ askConsent: false, weggeklickt: false, kochtipp: false })).toBe(false);
    expect(kiOkKarteZeigen({ askConsent: true, weggeklickt: true, kochtipp: false })).toBe(false);
    expect(kiOkKarteZeigen({ askConsent: true, weggeklickt: false, kochtipp: true })).toBe(false);
  });

  it("„Nicht jetzt“ schließt nur die Karte: kein setCodeLater, keine Einwilligung", () => {
    const panel = readFileSync("src/components/begleitung/HelperPanel.tsx", "utf8");
    const handler = panel.match(/onConsentLater=\{([^}]*\}?)\}/)?.[1] ?? "";
    expect(handler).toBe("() => setConsentLater(true)");
    expect(panel).not.toMatch(/onCodeLater/);
    // Die Karte selbst ruft beim „Nicht jetzt“ nur onLater auf; erteilt wird nur über „Erlauben“
    const bits = readFileSync("src/components/begleitung/ChatBits.tsx", "utf8");
    expect(bits).toMatch(/onClick=\{onLater\}/);
    expect(bits.match(/setEinwilligung\(/g)).toHaveLength(1);
    expect(bits).toMatch(/setEinwilligung\("ki", true\)/);
    const verlauf = readFileSync("src/components/begleitung/ChatHistory.tsx", "utf8");
    expect(verlauf).toMatch(/stimme=\{stimmeVomServer\(status\)\}/);
  });
});
