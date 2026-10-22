// Pinnwand-Hooks ohne Renderer: lädt noch (undefined), leer, mit Daten.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, memoryStorage } from "../helpers";
import { createPin } from "@/lib/pinnwand/model";
import { createMemo } from "@/lib/pinnwand/memo";
import { usePins, useMemos } from "@/lib/pinnwand/store";

let serverSide = false;
vi.mock("react", () => ({
  useSyncExternalStore: (_s: unknown, get: () => unknown, server: () => unknown) => (serverSide ? server() : get()),
}));

let local: Storage;
beforeEach(() => {
  at("2026-10-22T09:00");
  serverSide = false;
  local = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, addEventListener() {}, removeEventListener() {} };
});

describe("usePins / useMemos", () => {
  it("auf dem Server: undefined (lädt noch)", () => {
    serverSide = true;
    expect(usePins()).toBeUndefined();
    expect(useMemos()).toBeUndefined();
  });

  it("ohne Speicher leer, mit Speicher die Einträge", () => {
    expect(usePins()).toEqual([]);
    expect(useMemos()).toEqual([]);
    const p = createPin("Hallo", "Lisa")!;
    const m = createMemo({ author: "Lisa", dauer: 3, mime: "audio/mp4", wave: [0.5] });
    local.setItem("wasgibts.pinnwand", JSON.stringify({ version: 2, messages: [p], memos: [m] }));
    expect(usePins()).toEqual([p]);
    expect(useMemos()?.map((x) => x.id)).toEqual([m.id]);
  });
});
