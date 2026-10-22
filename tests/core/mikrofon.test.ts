import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyMicError, guardMic, iosMajor, micPlatform, micState, micSteps, preAskText, reportMicBlocked, resetMicState, setMicPermission } from "@/lib/core/mic";

const IPHONE_18 = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const IPHONE_17 = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const PIXEL = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";

beforeEach(() => resetMicState());

describe("Mikrofon: Gerät und Fehler", () => {
  it("erkennt iPhone/Android und die iOS-Version", () => {
    expect(micPlatform(IPHONE_18)).toBe("ios");
    expect(micPlatform(PIXEL)).toBe("android");
    expect(micPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("andere");
    expect(iosMajor(IPHONE_18)).toBe(18);
    expect(iosMajor(IPHONE_17)).toBe(17);
    expect(iosMajor(PIXEL)).toBeNull();
  });

  it("ordnet Fehler ein: gesperrt, Diktieren aus (nur iPhone), sonst nichts", () => {
    expect(classifyMicError("NotAllowedError", "ios")).toBe("gesperrt");
    expect(classifyMicError("not-allowed", "android")).toBe("gesperrt");
    expect(classifyMicError("service-not-allowed", "ios")).toBe("diktat_aus");
    expect(classifyMicError("service-not-allowed", "android")).toBe("gesperrt");
    expect(classifyMicError("no-speech", "ios")).toBeNull();
    expect(classifyMicError("NotFoundError", "ios")).toBeNull();
  });

  it("Texte: iPhone vs. Handy", () => {
    expect(preAskText("ios").text).toContain("dein iPhone");
    expect(preAskText("android").text).toContain("dein Handy");
    expect(preAskText("android").allow).toBe("Zulassen");
  });

  it("Schritte: iOS 18 mit „Apps“, iOS 17 ohne, Android, Diktieren", () => {
    expect(micSteps("ios", "gesperrt", 18).map((s) => s.text)[1]).toContain("„Apps“");
    expect(micSteps("ios", "gesperrt", null).map((s) => s.text)[1]).toContain("„Apps“");
    expect(micSteps("ios", "gesperrt", 17).map((s) => s.text)[1]).toContain("„Safari“");
    expect(micSteps("android", "gesperrt", null).map((s) => s.text)).toEqual([
      "Tippe oben links neben der Adresse auf das Symbol (Schieberegler oder Schloss)",
      "Tippe auf „Berechtigungen“",
      "Tippe auf „Mikrofon“",
      "Wähle „Zulassen“",
    ]);
    expect(micSteps("ios", "diktat_aus", 18).map((s) => s.text)[3]).toContain("Diktierfunktion");
    for (const s of [...micSteps("ios", "gesperrt", 18), ...micSteps("android", "gesperrt", null)]) expect(s.screen.rows[s.screen.target]).toBeTruthy();
  });
});

describe("Mikrofon: vorher fragen, gesperrt helfen", () => {
  it("allererstes Mal: erst „Darf ich zuhören?“, danach startet es erst im nächsten Tipp", () => {
    const start = vi.fn();
    guardMic(start, false);
    expect(start).not.toHaveBeenCalled();
    const sheet = micState().sheet;
    expect(sheet?.kind).toBe("fragen");
    if (sheet?.kind === "fragen") sheet.then();
    expect(start).toHaveBeenCalledOnce();
  });

  it("schon gefragt oder erlaubt: sofort", () => {
    const start = vi.fn();
    guardMic(start, true);
    setMicPermission("granted");
    guardMic(start, false);
    expect(start).toHaveBeenCalledTimes(2);
    expect(micState().sheet).toBeNull();
  });

  it("gesperrt: Hilfe statt Start; zurück in der App und erlaubt → „Mikro ist an“", () => {
    const start = vi.fn();
    reportMicBlocked("gesperrt");
    expect(micState()).toMatchObject({ block: "gesperrt", sheet: { kind: "hilfe", block: "gesperrt" } });
    guardMic(start, true);
    expect(start).not.toHaveBeenCalled();
    setMicPermission("granted");
    expect(micState()).toMatchObject({ block: null, granted: true, justOn: true });
  });

  it("„denied“ ohne Fehler (Browser weiß es schon) = gesperrt; „prompt“ hebt die Sperre auf", () => {
    setMicPermission("denied");
    expect(micState().block).toBe("gesperrt");
    setMicPermission("prompt");
    expect(micState().block).toBeNull();
  });
});
