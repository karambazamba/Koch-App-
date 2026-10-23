// „App heißt Mia“: Startseiten-Kopf und der einmalige iPhone-Hinweis „neu hinzufügen“.
import { describe, expect, it } from "vitest";
import { headerDate } from "@/lib/heute/kopfDatum";
import { MIA_HOME_HINT, miaHomeSteps, showMiaHomeHint } from "@/lib/heute/miaName";

describe("Startseiten-Kopf", () => {
  it("kurzes Datum ohne Punkte: „Fr, 23. Okt“", () => {
    expect(headerDate(new Date("2026-10-23T08:00:00+02:00"))).toBe("Fr, 23. Okt");
    expect(headerDate(new Date("2026-05-01T08:00:00+02:00"))).toBe("Fr, 1. Mai");
  });
});

describe("Hinweis „neu hinzufügen“", () => {
  const base = { platform: "ios" as const, standalone: true, fromBefore: true, seen: false };

  it("nur iPhone/iPad als Web-App, nur alte Installationen, nur einmal", () => {
    expect(showMiaHomeHint(base)).toBe(true);
    expect(showMiaHomeHint({ ...base, platform: "android" })).toBe(false);
    expect(showMiaHomeHint({ ...base, standalone: false })).toBe(false);
    expect(showMiaHomeHint({ ...base, fromBefore: false })).toBe(false);
    expect(showMiaHomeHint({ ...base, seen: true })).toBe(false);
  });

  it("erst sichern, dann entfernen, in Safari neu hinzufügen, wiederherstellen", () => {
    const steps = miaHomeSteps("koch-app-two.vercel.app", "Mia");
    expect(steps.map((s) => s.icon)).toEqual(["sichern", "entfernen", "safari", "teilen", "erlauben"]);
    expect(steps[1].text).toContain("„App entfernen“");
    expect(steps[2].text).toContain("koch-app-two.vercel.app");
    expect(steps[3].text).toContain("„Zum Home-Bildschirm“");
    expect(steps[4].text).toContain("Daten wiederherstellen");
    expect(MIA_HOME_HINT("Mia")).toMatch(/^Ich heiße jetzt Mia\. .*vorher kurz sichern/);
  });
});
