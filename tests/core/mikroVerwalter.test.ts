// Mikrofon-Verwalter (core/mic): immer nur EIN Nutzer, Freigabe in allen Wegen, Zeitlimit.
import { afterEach, describe, expect, it, vi } from "vitest";
import { MIC_SETTLE_MS, MIC_TIMEOUT_MS, claimMic, micOwner, micSettleWait, releaseMic, resetMicOwner, withMicTimeout } from "@/lib/core/mic";

afterEach(() => {
  resetMicOwner();
  vi.useRealTimers();
});

const fakeStream = () => {
  const stop = vi.fn();
  return { stream: { getTracks: () => [{ stop }] } as unknown as MediaStream, stop };
};

describe("Mikrofon-Verwalter", () => {
  it("nur ein Nutzer: wer nimmt, beendet den vorherigen", () => {
    const mia = vi.fn();
    claimMic("sprache-1", mia, 1000);
    expect(micOwner()).toBe("sprache-1");
    claimMic("pinnwand", () => undefined, 2000);
    expect(mia).toHaveBeenCalledTimes(1);
    expect(micOwner()).toBe("pinnwand");
  });

  it("derselbe Nutzer nochmal beendet sich nicht selbst", () => {
    const self = vi.fn();
    claimMic("pinnwand", self);
    claimMic("pinnwand", self);
    expect(self).not.toHaveBeenCalled();
  });

  it("abgeben nur durch den, der es hat", () => {
    claimMic("pinnwand", () => undefined);
    releaseMic("sprache-1");
    expect(micOwner()).toBe("pinnwand");
    releaseMic("pinnwand");
    expect(micOwner()).toBeNull();
  });

  it("ein Fehler beim Beenden des vorherigen blockiert nicht", () => {
    claimMic("sprache-1", () => {
      throw new Error("schon weg");
    });
    expect(() => claimMic("pinnwand", () => undefined)).not.toThrow();
    expect(micOwner()).toBe("pinnwand");
  });

  it("nach dem Abgeben kurz warten (iOS), danach sofort", () => {
    expect(micSettleWait(5000)).toBe(0);
    claimMic("sprache-1", () => undefined, 1000);
    releaseMic("sprache-1", 1000);
    expect(micSettleWait(1100)).toBe(MIC_SETTLE_MS - 100);
    expect(micSettleWait(1000 + MIC_SETTLE_MS)).toBe(0);
  });

  it("Übernahme zählt als Abgeben", () => {
    claimMic("sprache-1", () => undefined, 1000);
    claimMic("pinnwand", () => undefined, 2000);
    expect(micSettleWait(2000)).toBe(MIC_SETTLE_MS);
  });
});

describe("getUserMedia mit Zeitlimit", () => {
  it("kommt der Ton rechtzeitig, geht er durch", async () => {
    const { stream } = fakeStream();
    await expect(withMicTimeout(Promise.resolve(stream))).resolves.toBe(stream);
  });

  it("Fehler kommen durch (z. B. gesperrt)", async () => {
    await expect(withMicTimeout(Promise.reject(Object.assign(new Error("nein"), { name: "NotAllowedError" })))).rejects.toMatchObject({ name: "NotAllowedError" });
  });

  it("hängt es länger als 4 s: „MicTimeout“, später kommender Ton wird sofort freigegeben", async () => {
    vi.useFakeTimers();
    let deliver: (s: MediaStream) => void = () => undefined;
    const request = new Promise<MediaStream>((r) => (deliver = r));
    const result = withMicTimeout(request);
    const caught = result.catch((e) => e);
    await vi.advanceTimersByTimeAsync(MIC_TIMEOUT_MS + 1);
    expect(await caught).toMatchObject({ name: "MicTimeout" });
    const { stream, stop } = fakeStream();
    deliver(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(stop).toHaveBeenCalled();
  });

  it("später Fehler nach dem Zeitlimit wird ignoriert", async () => {
    vi.useFakeTimers();
    let fail: (e: Error) => void = () => undefined;
    const caught = withMicTimeout(new Promise<MediaStream>((_, r) => (fail = r)), 100).catch((e) => e);
    await vi.advanceTimersByTimeAsync(101);
    fail(new Error("zu spät"));
    expect(await caught).toMatchObject({ name: "MicTimeout" });
  });
});
