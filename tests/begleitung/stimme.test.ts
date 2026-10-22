import { describe, expect, it } from "vitest";
import { goodVoice, voiceLabel, voiceOfferText, voiceSteps } from "@/lib/begleitung/voiceGuide";

const v = (name: string, extra: Partial<SpeechSynthesisVoice> = {}) => ({ name, voiceURI: `com.apple.voice.${name}`, lang: "de-DE", localService: true, ...extra });

describe("Stimme: Rangfolge", () => {
  it("nur Standard → keine gute Stimme (Hinweis zeigen)", () => {
    expect(goodVoice([v("Anna"), v("Markus"), v("Samantha", { lang: "en-US" })])).toBeNull();
  });
  it("mit Erweitert → Erweitert", () => {
    expect(goodVoice([v("Anna"), v("Anna (Erweitert)")])?.name).toBe("Anna (Erweitert)");
  });
  it("Premium schlägt Erweitert", () => {
    expect(goodVoice([v("Anna (Erweitert)"), v("Anna (Premium)"), v("Anna")])?.name).toBe("Anna (Premium)");
  });
  it("Android: Google Deutsch zählt als gut", () => {
    expect(goodVoice([v("Google Deutsch", { voiceURI: "Google Deutsch", localService: false })])?.name).toBe("Google Deutsch");
  });
  it("Spaß-Stimmen nie", () => {
    expect(goodVoice([v("Eddy (Deutsch (Deutschland))"), v("Grandma (Erweitert)"), v("Shelley"), v("Rocko")])).toBeNull();
  });
  it("lesbare Namen", () => {
    expect(voiceLabel({ name: "Anna (Premium)" })).toBe("Anna (Premium)");
    expect(voiceLabel({ name: "Anna (Deutsch (Deutschland))" })).toBe("Anna");
  });
});

describe("Stimme: Anleitung", () => {
  it("iOS 18 → „Gesprochene Inhalte“, iOS 26 und unbekannt → „Lesen & Sprechen“", () => {
    expect(voiceSteps("ios", 18)[1].text).toContain("Gesprochene Inhalte");
    expect(voiceSteps("ios", 26)[1].text).toContain("Lesen & Sprechen");
    expect(voiceSteps("ios", null)[1].text).toContain("Lesen & Sprechen");
  });
  it("Android: Text-in-Sprache, „Dein Handy“", () => {
    expect(voiceSteps("android", null).map((s) => s.text).join(" ")).toContain("Text-in-Sprache-Ausgabe");
    expect(voiceOfferText("android")).toContain("Dein Handy");
    expect(voiceOfferText("ios")).toContain("Dein iPhone");
  });
});
