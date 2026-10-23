// Pinnwand: Nachrichten (bis 140 Zeichen, Reaktionen, gelesen, angeheftet,
// nach 24 Std. weg), Memos (24 Std. nach der Aufnahme, gehört oder nicht)
// und der Speicher `wasgibts.pinnwand` v2 (Migration v1, Rückgängig).
import { beforeEach, describe, expect, it } from "vitest";
import { at, memoryStorage } from "../helpers";
import { now } from "@/lib/core/now";
import {
  addPin,
  createPin,
  hasUnread,
  isPinboardQuery,
  markPinsRead,
  personTone,
  pinMeta,
  pinWriteCommand,
  prunePins,
  removePin,
  sanitizePin,
  setPinPinned,
  toggleReaction,
  visiblePins,
  PIN_MAX,
  type PinMessage,
} from "@/lib/pinnwand";
import {
  addMemo,
  createMemo,
  dauerWords,
  formatDauer,
  householdNames,
  memoAlive,
  memoPlayRequest,
  memoToPlay,
  memoUnheard,
  pickMemoMime,
  pruneMemos,
  removeMemo,
  resample,
  sanitizeMemo,
  setMemoHeard,
  toggleMemoReaction,
  visibleMemos,
  WAVE_BARS,
  type MemoMessage,
} from "@/lib/pinnwand/memo";
import { changeMemos, changePins, loadMemos, loadPins, migratePinStore } from "@/lib/pinnwand/store";

const DAY = 86_400_000;
let local: Storage;

beforeEach(() => {
  at("2026-10-22T09:00");
  local = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, addEventListener() {}, removeEventListener() {} };
});

const ms = () => now().getTime();
const pin = (text: string, author = "Felix") => createPin(text, author)!;
const memo = (author = "Lisa", dauer = 12.44) => createMemo({ author, dauer, mime: "audio/mp4", wave: [0.1, 0.2, 0.4] });

describe("Nachrichten", () => {
  it("anlegen: Leerzeichen zusammengefasst, höchstens 140 Zeichen, leer = nichts, Autor gelesen", () => {
    const p = pin("  Bin   um 20 Uhr da  ");
    expect(p).toMatchObject({ typ: "pinnwand", raum: "familie", data: { text: "Bin um 20 Uhr da", author: "Felix", readBy: ["Felix"], pinned: false, reactions: {} } });
    expect(pin("x".repeat(200)).data.text).toHaveLength(PIN_MAX);
    expect(createPin("   ", "Felix")).toBeNull();
    expect(pin("Hallo", "  ").data.author).toBe("Ich");
  });

  it("prüfen: fremde Typen weg, Listen und Reaktionen aufgeräumt, immer Familie", () => {
    expect(sanitizePin(null)).toBeNull();
    expect(sanitizePin({ typ: "notiz", id: "a", data: { text: "x" } })).toBeNull();
    expect(sanitizePin({ typ: "pinnwand", id: 3, data: { text: "x" } })).toBeNull();
    expect(sanitizePin({ typ: "pinnwand", id: "a" })).toBeNull();
    const raw = { ...pin("Hi"), raum: "arbeit", data: { text: " Hi  du ", author: " ", reactions: { "👍": ["Lisa", 3], "❤️": [], "🔥": ["x"] }, readBy: "Lisa", pinned: "ja" } };
    const p = sanitizePin(raw)!;
    expect(p.raum).toBe("familie");
    expect(p.data).toEqual({ text: "Hi du", author: "Ich", reactions: { Lisa: "👍" }, replyTo: null, readBy: [], pinned: false });
  });

  it("nach 24 Std. weg (ab dem Schreiben) – außer dauerhaft angeheftet; neueste zuerst", () => {
    const old = pin("alt");
    at("2026-10-22T20:00");
    const mid = pin("mitte");
    at("2026-10-23T08:59");
    const fresh = pin("neu");
    const kept = setPinPinned([old], old.id, true, "s")[0];
    expect(visiblePins([old, mid, fresh], ms()).map((m) => m.data.text)).toEqual(["neu", "mitte", "alt"]);
    at("2026-10-23T09:00");
    expect(visiblePins([old, mid, fresh], ms()).map((m) => m.data.text)).toEqual(["neu", "mitte"]);
    expect(prunePins([old, kept, mid], ms()).map((m) => m.data.text)).toEqual(["alt", "mitte"]);
    expect(setPinPinned([old, mid], old.id, true, "s")[1]).toBe(mid);
  });

  it("hinzufügen ersetzt dieselbe ID, entfernen", () => {
    const a = pin("a");
    const b = pin("b");
    expect(addPin([a, b], { ...a, data: { ...a.data, text: "a2" } }).map((m) => m.data.text)).toEqual(["b", "a2"]);
    expect(removePin([a, b], a.id)).toEqual([b]);
  });

  it("Reaktion an/aus je Person; andere Nachrichten unverändert (Tafel 70: eine je Person)", () => {
    const a = pin("a");
    const b = pin("b");
    let list = toggleReaction([a, b], a.id, "👍", "Lisa", "t1");
    expect(list[0].data.reactions).toEqual({ Lisa: "👍" });
    expect(list[0].geaendert).toBe("t1");
    expect(list[1]).toBe(b);
    list = toggleReaction(list, a.id, "👍", "Jonne", "t2");
    list = toggleReaction(list, a.id, "👍", "Lisa", "t3");
    expect(list[0].data.reactions).toEqual({ Jonne: "👍" });
  });

  it("gelesen und ungelesen (eigene zählen nie)", () => {
    const mine = pin("von mir", "Felix");
    const hers = pin("von Lisa", "Lisa");
    expect(hasUnread([mine, hers], "Felix", ms())).toBe(true);
    const read = markPinsRead([mine, hers], "Felix");
    expect(read[0]).toBe(mine);
    expect(hasUnread(read, "Felix", ms())).toBe(false);
    expect(markPinsRead(read, "Felix")).toBe(read);
  });

  it("„Du · 7:48“, „Lisa · gestern“, sonst Datum", () => {
    const clock = (iso: string) => iso.slice(11, 16);
    const dayOf = (iso: string) => iso.slice(0, 10);
    const m = (erstellt: string, author: string) => ({ erstellt, data: { author } });
    expect(pinMeta(m("2026-10-22T07:48", "Felix"), "Felix", "2026-10-22", clock, dayOf)).toBe("Du · 07:48");
    expect(pinMeta(m("2026-10-21T20:00", "Lisa"), "Felix", "2026-10-22", clock, dayOf)).toBe("Lisa · gestern");
    expect(pinMeta(m("2026-10-02T20:00", "Lisa"), "Felix", "2026-10-22", clock, dayOf)).toBe("Lisa · 2.10.");
    expect(pinMeta(m("2026-09-30T20:00", "Lisa"), "Felix", "2026-10-01", clock, dayOf)).toBe("Lisa · gestern");
  });

  it("feste Farbe je Person (Groß/Klein egal)", () => {
    expect(personTone("Lisa")).toBe(personTone(" lisa "));
    expect([0, 1, 2, 3]).toContain(personTone("Jonne"));
  });

  it("Sätze ohne KI: an die Pinnwand schreiben, fragen", () => {
    expect(pinWriteCommand("Schreib an die Pinnwand: Bin um 20 Uhr da")).toBe("Bin um 20 Uhr da");
    expect(pinWriteCommand("Häng das an die Pinnwand: „Milch ist alle“")).toBe("Milch ist alle");
    expect(pinWriteCommand("bitte auf die Pinnwand dran, Opa kommt")).toBe("Opa kommt");
    expect(pinWriteCommand("Schreib an die Pinnwand: x")).toBeNull();
    expect(pinWriteCommand("Schreib Milch auf die Liste")).toBeNull();
    expect(isPinboardQuery("Was steht auf der Pinnwand?")).toBe(true);
    expect(isPinboardQuery("Pinnwand?")).toBe(true);
    expect(isPinboardQuery("Was gibt’s heute?")).toBe(false);
  });
});

describe("Memos", () => {
  it("anlegen: Dauer 0–60 s, Welle auf 28 Balken normalisiert, Autor hat gehört", () => {
    const m = memo("  ", 75);
    expect(m.data.author).toBe("Ich");
    expect(m.data.dauer).toBe(60);
    expect(memo("Lisa", -3).data.dauer).toBe(0);
    expect(memo("Lisa", 12.44).data.dauer).toBe(12.4);
    expect(m.data.wave).toHaveLength(WAVE_BARS);
    expect(Math.max(...m.data.wave)).toBe(1);
    expect(m.data).toMatchObject({ gehoertVon: ["Ich"], alleGehoertAm: null, storagePath: null, reactions: {} });
    const quiet = createMemo({ author: "Lisa", dauer: 2, mime: "audio/webm", wave: [0.001, NaN, 0.005] });
    expect(Math.max(...quiet.data.wave)).toBeLessThanOrEqual(0.01);
  });

  it("Welle: leer = flache Balken, kurz = gestreckt, lang = Spitzen je Abschnitt", () => {
    expect(resample([], 4)).toEqual([0.15, 0.15, 0.15, 0.15]);
    expect(resample([0.5], 3)).toEqual([0.5, 0.5, 0.5]);
    expect(resample([0.1, 0.9, 0.2, 0.3], 2)).toEqual([0.9, 0.3]);
  });

  it("prüfen: Pflichtfelder, Standardwerte, Grenzen", () => {
    expect(sanitizeMemo(null)).toBeNull();
    expect(sanitizeMemo({ typ: "memo", id: "a", erstellt: "x", data: { dauer: "12" } })).toBeNull();
    expect(sanitizeMemo({ typ: "memo", id: "a", data: { dauer: 3 } })).toBeNull();
    const m = sanitizeMemo({ typ: "memo", id: "a", raum: "arbeit", erstellt: "2026-10-22T07:00:00Z", data: { dauer: 99, reactions: { "❤️": ["Lisa"] }, wave: [2, "x", -1], gehoertVon: ["Lisa", 1], alleGehoertAm: 5, storagePath: "memos/a.m4a" } })!;
    expect(m.raum).toBe("familie");
    expect(m.data).toMatchObject({ author: "Ich", dauer: 60, mime: "audio/webm", gehoertVon: ["Lisa"], alleGehoertAm: null, reactions: { Lisa: "❤️" }, storagePath: "memos/a.m4a" });
    expect(m.data.wave[0]).toBe(1);
    expect(m.data.wave.at(-1)).toBe(0);
    const ok = sanitizeMemo({ ...memo(), data: { ...memo().data, author: "Lisa", mime: "audio/mp4", alleGehoertAm: "2026-10-22T08:00:00Z" } })!;
    expect(ok.data).toMatchObject({ author: "Lisa", mime: "audio/mp4", alleGehoertAm: "2026-10-22T08:00:00Z", storagePath: null });
  });

  it("gehört: alle im Haushalt → 24 Std. Frist; zurücknehmen hebt sie auf", () => {
    const m = memo("Lisa");
    const house = ["Lisa", "Felix", "Jonne"];
    let list = setMemoHeard([m], m.id, "Felix", true, house, "t1");
    expect(list[0].data.alleGehoertAm).toBeNull();
    expect(setMemoHeard(list, m.id, "Felix", true, house, "t2")).toEqual(list);
    list = setMemoHeard(list, m.id, "Jonne", true, house, "2026-10-22T08:00:00.000Z");
    expect(list[0].data.alleGehoertAm).toBe("2026-10-22T08:00:00.000Z");
    expect(setMemoHeard(list, m.id, "Oma", true, house, "später")[0].data.alleGehoertAm).toBe("2026-10-22T08:00:00.000Z");
    list = setMemoHeard(list, m.id, "Jonne", false, house, "t4");
    expect(list[0].data.alleGehoertAm).toBeNull();
    expect(setMemoHeard([m], m.id, "Felix", true, [], "t")[0].data.alleGehoertAm).toBeNull();
    const other = memo();
    expect(setMemoHeard([m, other], m.id, "Felix", true, house, "t")[1]).toBe(other);
  });

  it("verschwinden: 24 Std. nach der Aufnahme – gehört oder nicht", () => {
    const m = memo();
    const heard = { ...m, data: { ...m.data, alleGehoertAm: now().toISOString() } };
    expect(memoAlive(heard, ms() + DAY - 1)).toBe(true);
    expect(memoAlive(m, ms() + DAY - 1)).toBe(true);
    expect(memoAlive(m, ms() + DAY)).toBe(false);
    expect(pruneMemos([m, heard], ms() + DAY)).toEqual([]);
  });

  it("anzeigen, hinzufügen, entfernen, reagieren", () => {
    const a = memo("Lisa");
    at("2026-10-22T09:05");
    const b = memo("Felix");
    expect(visibleMemos([a, b], ms()).map((m) => m.id)).toEqual([b.id, a.id]);
    expect(addMemo([a, b], { ...a, data: { ...a.data, dauer: 3 } }).map((m) => m.data.dauer)).toEqual([12.4, 3]);
    expect(removeMemo([a, b], a.id)).toEqual([b]);
    let list = toggleMemoReaction([a, b], a.id, "❤️", "Felix", "t");
    expect(list[0].data.reactions).toEqual({ Felix: "❤️" });
    expect(list[1]).toBe(b);
    list = toggleMemoReaction(list, a.id, "❤️", "Felix", "t2");
    expect(list[0].data.reactions).toEqual({});
  });

  it("Dauer in Ziffern und Worten", () => {
    expect(formatDauer(12.4)).toBe("0:12");
    expect(formatDauer(-1)).toBe("0:00");
    expect(formatDauer(65)).toBe("1:05");
    expect(dauerWords(0.2)).toBe("1 Sekunde");
    expect(dauerWords(12)).toBe("12 Sekunden");
    expect(dauerWords(60)).toBe("1 Minute");
    expect(dauerWords(61)).toBe("1 Minute 1 Sekunden");
  });

  it("Aufnahme-Format: iPhone mp4 zuerst, sonst webm/ogg, sonst keins", () => {
    expect(pickMemoMime((m) => m === "audio/mp4")).toBe("audio/mp4");
    expect(pickMemoMime((m) => m.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
    expect(pickMemoMime(() => false)).toBeNull();
  });

  it("Abspielen per Sprache: neuestes Ungehörtes der Person zuerst", () => {
    expect(memoPlayRequest("Spiel das Memo von Lisa ab!")).toEqual({ name: "Lisa" });
    expect(memoPlayRequest("Hör dir die Sprachnachricht an")).toEqual({ name: null });
    expect(memoPlayRequest("Lösch das Memo")).toBeNull();
    expect(memoPlayRequest("Spiel Musik ab")).toBeNull();
    const old = memo("Lisa");
    at("2026-10-22T09:10");
    const newer = { ...memo("Lisa"), data: { ...memo("Lisa").data, gehoertVon: ["Lisa", "Felix"] } };
    const fromJonne = memo("Jonne");
    const list: MemoMessage[] = [old, newer, fromJonne];
    expect(memoUnheard(old, "Felix")).toBe(true);
    expect(memoUnheard(old, "Lisa")).toBe(false);
    expect(memoToPlay(list, "lisa", "Felix", ms())?.id).toBe(old.id);
    expect(memoToPlay([newer], "Lisa", "Felix", ms())?.id).toBe(newer.id);
    expect(memoToPlay(list, null, "Felix", ms())?.id).toBe(fromJonne.id);
    expect(memoToPlay(list, "Oma", "Felix", ms())).toBeNull();
  });

  it("Haushalt = Personen im Profil, sonst ich", () => {
    expect(householdNames([{ name: " Lisa " }, { name: "Felix" }, { name: "Lisa" }, { name: "" }], "Felix")).toEqual(["Lisa", "Felix"]);
    expect(householdNames(undefined, "Felix")).toEqual(["Felix"]);
    expect(householdNames([], "Felix")).toEqual(["Felix"]);
  });
});

describe("Speicher `wasgibts.pinnwand` v3", () => {
  const stored = () => JSON.parse(local.getItem("wasgibts.pinnwand")!);

  it("v1 → v3: Nachrichten bleiben, Memos leer; Unsinn fällt raus", () => {
    const p = pin("Hallo");
    expect(migratePinStore({ version: 1, messages: [p, { typ: "x" }], memos: [memo()] })).toEqual({ version: 3, messages: [p], memos: [] });
    expect(migratePinStore({ version: 2, messages: "x", memos: [memo(), null] })?.memos).toHaveLength(1);
    expect(migratePinStore({ version: 4 })).toBeNull();
    expect(migratePinStore(null)).toBeNull();
  });

  it("beim Laden wird ein v1-Stand einmal als v3 zurückgeschrieben", () => {
    const p = pin("Hallo");
    local.setItem("wasgibts.pinnwand", JSON.stringify({ version: 1, messages: [p] }));
    expect(loadPins()).toEqual([p]);
    expect(loadMemos()).toEqual([]);
    expect(stored().version).toBe(3);
  });

  it("leer ohne Speicher", () => {
    expect(loadPins()).toEqual([]);
    expect(loadMemos()).toEqual([]);
  });

  it("ändern räumt Altes weg und liefert Rückgängig", () => {
    const old = pin("alt");
    const oldMemo = memo();
    at("2026-10-26T09:00");
    local.setItem("wasgibts.pinnwand", JSON.stringify({ version: 2, messages: [old], memos: [oldMemo] }));
    const p = pin("neu");
    const undo = changePins((list) => addPin(list, p));
    expect(loadPins().map((m: PinMessage) => m.data.text)).toEqual(["neu"]);
    expect(loadMemos()).toEqual([]);
    undo();
    expect(loadPins()).toEqual([old]);
  });

  it("Memos ändern lässt Nachrichten stehen; Rückgängig stellt die Memos wieder her", () => {
    const p = pin("Hallo");
    changePins((list) => addPin(list, p));
    const m = memo();
    const undo = changeMemos((list) => addMemo(list, m));
    expect(loadMemos()).toEqual([m]);
    expect(loadPins()).toEqual([p]);
    const undo2 = changeMemos((list) => removeMemo(list, m.id));
    expect(loadMemos()).toEqual([]);
    undo2();
    expect(loadMemos()).toEqual([m]);
    undo();
    expect(loadMemos()).toEqual([]);
    expect(loadPins()).toEqual([p]);
  });
});
