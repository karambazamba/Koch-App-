// Sprachnachricht speichern darf nie scheitern (Fehler v0.67.0, iPhone/Safari:
// „ließ sich gerade nicht speichern“, Nachricht weg): Ton als ArrayBuffer,
// alte Blob-Zeilen lesbar, bei Fehler im Arbeitsspeicher. Dazu der zweite
// Versuch, wenn das Mikro hängt, und das Mikro-Protokoll.
import { afterEach, describe, expect, it } from "vitest";
import { blobFromRow, createMemoAudio, type MemoTable } from "@/lib/pinnwand/memoAudio";
import { getMicWithRetry, micRanThisSession, noteMicRan, resetMicOwner } from "@/lib/core/mic";
import { fakeWindow, noBrowser } from "../helpers";

type AnyRow = Parameters<MemoTable["put"]>[0];

function table(opts: { failPut?: boolean } = {}) {
  const rows = new Map<string, AnyRow>();
  const t: MemoTable = {
    put: async (row) => {
      if (opts.failPut) throw Object.assign(new Error("Blob nicht erlaubt"), { name: "DataCloneError" });
      rows.set(row.id, row);
    },
    get: async (id) => rows.get(id),
    delete: async (id) => rows.delete(id),
    getAll: async () => [...rows.values()],
  };
  return { t, rows };
}

const sound = () => new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: "audio/mp4" });

describe("Ton der Sprachnachricht speichern", () => {
  it("legt ArrayBuffer + Typ ab (kein Blob) und liest ihn als Blob zurück", async () => {
    const { t, rows } = table();
    const log: string[] = [];
    const store = createMemoAudio(() => t, (s) => log.push(s));
    expect(await store.save("m1", sound())).toBe("geraet");
    const row = rows.get("m1") as { buf: ArrayBuffer; mime: string };
    expect(row.buf).toBeInstanceOf(ArrayBuffer);
    expect(row.mime).toBe("audio/mp4");
    const back = await store.load({ id: "m1", data: {} as never });
    expect(back?.type).toBe("audio/mp4");
    expect(back?.size).toBe(5);
    expect(log.at(-1)).toMatch(/Speichern ok \(5 Bytes\)/);
  });

  it("put() wirft → Ton bleibt im Arbeitsspeicher, die Nachricht ist abspielbar", async () => {
    const { t } = table({ failPut: true });
    const log: string[] = [];
    const store = createMemoAudio(() => t, (s) => log.push(s));
    expect(await store.save("m2", sound())).toBe("sitzung");
    expect((await store.load({ id: "m2", data: {} as never }))?.size).toBe(5);
    expect(log.at(-1)).toMatch(/Arbeitsspeicher \(DataCloneError\)/);
    expect((await store.list()).map((r) => r.id)).toEqual(["m2"]);
  });

  it("ganz ohne IndexedDB → Arbeitsspeicher", async () => {
    const store = createMemoAudio(() => null);
    expect(await store.save("m3", sound())).toBe("sitzung");
    expect(await store.load({ id: "m3", data: {} as never })).not.toBeNull();
    await store.remove("m3");
    expect(await store.load({ id: "m3", data: {} as never })).toBeNull();
  });

  it("alte Zeilen mit „blob“ (bis v0.67) laden weiter", async () => {
    const { t, rows } = table();
    const old = sound();
    rows.set("alt", { id: "alt", blob: old, at: 1 });
    const store = createMemoAudio(() => t);
    expect(await store.load({ id: "alt", data: {} as never })).toBe(old);
    expect(blobFromRow(undefined)).toBeNull();
  });
});

describe("Mikro hängt: einmal still neu versuchen", () => {
  afterEach(() => resetMicOwner());
  const stream = {} as MediaStream;
  const never = () => new Promise<MediaStream>(() => undefined);

  it("erster Versuch hängt, zweiter klappt", async () => {
    const calls: number[] = [];
    const log: string[] = [];
    const got = await getMicWithRetry(() => (calls.push(1), calls.length === 1 ? never() : Promise.resolve(stream)), (s) => log.push(s), 10);
    expect(got).toBe(stream);
    expect(calls).toHaveLength(2);
    expect(log).toEqual(["getUserMedia hängt – neuer Versuch"]);
  });

  it("hängt zweimal → MicTimeout; abgelehnt → kein zweiter Versuch", async () => {
    await expect(getMicWithRetry(never, undefined, 10)).rejects.toMatchObject({ name: "MicTimeout" });
    let n = 0;
    const denied = () => (n++, Promise.reject(Object.assign(new Error("nein"), { name: "NotAllowedError" })));
    await expect(getMicWithRetry(denied, undefined, 10)).rejects.toMatchObject({ name: "NotAllowedError" });
    expect(n).toBe(1);
  });

  it("erster Tipp der Sitzung startet beim Loslassen – danach darf Halten sofort starten", () => {
    expect(micRanThisSession()).toBe(false);
    noteMicRan();
    expect(micRanThisSession()).toBe(true);
  });
});

describe("Mikro-Protokoll", () => {
  afterEach(() => noBrowser());

  it("behält die letzten 50 Ereignisse mit Uhrzeit, nur auf dem Gerät", async () => {
    fakeWindow();
    const { micLog, migrateMicLog } = await import("@/lib/core/micLog");
    for (let i = 0; i < 55; i++) micLog(`Ereignis ${i}`);
    const saved = migrateMicLog(JSON.parse(window.localStorage.getItem("wasgibts.mikroprotokoll")!));
    expect(saved?.entries).toHaveLength(50);
    expect(saved?.entries[0].text).toBe("Ereignis 5");
    expect(typeof saved?.entries[0].at).toBe("number");
    expect(migrateMicLog({ version: 2 })).toBeNull();
    const { STORAGE } = await import("@/lib/core/storage");
    expect(STORAGE.find((s) => s.key === "wasgibts.mikroprotokoll")?.backup).toBe(false);
  });
});
