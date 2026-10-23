// Etappe 3c: Sprachnachrichten teilen – Pfad, Hochladen, Teilen erst mit Ton,
// Holen auf dem anderen Gerät, Aufräumen nach 25 Std., Regeln des Test-Backends.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { expiredMemoFiles, memoContentType, memoExt, memoPath, MEMO_FILE_MS, uploadPendingMemos } from "@/lib/konten/memoShare";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { resetTestKonten, testKonten } from "@/lib/konten/testServer";
import { createMemoAudio, type MemoTable } from "@/lib/pinnwand/memoAudio";
import type { MemoMessage } from "@/lib/pinnwand/memo";
import { ok, fail } from "@/lib/konten/model";

const HH = "0b5f3c2e-1111-4222-8333-444455556666";
const T0 = "2026-10-21T08:00:00.000Z";

const memo = (id: string, storagePath: string | null = null, mime = "audio/mp4"): MemoMessage => ({
  id,
  typ: "memo",
  raum: "familie",
  besitzer: "lokal",
  erstellt: T0,
  geaendert: T0,
  data: { author: "Felix", dauer: 3, mime, wave: [], gehoertVon: ["Felix"], alleGehoertAm: null, reactions: {}, storagePath },
});

describe("Pfad und Format", () => {
  it("iPhone = m4a, sonst webm/ogg; nur harmlose Zeichen", () => {
    expect(memoExt("audio/mp4;codecs=mp4a.40.2")).toBe("m4a");
    expect(memoExt("audio/webm;codecs=opus")).toBe("webm");
    expect(memoExt("audio/ogg;codecs=opus")).toBe("ogg");
    expect(memoPath(HH, memo("ab/../c d"))).toBe(`${HH}/abcd.m4a`);
    expect(memoPath(HH, memo("///"))).toBe(`${HH}/memo.m4a`);
    expect(memoContentType("audio/webm;codecs=opus")).toBe("audio/webm");
  });

  it("Pfad passt zur Regel in der Datenbank", () => {
    const sql = readFileSync("supabase/migrations/20261026120000_memos_teilen.sql", "utf8");
    const rule = new RegExp(sql.match(/p_name !~ '([^']+)'/)![1]);
    expect(rule.test(memoPath(HH, memo("3f1c-uuid_1")))).toBe(true);
    expect(rule.test(`${HH}/../x.m4a`)).toBe(false);
  });

  it("Aufräumen: erst nach 25 Std.", () => {
    const now = Date.parse(T0);
    const files = [
      { name: `${HH}/alt.m4a`, createdAt: new Date(now - MEMO_FILE_MS - 1000).toISOString() },
      { name: `${HH}/neu.m4a`, createdAt: new Date(now - 3_600_000).toISOString() },
      { name: `${HH}/ohne.m4a`, createdAt: "" },
    ];
    expect(expiredMemoFiles(files, now)).toEqual([`${HH}/alt.m4a`]);
  });
});

describe("Hochladen", () => {
  it("nur Memos ohne Pfad mit Ton auf dem Gerät; Fehler halten nichts auf", async () => {
    const paths: Record<string, string> = {};
    const uploaded: string[] = [];
    const done = await uploadPendingMemos({
      householdId: HH,
      memos: () => [memo("schon", `${HH}/schon.m4a`), memo("ohneTon"), memo("kaputt"), memo("gut", null, "audio/webm")],
      load: async (m) => (m.id === "ohneTon" ? null : new Blob(["x"])),
      upload: async (path) => (path.includes("kaputt") ? fail("offline") : (uploaded.push(path), ok(true))),
      setPath: (id, path) => void (paths[id] = path),
    });
    expect(done).toBe(1);
    expect(uploaded).toEqual([`${HH}/gut.webm`]);
    expect(paths).toEqual({ gut: `${HH}/gut.webm` });
  });
});

describe("Pinnwand-Übersetzer: Memo erst mit Ton geteilt", () => {
  const pinnwand = ADAPTERS.find((a) => a.name === "pinnwand")!;
  const value = { version: 3, messages: [{ id: "p1", typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: T0, geaendert: T0, data: { text: "Hallo" } }], memos: [memo("hier"), memo("geteilt", `${HH}/geteilt.m4a`)] };

  it("nur geteilte Memos werden zu Einträgen", () => {
    expect(pinnwand.toDocs(value).map((d) => `${d.typ}:${d.id}`)).toEqual(["pinnwand:p1", "memo:geteilt"]);
  });

  it("verlustfrei – und Memos nur auf dem Gerät bleiben beim Einspielen", () => {
    const back = pinnwand.fromDocs(pinnwand.toDocs(value), value);
    expect((back.memos as MemoMessage[]).map((m) => m.id).sort()).toEqual(["geteilt", "hier"]);
    expect((back.memos as MemoMessage[]).find((m) => m.id === "geteilt")!.data.storagePath).toBe(`${HH}/geteilt.m4a`);
    expect(pinnwand.toDocs(back)).toEqual(pinnwand.toDocs(value));
  });

  it("„Gehört von“ wird mit geteilt", () => {
    const heard = { ...value, memos: [{ ...memo("geteilt", `${HH}/geteilt.m4a`), data: { ...memo("x").data, storagePath: `${HH}/geteilt.m4a`, gehoertVon: ["Felix", "Lisa"] } }] };
    const doc = pinnwand.toDocs(heard).find((d) => d.typ === "memo")!;
    expect((doc.data as MemoMessage).data.gehoertVon).toEqual(["Felix", "Lisa"]);
  });
});

describe("Ton holen auf dem anderen Gerät", () => {
  function table(): MemoTable & { rows: Map<string, unknown> } {
    const rows = new Map<string, unknown>();
    return {
      rows,
      put: async (row) => void rows.set(row.id, row),
      get: async (id) => rows.get(id) as never,
      delete: async (id) => void rows.delete(id),
      getAll: async () => [...rows.values()] as never,
    };
  }

  it("fehlt der Ton, wird er aus dem Haushalt geholt und abgelegt", async () => {
    const t = table();
    const asked: string[] = [];
    const store = createMemoAudio(
      () => t,
      () => undefined,
      () => async (path) => (asked.push(path), new Blob(["ton"], { type: "audio/mp4" })),
    );
    const blob = await store.load(memo("m1", `${HH}/m1.m4a`));
    expect(await blob?.text()).toBe("ton");
    expect(asked).toEqual([`${HH}/m1.m4a`]);
    expect(t.rows.has("m1")).toBe(true);
    await store.load(memo("m1", `${HH}/m1.m4a`));
    expect(asked).toHaveLength(1);
  });

  it("ohne Pfad oder ohne Haushalt: nur das Gerät", async () => {
    const store = createMemoAudio(() => table(), () => undefined, () => null);
    expect(await store.load(memo("m2", `${HH}/m2.m4a`))).toBeNull();
    const asked: string[] = [];
    const store2 = createMemoAudio(() => table(), () => undefined, () => async (p) => (asked.push(p), null));
    expect(await store2.load(memo("m3"))).toBeNull();
    expect(asked).toEqual([]);
  });
});

describe("Test-Backend: Bucket „memos“", () => {
  beforeEach(() => resetTestKonten());
  const login = (email: string) => {
    testKonten({ action: "send_code", email });
    const code = testKonten({ action: "admin_code", email }).code as string;
    return (testKonten({ action: "verify", email, code }) as { token: string }).token;
  };

  it("nur der eigene Haushalt legt ab, holt und räumt weg", () => {
    const felix = login("felix@example.com");
    const lisa = login("lisa@example.com");
    const fremd = login("fremd@example.com");
    const hh = testKonten({ action: "create_household", token: felix, name: "Wir", displayName: "Felix" }).householdId as string;
    const code = testKonten({ action: "create_invite", token: felix }).code as string;
    testKonten({ action: "join_household", token: lisa, code, displayName: "Lisa" });
    const hh2 = testKonten({ action: "create_household", token: fremd, name: "Andere", displayName: "Fremd" }).householdId as string;

    const path = `${hh}/m1.m4a`;
    expect(testKonten({ action: "upload_memo", token: felix, path, mime: "audio/mp4", data: "dG9u" }, 1000).ok).toBe(true);
    expect(testKonten({ action: "upload_memo", token: felix, path: `${hh2}/x.m4a`, data: "dG9u" }).error).toBe("nicht_erlaubt");
    expect(testKonten({ action: "upload_memo", token: felix, path: `${hh}/../x.m4a`, data: "dG9u" }).error).toBe("nicht_erlaubt");
    expect(testKonten({ action: "download_memo", token: lisa, path })).toEqual({ data: "dG9u", mime: "audio/mp4" });
    expect(testKonten({ action: "download_memo", token: fremd, path }).error).toBe("nicht_gefunden");
    expect(testKonten({ action: "list_memos", token: fremd, householdId: hh }).files).toEqual([]);
    expect(testKonten({ action: "list_memos", token: lisa, householdId: hh }).files).toEqual([{ name: path, createdAt: new Date(1000).toISOString() }]);
    testKonten({ action: "remove_memos", token: fremd, paths: [path] });
    expect(testKonten({ action: "download_memo", token: lisa, path }).data).toBe("dG9u");
    testKonten({ action: "remove_memos", token: lisa, paths: [path] });
    expect(testKonten({ action: "download_memo", token: felix, path }).error).toBe("nicht_gefunden");
  });

  it("leerer Haushalt nimmt seine Töne mit", () => {
    const felix = login("felix@example.com");
    const hh = testKonten({ action: "create_household", token: felix, name: "Wir", displayName: "Felix" }).householdId as string;
    testKonten({ action: "upload_memo", token: felix, path: `${hh}/m1.webm`, data: "dG9u" });
    testKonten({ action: "leave_household", token: felix });
    testKonten({ action: "create_household", token: felix, name: "Neu", displayName: "Felix" });
    expect(testKonten({ action: "download_memo", token: felix, path: `${hh}/m1.webm` }).error).toBe("nicht_gefunden");
  });
});

describe("Cron und Regeln", () => {
  it("Aufräumen täglich per Vercel Cron, nur mit CRON_SECRET", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string }[] };
    expect(vercel.crons.map((c) => c.path)).toContain("/api/memos/aufraeumen");
    const route = readFileSync("src/app/api/memos/aufraeumen/route.ts", "utf8");
    expect(route).toContain("CRON_SECRET");
    expect(route).not.toMatch(/console\./);
  });
});
