import { describe, expect, it } from "vitest";
import { addMemo, createMemo, formatDauer, householdNames, memoAlive, memoPlayRequest, memoToPlay, memoUnheard, pickMemoMime, pruneMemos, resample, sanitizeMemo, setMemoHeard, toggleMemoReaction, visibleMemos, WAVE_BARS } from "@/lib/pinnwand";
import { migratePinStore } from "@/lib/pinnwand/store";
import { backupSummary, createBackup, parseBackup, restoreBackup } from "@/lib/core/backup";
import { now } from "@/lib/core/now";
import { at, memoryStorage } from "../helpers";

const H = 3_600_000;
const memoAt = (iso: string, author = "Lisa", dauer = 12.4) => {
  at(iso);
  return createMemo({ author, dauer, mime: "audio/mp4", wave: [0.1, 0.5, 0.9] });
};

describe("Sprachnachrichten: Verschwinden", () => {
  const household = ["Felix", "Lisa", "Jonne"];

  it("bleibt ohne „alle gehört“ höchstens 3 Tage", () => {
    const m = memoAt("2026-10-20T09:00");
    const t0 = new Date(m.erstellt).getTime();
    expect(memoAlive(m, t0 + 71 * H)).toBe(true);
    expect(memoAlive(m, t0 + 72 * H)).toBe(false);
  });

  it("verschwindet 24 Std., nachdem alle es gehört haben", () => {
    const m = memoAt("2026-10-20T09:00");
    let list = [m];
    list = setMemoHeard(list, m.id, "Felix", true, household, "2026-10-20T10:00:00.000Z");
    expect(list[0].data.alleGehoertAm).toBeNull();
    list = setMemoHeard(list, m.id, "Jonne", true, household, "2026-10-20T12:00:00.000Z");
    expect(list[0].data.alleGehoertAm).toBe("2026-10-20T12:00:00.000Z");
    const heardMs = new Date("2026-10-20T12:00:00.000Z").getTime();
    expect(memoAlive(list[0], heardMs + 23 * H)).toBe(true);
    expect(memoAlive(list[0], heardMs + 24 * H)).toBe(false);
    expect(pruneMemos(list, heardMs + 24 * H)).toEqual([]);
  });

  it("spätestens nach 3 Tagen, auch wenn „alle gehört“ später kam", () => {
    const m = memoAt("2026-10-20T09:00");
    const list = setMemoHeard(setMemoHeard([m], m.id, "Felix", true, household, "2026-10-22T20:00:00.000Z"), m.id, "Jonne", true, household, "2026-10-22T20:00:00.000Z");
    expect(memoAlive(list[0], new Date(m.erstellt).getTime() + 72 * H)).toBe(false);
  });

  it("Häkchen wieder weg → Frist läuft nicht mehr", () => {
    const m = memoAt("2026-10-20T09:00");
    let list = setMemoHeard(setMemoHeard([m], m.id, "Felix", true, household, "s1"), m.id, "Jonne", true, household, "s2");
    list = setMemoHeard(list, m.id, "Jonne", false, household, "s3");
    expect(list[0].data.alleGehoertAm).toBeNull();
  });

  it("Ungehört nur für andere; Autor zählt als gehört", () => {
    const m = memoAt("2026-10-20T09:00");
    expect(memoUnheard(m, "Felix")).toBe(true);
    expect(memoUnheard(m, "Lisa")).toBe(false);
    expect(memoUnheard(setMemoHeard([m], m.id, "Felix", true, household, "x")[0], "Felix")).toBe(false);
  });

  it("Reaktionen wie bei Text", () => {
    const m = memoAt("2026-10-20T09:00");
    const once = toggleMemoReaction([m], m.id, "❤️", "Felix", "x");
    expect(once[0].data.reactions["❤️"]).toEqual(["Felix"]);
    expect(toggleMemoReaction(once, m.id, "❤️", "Felix", "y")[0].data.reactions["❤️"]).toEqual([]);
  });
});

describe("Sprachnachrichten: Daten", () => {
  it("Migration v1 → v2: Nachrichten bleiben, Memos leer", () => {
    at("2026-10-20T09:00");
    const v1 = { version: 1, messages: [{ id: "a", typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: "2026-10-20T07:00:00.000Z", geaendert: "2026-10-20T07:00:00.000Z", data: { text: "Bin um 20 Uhr da", author: "Lisa", reactions: {}, readBy: ["Lisa"], pinned: false } }] };
    const v2 = migratePinStore(v1);
    expect(v2?.version).toBe(2);
    expect(v2?.messages.map((m) => m.data.text)).toEqual(["Bin um 20 Uhr da"]);
    expect(v2?.memos).toEqual([]);
    expect(migratePinStore({ version: 7 })).toBeNull();
  });

  it("v2 behält gültige Memos, Kaputtes fällt weg", () => {
    const m = memoAt("2026-10-20T09:00");
    const v2 = migratePinStore({ version: 2, messages: [], memos: [m, { typ: "memo", id: 3 }, null] });
    expect(v2?.memos.map((x) => x.id)).toEqual([m.id]);
    expect(sanitizeMemo({ ...m, data: { ...m.data, dauer: 400 } })?.data.dauer).toBe(60);
  });

  it("Eintrag mit typ memo, Dauer, Format, gehoertVon, Speicherpfad", () => {
    const m = memoAt("2026-10-20T09:00", "Felix", 3.26);
    expect(m.typ).toBe("memo");
    expect(m.raum).toBe("familie");
    expect(m.data).toMatchObject({ author: "Felix", dauer: 3.3, mime: "audio/mp4", gehoertVon: ["Felix"], alleGehoertAm: null, storagePath: null });
    expect(m.data.wave).toHaveLength(WAVE_BARS);
    expect(m.erstellt).toBe(now().toISOString());
  });

  it("Sicherung: Memos bleiben auf dem Gerät, die Vorschau nennt sie", () => {
    const a = memoAt("2026-10-20T09:00");
    const b = memoAt("2026-10-20T09:05", "Felix");
    const local = memoryStorage({ "wasgibts.pinnwand": JSON.stringify({ version: 2, messages: [], memos: [a, b] }) });
    const backup = createBackup(local);
    expect(JSON.parse(backup.data["wasgibts.pinnwand"]).memos).toEqual([]);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(backupSummary(parsed!)).toBe("2 Sprachnachrichten (nicht gesichert)");
  });

  it("Wiederherstellen behält die Sprachnachrichten dieses Geräts", () => {
    const a = memoAt("2026-10-20T09:00");
    const local = memoryStorage({ "wasgibts.pinnwand": JSON.stringify({ version: 2, messages: [], memos: [a] }) });
    const pin = { id: "p", typ: "pinnwand", data: { text: "Hallo" } };
    restoreBackup({ app: "was-gibts", version: "", exportedAt: "", data: { "wasgibts.pinnwand": JSON.stringify({ version: 1, messages: [pin] }) } }, local);
    const after = JSON.parse(local.getItem("wasgibts.pinnwand")!);
    expect(after.messages).toEqual([pin]);
    expect(after.memos.map((m: { id: string }) => m.id)).toEqual([a.id]);
  });
});

describe("Sprachnachrichten: Kleinigkeiten", () => {
  it("Dauer und Welle", () => {
    expect(formatDauer(12.4)).toBe("0:12");
    expect(formatDauer(60)).toBe("1:00");
    expect(resample([0.1, 0.9, 0.2, 0.4], 2)).toEqual([0.9, 0.4]);
    expect(resample([], 3)).toHaveLength(3);
  });

  it("Format: iPhone mp4, sonst webm", () => {
    expect(pickMemoMime((m) => m.startsWith("audio/mp4"))).toBe("audio/mp4;codecs=mp4a.40.2");
    expect(pickMemoMime((m) => m === "audio/webm;codecs=opus")).toBe("audio/webm;codecs=opus");
    expect(pickMemoMime(() => false)).toBeNull();
  });

  it("Haushalt aus dem Profil, sonst ich", () => {
    expect(householdNames([{ name: "Felix " }, { name: "" }, { name: "Lisa" }], "Felix")).toEqual(["Felix", "Lisa"]);
    expect(householdNames(undefined, "Ich")).toEqual(["Ich"]);
  });

  it("„Spiel das Memo von Lisa ab“", () => {
    expect(memoPlayRequest("Spiel das Memo von Lisa ab")).toEqual({ name: "Lisa" });
    expect(memoPlayRequest("Spiel die Sprachnachricht ab!")).toEqual({ name: null });
    expect(memoPlayRequest("Hör dir die Sprachnachricht von jonne an")).toEqual({ name: "jonne" });
    expect(memoPlayRequest("Schreib ein Memo an die Pinnwand")).toBeNull();
    expect(memoPlayRequest("Spiel Musik ab")).toBeNull();
  });

  it("Mia spielt das neueste Ungehörte der Person", () => {
    const old = memoAt("2026-10-20T08:00");
    const heard = { ...memoAt("2026-10-20T09:00"), data: { ...old.data, gehoertVon: ["Lisa", "Felix"] } };
    const fromFelix = memoAt("2026-10-20T09:30", "Felix");
    const list = addMemo(addMemo([old], heard), fromFelix);
    const nowMs = now().getTime();
    expect(memoToPlay(list, "lisa", "Felix", nowMs)?.id).toBe(old.id);
    expect(memoToPlay(list, null, "Felix", nowMs)?.id).toBe(old.id);
    expect(memoToPlay(list, "Jonne", "Felix", nowMs)).toBeNull();
    expect(visibleMemos(list, nowMs).map((m) => m.id)).toEqual([fromFelix.id, heard.id, old.id]);
  });
});
