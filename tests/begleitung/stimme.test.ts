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

describe("Tafel 86: Stimme laden und vorschlagen", () => {
  it("iPhone ab iOS 26: Lesen & Sprechen (unter „Sehen“), Deutsch, laden, antippen, neu öffnen", async () => {
    const { VOICE_HINWEIS } = await import("@/lib/begleitung/voiceGuide");
    const s = voiceSteps("ios", 26).map((x) => x.text);
    expect(s[1]).toContain("„Lesen & Sprechen“ (unter „Sehen“) → „Stimmen“");
    expect(s[1]).toContain("„Gesprochene Inhalte“");
    expect(s.join(" ")).toContain("Premium");
    expect(s.join(" ")).toContain("antippen");
    expect(s.at(-1)).toMatch(/ganz schließen und neu öffnen$/);
    expect(VOICE_HINWEIS).toBe("Laden allein reicht nicht. Danach die Stimme antippen.");
  });

  it("bis iOS 18: Gesprochene Inhalte; Android: Sprachausgabe von Google, Sprachdaten, Samsung", () => {
    expect(voiceSteps("ios", 18)[1].text).toBe("„Gesprochene Inhalte“ → „Stimmen“");
    const a = voiceSteps("android", null).map((x) => x.text).join(" | ");
    expect(a).toContain("„Sprachausgabe von Google“ → ⚙");
    expect(a).toContain("„Sprachdaten installieren“ → „Deutsch“");
    expect(a).toContain("Samsung: „Allgemeine Verwaltung“");
    expect(a).toContain("Samsung: „Text-zu-Sprache“");
  });

  it("neue gute Stimme nach Rückkehr: einmal vorschlagen, nie beim ersten Blick, nie die gewählte", async () => {
    const { goodVoiceIds, neueStimme } = await import("@/lib/begleitung/voiceGuide");
    const good = goodVoiceIds([v("Anna"), v("Anna (Premium)"), v("Markus (Erweitert)")]);
    expect(good).toEqual(["com.apple.voice.Anna (Premium)", "com.apple.voice.Markus (Erweitert)"]);
    expect(neueStimme(good, null, "")).toBeNull();
    expect(neueStimme(good, [], "")).toBe("com.apple.voice.Anna (Premium)");
    expect(neueStimme(good, ["com.apple.voice.Anna (Premium)"], "")).toBe("com.apple.voice.Markus (Erweitert)");
    expect(neueStimme(good, ["com.apple.voice.Anna (Premium)"], "com.apple.voice.Markus (Erweitert)")).toBeNull();
  });

  it("Speicher der bekannten Stimmen: Fremdes verworfen", async () => {
    const { migrateStimmen } = await import("@/lib/begleitung/stimmenStore");
    expect(migrateStimmen({ version: 1, bekannt: ["a", 3, "b"] })).toEqual({ version: 1, bekannt: ["a", "b"] });
    expect(migrateStimmen({ version: 2 })).toBeNull();
  });
});
